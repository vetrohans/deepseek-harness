# Agent Note: Tauri 桌面打包：本地 fork 闭包 + Node 侧车 + 就地更新

Status: implemented

[English](2026-08-16-tauri-desktop-packaging.md) | 中文

## 问题

DeepSeek Harness 以 CLI + Web 应用形态分发；桌面发行版必须做到双击即用（macOS DMG / Windows EXE），目标用户没有 Node.js、npm、npx、pnpm 或 CLI 习惯，且安装包必须小于 200MB。fork 的 UI 改动在 `packages/` 源码里，官方 `@deepseek-ai/dsh` npm 包无法携带这些改动——打包运行时必须从本仓库构建。更新已安装应用不能每次都重跑整个打包器（重拷 ~450MB 闭包 + 重建 DMG）。最后，UI 覆写插件是 pre-built（`lib/client.js` 是手工维护产物，不是源码编译），上游同步后其 CSS-module 哈希过期，部署前必须有一个步骤负责重映射。

## 决策

Tauri 2 壳 + 系统 WebView，内置 Node.js 二进制作为 `externalBin` 侧车，本地部署的生产闭包作为 resource。流水线位于 `desktop/`：

- `scripts/prepare-runtime.mjs` — 对本地 fork 执行 `pnpm deploy --prod` 到 `src-tauri/dsh-runtime/`。deploy 产物根*就是* `@deepseek-ai/dsh`，所以 CLI 入口是 `dsh-runtime/lib/bin.js`。闭包先裁剪（`.map`/`.d.ts`/`.pdb`/`.ts`、非本平台 node-pty prebuild），再补回遗漏的 workspace peer 包、`e2b`/`@agentclientprotocol/sdk`、内置 `pnpm` 和 `dsh` shim。
- `scripts/fetch-node.mjs` — 官方 Node 发行版 → `src-tauri/binaries/node-<triple>`（externalBin）与 `src-tauri/node-dist/<tag>/`（npm/npx/corepack shim + 支撑库）。
- Rust 启动器（`src-tauri/src/`）— macOS 上 Finder 启动 PATH 为空，因此从登录 shell 探测用户 PATH；前置内置 bin 目录并注入 `DSH_DESKTOP_NODE`、`COREPACK_ENABLE_DOWNLOAD_PROMPT=0`、`npm_config_registry`；启动 `dsh web --port 0`、解析就绪 URL、导航窗口。
- 运行时配置位于 `tauri.conf.json > plugins > dsh-desktop`（Tauri 2.11 不接受 `app.config` 键；`Config.plugins` 是 `PluginConfig(pub HashMap)` 新类型）。

已安装应用更新只走 `desktop/scripts/update-app.mjs`：退出运行实例 → `rsync --delete` 同步闭包与 node-dist 到 `Contents/Resources` → 替换可执行文件 → 用 hardened runtime + JIT entitlements 做 ad-hoc 重签 → `codesign --verify`。更新不再整包 `tauri build`。

所有原先需要手动执行的步骤都已注入流水线：`ui-overrides/scripts/remap-css-hashes.mjs` 作为 `prepare-runtime.mjs` 第 1 步（rsync/deploy 之前，`DSH_SKIP_REMAP=1` 跳过）；npm/npx/corepack 以 shim 形式发布，因为 dist 的 bin 脚本是符号链接，摊平复制后其相对 `../lib/cli.js` require 会断裂。

## 备选方案

- Electron 壳（上一版尝试）：207MB DMG 且仍捆绑 Chromium；被 Tauri 的系统 WebView 取代。
- 用 `npm install @deepseek-ai/dsh` 作为运行时：官方包没有 fork UI；否决——闭包从本仓库本地构建。
- 首次启动下载运行时（Sakana-yuyu 风格）：保留为 `runtime.mode=download` 回退；默认是随包闭包。
- 「在闭包内补全 npm 结构」（把 npm 复制进 `dsh-runtime/bin`）：改错了层——npm/npx 在 `node-dist`，其中损坏的摊平副本在 PATH 顺序上仍会遮蔽闭包 bin；正确修法是 `fetch-node.mjs` 生成 shim。
- 用 `npx -y <pkg> install` 安装第三方 DSH 插件：嵌套的 `npx @deepseek-ai/dsh` 会撞 npm 的 `ECOMPROMISED` 缓存锁；插件通过 `dsh plugin --profile web add <pkg>` 安装。

## 结果

买到：136MB DMG、秒级就地更新、自洽工具链（node/npm/npx/corepack/pnpm/dsh 在应用内全部可解析）、以及每次上游同步自动重映射 CSS 哈希。

代价：闭包原始约 452MB（压缩后约 95MB）；因 node-pty 等原生模块，构建必须在目标平台执行；针对更新上游版本开发的第三方插件在 rc.5 闭包上可能不完全兼容——DeepSeekEyes 的像素探针返回空文本，已用 `activeProbe: false` 绕过，真实读图经验证可用。npm 的「缓存目录含 root 拥有的文件」是对任何缓存 EPERM 的误导性包装；沙盒化 agent 运行时的真实原因是沙盒拦截 `~/.npm` 写入，而非文件属主。
