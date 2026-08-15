// Verify the local toolchain can build/package the desktop app.
import { execSync } from 'node:child_process'

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

const node = run('node -v')
const corepack = run('corepack -v')
const git = run('git -v')
console.log(`node: ${node ?? 'MISSING'} (need >=22.19)`)
console.log(`corepack: ${corepack ?? 'MISSING'}`)
console.log(`git: ${git ?? 'MISSING'}`)

const ok = node && corepack && git
process.exit(ok ? 0 : 1)
