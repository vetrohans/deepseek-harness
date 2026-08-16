#!/usr/bin/env node
/**
 * Update an already-installed DSH Desktop.app in place — no full `tauri build`
 * re-bundling. The heavy parts (runtime closure, node-dist, binaries) are
 * copied from the current build artifacts into the installed bundle, then the
 * bundle and its embedded executables are re-signed ad-hoc.
 *
 * Prerequisites (run from the repo root):
 *   1. node desktop/scripts/prepare-runtime.mjs   # rebuilt src-tauri/dsh-runtime
 *   2. node desktop/scripts/fetch-node.mjs <tag>  # rebuilt sidecar + node-dist
 *   3. pnpm --dir desktop tauri build --no-bundle --target <triple>
 *      (or cargo build)                          # rebuilt release binary
 *
 * Usage: node desktop/scripts/update-app.mjs [/Applications/DSH Desktop.app]
 * Env:   DSH_APP_PATH  override the app path (same as argv[1])
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, chmodSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DESKTOP_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
const APP_PATH = resolve(process.argv[2] || process.env.DSH_APP_PATH || '/Applications/DSH Desktop.app')

const TRIPLE = process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin'
const BIN = join(DESKTOP_DIR, 'src-tauri', 'target', TRIPLE, 'release', 'dsh-desktop')
const SIDECAR = join(DESKTOP_DIR, 'src-tauri', 'binaries', `node-${TRIPLE}`)
const RUNTIME = join(DESKTOP_DIR, 'src-tauri', 'dsh-runtime')
const NODE_DIST = join(DESKTOP_DIR, 'src-tauri', 'node-dist')
const ENTITLEMENTS = join(DESKTOP_DIR, 'src-tauri', 'entitlements.mac.plist')

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (r.status !== 0) {
    console.error(`[update-app] ${cmd} ${args.join(' ')} failed (${r.status})`)
    process.exit(r.status ?? 1)
  }
}

for (const [label, p] of [['binary', BIN], ['sidecar', SIDECAR], ['runtime', RUNTIME], ['node-dist', NODE_DIST]]) {
  if (!existsSync(p)) {
    console.error(`[update-app] missing build artifact (${label}): ${p}`)
    process.exit(1)
  }
}
if (!existsSync(APP_PATH)) {
  console.error(`[update-app] app not found: ${APP_PATH}`)
  process.exit(1)
}

const macosDir = join(APP_PATH, 'Contents', 'MacOS')
const resourcesDir = join(APP_PATH, 'Contents', 'Resources')

console.log(`[update-app] target: ${APP_PATH} (${TRIPLE})`)

// 1. Quit a running instance (the app kills its Node sidecar on window close,
//    but a hard kill of the main binary would orphan it — kill both).
//    pkill exits 1 when nothing matches, which is fine here.
for (const pattern of ['dsh-desktop', 'node']) {
  spawnSync('pkill', ['-f', `${APP_PATH}/Contents/MacOS/${pattern}`], { stdio: 'ignore' })
}

// 2. Copy runtime closure + node-dist into Resources.
console.log('[update-app] copy runtime closure + node-dist')
run('rsync', ['-a', '--delete', RUNTIME + '/', join(resourcesDir, 'dsh-runtime') + '/'])
run('rsync', ['-a', '--delete', NODE_DIST + '/', join(resourcesDir, 'node-dist') + '/'])

// 3. Replace the executables.
console.log('[update-app] replace executables')
copyFileSync(BIN, join(macosDir, 'dsh-desktop'))
copyFileSync(SIDECAR, join(macosDir, 'node'))
chmodSync(join(macosDir, 'dsh-desktop'), 0o755)
chmodSync(join(macosDir, 'node'), 0o755)

// 4. Re-sign ad-hoc, keeping hardened runtime + the JIT entitlements Node
//    needs (the same flags Tauri uses when bundling).
console.log('[update-app] re-sign (ad-hoc)')
for (const name of ['node', 'dsh-desktop']) {
  run('codesign', ['--force', '--sign', '-', '--options', 'runtime', '--entitlements', ENTITLEMENTS, join(macosDir, name)])
}
run('codesign', ['--force', '--sign', '-', '--options', 'runtime', '--entitlements', ENTITLEMENTS, APP_PATH])

// 5. Verify.
run('codesign', ['--verify', '--deep', '--strict', APP_PATH])
console.log(`[update-app] done — relaunch ${APP_PATH}`)
