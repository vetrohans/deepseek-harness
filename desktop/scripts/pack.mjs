#!/usr/bin/env node
/**
 * One-shot packaging: build the production runtime closure, then produce the
 * macOS DMG (and zip) with electron-builder.
 *
 * Usage: node scripts/pack.mjs
 * Env:   DSH_SKIP_RUNTIME=1  skip prepare-runtime (reuse desktop/dsh-runtime)
 *        DSH_SKIP_DEPLOY=1   reuse desktop/dsh-runtime but re-prune (see
 *                            prepare-runtime.mjs)
 *
 * The DMG lands in desktop/release/ as DSH Desktop-<version>-x64.dmg.
 */

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DESKTOP_DIR = dirname(dirname(fileURLToPath(import.meta.url)))

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (r.status !== 0) {
    console.error(`[pack] ${cmd} ${args.join(' ')} failed (${r.status})`)
    process.exit(r.status ?? 1)
  }
}

if (!process.env.DSH_SKIP_RUNTIME) {
  console.log('[pack] 1/2 preparing runtime closure')
  run('node', [join(DESKTOP_DIR, 'scripts', 'prepare-runtime.mjs')], { cwd: DESKTOP_DIR })
}

console.log('[pack] 2/2 electron-builder --mac dmg')
run('npx', ['electron-builder', '--mac', 'dmg'], { cwd: DESKTOP_DIR })
console.log('[pack] done — see desktop/release/')
