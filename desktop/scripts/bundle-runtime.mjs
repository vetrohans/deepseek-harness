#!/usr/bin/env node
/**
 * Package the production closure into the release asset used by
 * runtime.mode=download (Sakana-yuyu-style first-launch fetch):
 *
 *   release/runtime/dsh-runtime-<version>-<distTag>.tar.gz
 *   release/runtime/runtime-manifest-<distTag>.json
 *
 * The manifest is served next to the tarball (GitHub Releases or a mirror);
 * the app composes `{base}/{file}` from runtime.manifestUrl / runtime.mirrorUrl
 * and verifies the SHA-256 before extracting into the app-data dir.
 *
 * Usage: node scripts/bundle-runtime.mjs [distTag ...]   (default: host)
 * Env:   DSH_RUNTIME_OUT  closure dir (default ../dsh-runtime)
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DESKTOP_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
const RUNTIME = resolve(process.env.DSH_RUNTIME_OUT || join(DESKTOP_DIR, 'src-tauri', 'dsh-runtime'))
const VERSION = process.env.DSH_RUNTIME_VERSION || '0.1.0-rc.5'
const OUT = join(DESKTOP_DIR, 'release', 'runtime')

function hostTag() {
  const os = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'win32' : process.platform
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'x64' : process.arch
  return `${os}-${arch}`
}

const tags = process.argv.slice(2).length ? process.argv.slice(2) : [hostTag()]
if (!existsSync(join(RUNTIME, 'lib', 'bin.js'))) {
  console.error(`[bundle-runtime] closure missing at ${RUNTIME}; run scripts/prepare-runtime.mjs first`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
for (const tag of tags) {
  const file = `dsh-runtime-${VERSION}-${tag}.tar.gz`
  const out = join(OUT, file)
  console.log(`[bundle-runtime] ${tag} → ${out}`)
  const r = spawnSync('tar', ['-C', dirname(RUNTIME), '-czf', out, basename(RUNTIME)], { stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
  const sha256 = createHash('sha256').update(readFileSync(out)).digest('hex')
  const manifest = { version: VERSION, file, sha256, size: statSync(out).size }
  writeFileSync(join(OUT, `runtime-manifest-${tag}.json`), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`[bundle-runtime] ${file} ${(manifest.size / 1e6).toFixed(1)} MB sha256=${sha256.slice(0, 16)}…`)
}
