# DSH Desktop 轻量打包流程（协议）

> 目标：把 fork（含 UI 改动）打包成 x64 DMG，体积从全量打包的 3.3GB 降到 **~207MB**。
> 思路来自 [bruc3van/dsh-desktop](https://github.com/bruc3van/dsh-desktop)（Electron 版，133MB）
> 与 [xiincs/deepseek-harness-desktop](https://github.com/xiincs/deepseek-harness-desktop)（Tauri 版，~50MB）。
> 本仓库用 Electron，因为 UI 改动在 fork 源码里，运行时闭包必须从本地 fork 构建。

## 一键打包

```bash
cd desktop
node scripts/pack.mjs          # = prepare-runtime.mjs + electron-builder --mac dmg
# 或分步：
node scripts/prepare-runtime.mjs   # 生成生产闭包 → desktop/dsh-runtime
npx electron-builder --mac dmg     # 打 DMG
```

产物：`desktop/release/DSH Desktop-<version>-x64.dmg`（也可以 `--config.directories.output=/tmp/xxx` 输出到 APFS 快速盘，再把 dmg 拷回桌面）。

**冒烟测试**（每次打包后必做）：

```bash
DSH_SMOKE=1 "desktop/release/mac/DSH Desktop.app/Contents/MacOS/DSH Desktop"
# 预期日志：
#   [desktop] ready at http://127.0.0.1:<port>
#   [desktop] smoke: page loaded
# 然后进程自动退出
```

## 体积是怎么降下来的

| 手段 | 效果 |
|---|---|
| 运行时只打包**生产依赖闭包**（`pnpm deploy --prod`） | 19GB → ~1GB（不含 dev 工具链） |
| 裁剪 `.map` / `.d.ts` / `.pdb` / `.ts` | ~200MB |
| 只保留本平台 node-pty prebuild | ~46MB |
| **不内置 Node**：跑在 Electron 自带 Node（`ELECTRON_RUN_AS_NODE`） | ~50MB |
| `electronLanguages` 只留中英文 | ~40MB（Chromium 55 个语言包） |
| asar + normal 压缩 | — |

最终闭包：~457MB（含 fork 的 univer 办公预览等特性）。DMG 构成 ≈ Electron 110MB + 运行时压缩后 ~95MB。

> 若还要更小：`@univerjs*`（办公预览，~180MB）是 fork 自研 better-sidebar 的功能，去掉可到 ~150MB 以下，但会失去 doc/xlsx/ppt 预览。

## 运行时闭包怎么来的（prepare-runtime.mjs）

fork 的 UI 改动在 `packages/` 源码里，不能 `npm install @deepseek-ai/dsh`（官方包没有这些改动），
所以从**本地 fork 源码**构建：

1. rsync 工作区源码（不含 node_modules/.git）到 APFS 临时目录
2. 修临时副本：
   - 删掉 `link:` overrides（否则 vendored 包打不进闭包）
   - 删根 postinstall（lefthook 是 dev 用的）
3. `pnpm --filter @deepseek-ai/dsh deploy --prod --legacy --node-linker=hoisted`
   → 自包含生产闭包（hoisted 布局，无跨目录 symlink）
4. 裁剪 + 删 node-pty 非本平台 prebuild
5. 补 pnpm deploy 漏掉的 26 个 workspace peer 包 + 两个外部依赖
   （`e2b`、`@agentclientprotocol/sdk`）
6. 输出到 `desktop/dsh-runtime`（electron-builder 的 extraResources 源）

上游更新后：merge 上游 → `corepack pnpm run build`（重新生成 lib + web bundle）→ 重新跑 pack.mjs 即可，脚本自动用新源码。

## electron-builder 关键配置（electron-builder.yml）

- `extraResources` **必须逐项**指向闭包顶层（`node_modules` / `lib` / `config` / `package.json`）：
  electron-builder 复制目录时会**跳过 node_modules**，`from` 直接指到 node_modules 本身才不会被跳。
- `files` 不含 node_modules（壳代码打进 asar）。
- `electronLanguages: [zh-CN, zh_CN, en-US, en]`。
- `identity: "-"`（ad-hoc 签名）+ `hardenedRuntime: false`：Gatekeeper 显示"未识别开发者"，右键打开即可。
- `electronDist: node_modules/electron/dist`：用本地 Electron，不联网下载。

## 运行时启动方式（src/main.js + src/runtime-launcher.mjs）

- 打包后**没有 node 命令**：`process.execPath` + `ELECTRON_RUN_AS_NODE=1` 启动闭包入口。
- 入口走 `src/runtime-launcher.mjs`（移植自 bruc3van，MIT）：把 `ELECTRON_RUN_AS_NODE`
  从环境里摘掉，只在自 spawn（目录选择器等）时按需加回——避免 Agent 的 shell 子进程
  被这个变量污染（否则 `code`/`electron` 会被当成裸 Node 启动）。
- 启动参数必须带 **`--expose-internals`**：`cordis-plugin-hmr` 需要，且打包后
  `node-addon-require-builtin` 在 Electron 内置 Node 下不可用，只能靠这个 flag。
- 启动时在 `~/Library/Application Support/dsh-desktop/bin` 写一个 `node` shim
  （指向 Electron 的 Node），让 Agent 在打包环境里也能跑 `node xxx.js`。

## 注意：ExFAT 外置盘簇大小

运行时闭包有**几万个小文件**，`desktop/dsh-runtime` 落在 ExFAT 外置盘（大簇）上时，
磁盘占用会从实际 ~457MB 膨胀到 ~4.5GB（每个小文件按簇取整）。这是磁盘开销，不是内容变大。
- 打 DMG 时建议：源闭包和输出都放 APFS（`DSH_RUNTIME_OUT=/tmp/dsh-runtime`
  + `npx electron-builder --mac dmg --config.directories.output=/tmp/dsh-release`），
  最后只把 dmg 拷回桌面/外置盘（单文件，不受簇影响）。
- 冒烟测试、体积、结果不受影响。

## 约定

- 产物目录（`release/`、`dsh-runtime/`、`dsh-runtime*/`、`node_modules/`）全部 gitignore，不入库。
- 只本地提交，**绝不 push**（除非用户明确要求）。
- 图标：`desktop/build/icon.icns`（来自用户提供的 icon.icns）。
