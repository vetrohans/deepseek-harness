# Agent Note: Tauri desktop packaging with a local-fork closure and in-place updates

Status: implemented

English | [中文](2026-08-16-tauri-desktop-packaging.zh.md)

## Problem

DeepSeek Harness ships as a CLI plus web app; a desktop distribution must be double-click installable (macOS DMG / Windows EXE) for users who have no Node.js, npm, npx, pnpm, or CLI habits, and the installer must stay under 200MB. The fork's UI changes live in `packages/` source, so the official `@deepseek-ai/dsh` npm package cannot carry them — the packaged runtime has to be built from this repo. Updating an already-installed app must not require re-running the whole bundler, which re-copies a ~450MB closure and rebuilds the DMG every time. Finally, the UI-override plugin is pre-built (`lib/client.js` is the maintained artifact, not a source compile), so after an upstream sync its CSS-module hashes are stale and some step must remap them before anything is deployed.

## Decision

A Tauri 2 shell over the system WebView, with the bundled Node.js binary as an `externalBin` sidecar and the locally deployed production closure as a resource. The pipeline lives in `desktop/`:

- `scripts/prepare-runtime.mjs` — `pnpm deploy --prod` of the local fork into `src-tauri/dsh-runtime/`. The deploy root *is* `@deepseek-ai/dsh`, so the CLI entry is `dsh-runtime/lib/bin.js`. The closure is pruned (`.map`/`.d.ts`/`.pdb`/`.ts`, foreign node-pty prebuilds), then repopulated with omitted workspace peers, `e2b`/`@agentclientprotocol/sdk`, bundled `pnpm`, and a `dsh` shim.
- `scripts/fetch-node.mjs` — official Node dist to `src-tauri/binaries/node-<triple>` (externalBin) plus `src-tauri/node-dist/<tag>/` (npm/npx/corepack shims + support tree).
- Rust launcher (`src-tauri/src/`) — on macOS a Finder launch carries an empty PATH, so the shell PATH is probed from the login shell; the bundled bin dirs are prepended and `DSH_DESKTOP_NODE`, `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, and `npm_config_registry` are injected; it boots `dsh web --port 0`, parses the readiness URL, and navigates the window.
- Runtime configuration lives in `tauri.conf.json > plugins > dsh-desktop` (Tauri 2.11 accepts no `app.config` key; `Config.plugins` is a `PluginConfig(pub HashMap)` newtype).

Installed-app updates go through `desktop/scripts/update-app.mjs` only: quit the running instance, `rsync --delete` the closure and node-dist into `Contents/Resources`, replace the executables, ad-hoc re-sign with hardened runtime plus the JIT entitlements, then `codesign --verify`. No full `tauri build` for an update.

Every formerly-manual step is injected into the pipeline: `ui-overrides/scripts/remap-css-hashes.mjs` runs as step 1 of `prepare-runtime.mjs` (before rsync/deploy, skip with `DSH_SKIP_REMAP=1`); npm/npx/corepack are shipped as shims because the dist bin scripts are symlinks whose relative `../lib/cli.js` requires break when flattened by a copy.

## Alternatives considered

- Electron shell (previous attempt): 207MB DMG and still bundles Chromium; replaced by Tauri's system WebView.
- `npm install @deepseek-ai/dsh` for the runtime: the official package lacks the fork UI; rejected — the closure is built locally from this repo.
- First-launch runtime download (Sakana-yuyu style): kept as `runtime.mode=download` fallback; the default is a bundled closure.
- "Complete the npm structure inside the closure" (copy npm into `dsh-runtime/bin`): wrong layer — npm/npx live in `node-dist`, whose broken flattened copies would still shadow the closure bins on PATH order; the fix is shims generated in `fetch-node.mjs`.
- `npx -y <pkg> install` for third-party DSH plugins: the nested `npx @deepseek-ai/dsh` hits npm's `ECOMPROMISED` cache lock; plugins install via `dsh plugin --profile web add <pkg>`.

## Consequences

Bought: a 136MB DMG, second-scale in-place updates, a self-contained toolchain (node/npm/npx/corepack/pnpm/dsh all resolve inside the app), and an automated CSS-hash remap on every upstream sync.

Cost: the closure is ~452MB raw (≈95MB compressed); builds must run on the target platform because of native modules such as node-pty; third-party plugins built against newer upstream versions may not fully work on the rc.5 closure — DeepSeekEyes' pixel probe returns empty text, worked around with `activeProbe: false` while real image reading is verified working. npm's "cache folder contains root-owned files" message is a misleading wrapper for any cache EPERM; the real cause in sandboxed agent runs is the sandbox blocking `~/.npm` writes, not file ownership.
