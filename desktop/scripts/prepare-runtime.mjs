#!/usr/bin/env node
/**
 * Build the production runtime closure for the packaged Electron app.
 *
 * The fork's UI changes live in the workspace source (packages/...), so the
 * packaged runtime cannot be `npm install @deepseek-ai/dsh` from the registry
 * — it is materialized from this repo with `pnpm deploy`, then pruned:
 *
 *   1. rsync the workspace source (no node_modules/.git) to an APFS temp dir
 *   2. patch the copy so deploy works: drop the `link:` overrides, disable the
 *      root postinstall, add missing workspace peers to @deepseek-ai/dsh
 *   3. `pnpm --filter @deepseek-ai/dsh deploy --prod --legacy
 *      --node-linker=hoisted` — a self-contained production closure
 *   4. prune .map/.d.ts/.pdb/.ts and non-host node-pty prebuilds
 *   5. copy workspace peer packages that pnpm deploy omits, plus their two
 *      external deps (e2b, @agentclientprotocol/sdk)
 *   6. write the closure to DSH_RUNTIME_OUT (default desktop/dsh-runtime)
 *
 * Usage: node scripts/prepare-runtime.mjs
 * Env:   DSH_RUNTIME_OUT  output directory (default ../dsh-runtime)
 *        DSH_RUNTIME_TMP  temp work root (default os.tmpdir())
 *        DSH_SKIP_DEPLOY  keep an existing DSH_RUNTIME_OUT (re-run steps 4-6)
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DESKTOP_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
const REPO_ROOT = resolve(DESKTOP_DIR, '..')
const OUT_DIR = resolve(process.env.DSH_RUNTIME_OUT || join(DESKTOP_DIR, 'dsh-runtime'))

const WORKSPACE_SRC = [
  'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'patches', 'scripts',
  'apps', 'packages', 'vendor', 'native', 'examples', 'python/sdk-runtime',
]

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (r.status !== 0) {
    console.error(`[prepare-runtime] ${cmd} ${args.join(' ')} failed (${r.status})`)
    process.exit(r.status ?? 1)
  }
}

function walkPkgDirs(root) {
  const map = new Map()
  ;(function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        const pj = join(p, 'package.json')
        if (existsSync(pj)) {
          try {
            const j = JSON.parse(readFileSync(pj, 'utf8'))
            if (j.name) map.set(j.name, p)
          } catch {}
        }
        walk(p)
      }
    }
  })(root)
  return map
}

function pruneClosure(closureRoot) {
  const PRUNED = ['.map', '.d.ts', '.d.cts', '.d.mts', '.pdb', '.ts']
  let files = 0, bytes = 0
  ;(function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isSymbolicLink()) continue
      if (e.isDirectory()) { walk(p); continue }
      if (!e.isFile()) continue
      if (PRUNED.some((x) => e.name.endsWith(x))) {
        try { bytes += statSync(p).size; files++; rmSync(p, { force: true }) } catch {}
      }
    }
  })(join(closureRoot, 'node_modules'))
  console.log(`[prepare-runtime] pruned ${files} files (${(bytes / 1e6).toFixed(1)} MB)`)
}

const workRoot = resolve(process.env.DSH_RUNTIME_TMP || tmpdir(), 'dsh-runtime-build')
const work = join(workRoot, 'src')

if (!process.env.DSH_SKIP_DEPLOY) {
  rmSync(workRoot, { recursive: true, force: true })
  mkdirSync(work, { recursive: true })

  console.log('[prepare-runtime] 1/6 rsync workspace source →', work)
  for (const item of WORKSPACE_SRC) {
    run('rsync', ['-a', '--exclude', 'node_modules', '--exclude', '.git', join(REPO_ROOT, item), work])
  }

  // patch the copy so deploy works:
  //  - drop link: overrides (they prevent vendored packages from being packed)
  //  - drop the root postinstall (lefthook is a dev-only git-hooks install)
  const ws = join(work, 'pnpm-workspace.yaml')
  let wsText = readFileSync(ws, 'utf8')
    .replace(/overrides:\n(?:  '[^']+': 'link:[^\n]*'\n)+/g, '')
    .replace(/linkWorkspacePackages: true/, 'linkWorkspacePackages: true\ninjectWorkspacePackages: true')
  writeFileSync(ws, wsText)
  const rootPj = join(work, 'package.json')
  const rootJson = JSON.parse(readFileSync(rootPj, 'utf8'))
  delete rootJson.scripts.postinstall
  writeFileSync(rootPj, JSON.stringify(rootJson, null, 2) + '\n')

  const deploy = join(workRoot, 'deploy')
  console.log('[prepare-runtime] 2/6 pnpm deploy production closure')
  run('corepack', ['pnpm', '--filter', '@deepseek-ai/dsh', 'deploy', '--prod', '--legacy', '--node-linker=hoisted', '--config.strict-dep-builds=false', deploy], { cwd: work })

  console.log('[prepare-runtime] 3/6 prune + trim node-pty prebuilds')
  pruneClosure(deploy)
  const ptyPrebuilds = join(deploy, 'node_modules', 'node-pty', 'prebuilds')
  if (existsSync(ptyPrebuilds)) {
    for (const plat of readdirSync(ptyPrebuilds)) {
      const host = process.platform === 'darwin' ? 'darwin-' + process.arch : process.platform + '-' + process.arch
      if (plat !== host) rmSync(join(ptyPrebuilds, plat), { recursive: true, force: true })
    }
  }

  console.log('[prepare-runtime] 4/6 copy omitted workspace peer packages')
  const pkgDirs = walkPkgDirs(work)
  const closure = new Set(readdirSync(join(deploy, 'node_modules', '@deepseek-ai')))
  const keep = new Set(['package.json', 'lib', 'config', 'dsh.plugin.json', 'cordis.patch.yml', 'cordis.yml'])
  const missing = []
  for (const [name, dir] of pkgDirs) {
    if (!name.startsWith('@deepseek-ai/')) continue
    const short = name.slice('@deepseek-ai/'.length)
    if (closure.has(short)) continue
    const j = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const peers = Object.entries(j.peerDependencies || {})
    const isPeer = peers.some(([, v]) => v.startsWith('workspace:') || v.startsWith('link:'))
    if (!isPeer) continue
    missing.push(name)
    const to = join(deploy, 'node_modules', '@deepseek-ai', short)
    mkdirSync(to, { recursive: true })
    for (const item of readdirSync(dir)) {
      if (!keep.has(item)) continue
      const s = join(dir, item)
      if (statSync(s).isDirectory()) cpSync(s, join(to, item), { recursive: true })
      else cpSync(s, join(to, item))
    }
  }
  console.log('[prepare-runtime] copied', missing.length, 'omitted peer packages:', missing.join(', ') || '(none)')

  console.log('[prepare-runtime] 5/6 external deps for dsh-acp / dsh-e2b')
  const nm = join(deploy, 'node_modules')
  const needExt = []
  if (!existsSync(join(nm, 'e2b'))) needExt.push('e2b@2.29.1')
  if (!existsSync(join(nm, '@agentclientprotocol', 'sdk'))) needExt.push('@agentclientprotocol/sdk@0.25.1')
  if (needExt.length) {
    const extDir = join(workRoot, 'externals')
    rmSync(extDir, { recursive: true, force: true })
    mkdirSync(extDir, { recursive: true })
    writeFileSync(join(extDir, 'package.json'), JSON.stringify({ private: true }))
    run('npm', ['install', ...needExt, '--omit=dev', '--no-audit', '--no-fund'], { cwd: extDir })
    for (const spec of needExt) {
      const name = spec.slice(0, spec.lastIndexOf('@'))
      if (name.startsWith('@')) {
        const [scope, pkg] = name.split('/')
        cpSync(join(extDir, 'node_modules', scope, pkg), join(nm, scope, pkg), { recursive: true })
      } else {
        cpSync(join(extDir, 'node_modules', name), join(nm, name), { recursive: true })
      }
    }
  }

  // re-prune what the copies brought back
  pruneClosure(deploy)
  run('node', ['scripts/ensure-spawn-helper.mjs'], { cwd: join(nm, '@deepseek-ai', 'dsh-subprocess-local') })

  console.log('[prepare-runtime] 6/6 publish closure →', OUT_DIR)
  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(dirname(OUT_DIR), { recursive: true })
  run('rsync', ['-a', deploy + '/', OUT_DIR + '/'])
} else {
  console.log('[prepare-runtime] DSH_SKIP_DEPLOY: keeping', OUT_DIR)
}
