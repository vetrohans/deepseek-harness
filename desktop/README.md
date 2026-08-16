# DSH Desktop（Tauri + Sidecar 打包方案）

把 DeepSeek Harness 的 `dsh web` 装进 Tauri 2 桌面壳：双击即用，用户不需要安装
Node.js / npm / npx / pnpm，也不需要跑任何命令行。

- 参考 [xiincs/deepseek-harness-desktop](https://github.com/xiincs/deepseek-harness-desktop)
  （Tauri 2 + 内置 Node.js 运行时）与 [Sakana-yuyu/deepseek-harness-desktop](https://github.com/Sakana-yuyu/deepseek-harness-desktop)
  （首次启动按需下载运行时、复用 `~/.dsh`）。
- 本仓库的 UI 改动在 `packages/` 源码里，官方 npm 包没有这些改动，所以运行时闭包
  **必须从本地 fork 构建**（`scripts/prepare-runtime.mjs`，沿用此前 Electron 方案沉淀的
  `pnpm deploy --prod` 流程），而不是 `npm install @deepseek-ai/dsh`。

## 项目结构

```
desktop/
├── README.md                    # 本文档
├── package.json                 # 打包脚本（prepare:runtime / fetch:node / tauri）
├── .gitignore
├── scripts/
│   ├── prepare-runtime.mjs      # 从本地 fork 构建生产闭包 → src-tauri/dsh-runtime/（含裁剪 + pnpm）
│   ├── fetch-node.mjs           # 下载官方 Node 发行版 → src-tauri/binaries/ + src-tauri/node-dist/
│   └── bundle-runtime.mjs       # 打运行时 tar.gz + sha256 清单（download 模式发布用）
├── src/
│   └── index.html               # 极简启动页（加载中转圈；就绪后 Rust 导航到 dsh URL）
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json          # externalBin=node, resources=dsh-runtime + node-dist
    ├── capabilities/default.json
    ├── entitlements.mac.plist
    ├── icons/                   # 由根目录 icon.icns 生成
    ├── binaries/                # [生成] node-<target-triple>（externalBin 侧车）
    ├── dsh-runtime/             # [生成] 生产闭包（prepare-runtime.mjs 输出）
    ├── node-dist/               # [生成] npm/npx/corepack 脚本（fetch-node.mjs 输出）
    └── src/
        ├── main.rs
        ├── lib.rs               # Builder / 窗口关闭时杀掉侧车 / install_plugin IPC
        ├── sidecar.rs           # 启动 dsh web --port 0、解析就绪 URL、导航
        ├── first_run.rs         # download 模式拉取/校验/解压、node shim、预装插件
        └── shell_path.rs        # macOS GUI 空 PATH 问题：登录 shell 探测 + 合并
```

构建产物（均 gitignore）：

| 产物 | 来源 | 说明 |
|---|---|---|
| `src-tauri/dsh-runtime/` | `prepare-runtime.mjs` | 生产闭包（约 457MB 原始 / 压缩后 ~95MB） |
| `src-tauri/binaries/node-<triple>` | `fetch-node.mjs` | Node 可执行文件（externalBin） |
| `src-tauri/node-dist/<triple>/` | `fetch-node.mjs` | npm / npx / corepack **shim**（指向包内真实入口）+ 支撑库 |
| `release/runtime/*.tar.gz` | `bundle-runtime.mjs` | download 模式的发布资产 |

## 六条要求的落实方式

### 1. 安装包 < 200MB

- 只打包**生产依赖闭包**：`pnpm deploy --prod --legacy --node-linker=hoisted`，不含
  devDependencies；再裁剪 `.map` / `.d.ts` / `.pdb` / `.ts`，只留本平台 node-pty
  prebuild（`prepare-runtime.mjs` 第 3 步）。
- **不打包整个 node_modules 之外的东西**：`tauri.conf.json` 的 `resources` 只指向
  `dsh-runtime/` 和 `node-dist/`（均在 `src-tauri/` 下，用相对路径，避免 `..` 越界）；Tauri 用系统 WebView（macOS WKWebView / Windows
  WebView2），不像 Electron 自带 Chromium。
- 体积预算（沿用此前 Electron 方案实测口径）：闭包压缩后 ~95MB + Node 侧车 ~35MB +
  壳 ~5MB ≈ **DMG ~140MB**，NSIS 类似，均 < 200MB。若还要更小，可去掉
  `@univerjs*`（dsh-better-sidebar 办公预览，~180MB 源码）或改用 `runtime.mode=download`。

### 2. 自带 Node，不出现 npx/npm not found

- `fetch-node.mjs` 下载官方 Node 发行版，把 `node` 作为 Tauri `externalBin` 侧车打进
  bundle（构建期自动改名为 `node` / `node.exe`）；npm / npx / corepack 脚本放进
  `node-dist/`（resources）。
- 启动时 Rust 把 `src-tauri/node-dist/<triple>/bin`、`src-tauri/dsh-runtime/bin`（pnpm shim）和 app-data
  `bin/`（node shim）**前置到 PATH**，并注入 `DSH_DESKTOP_NODE`（侧车绝对路径）。
  npm/npx/corepack/pnpm 脚本里的 `#!/usr/bin/env node` 因此都能解析到侧车。
- `dsh plugin` 是 pnpm 转发器（`spawnSync('pnpm', ...)`），所以闭包里额外捆了
  `pnpm@11.7.0` 并生成 `bin/pnpm` / `bin/pnpm.cmd` shim（`prepare-runtime.mjs` 第 5 步）。
- npm/npx/corepack 的 dist bin 是指向包内的符号链接，摊平复制会断掉 `../lib/cli.js`
  相对路径；`fetch-node.mjs` 改为生成 shim 指向真实包入口
  （`npm-cli.js` / `npx-cli.js` / `dist/corepack.js`），与 pnpm shim 同一模式。

### 3. macOS 空 PATH 与沙盒

- **空 PATH**：Finder 启动 GUI 应用时 PATH 是空的。`shell_path.rs` 在 PATH 为空时
  用 `$SHELL -l -c 'printf %s "$PATH"'` 探测用户登录 shell 的 PATH（5 秒超时），
  再退回 `/usr/libexec/path_helper -s`，最后叠加 `/usr/bin:/bin:/usr/sbin:/sbin`。
- **沙盒**：`entitlements.mac.plist` **默认不开 App Sandbox**——沙盒应用没有
  "整目录读写 ~/.dsh" 的 entitlement，强行开启必然在插件安装时出现 EPERM。不开沙盒
  时 `~/.dsh` 和 `~/Library/Application Support/dsh-desktop` 就像普通进程一样可读写，
  不需要临时豁免。文件里保留了 sandbox 开启时的临时豁免块（`$(HOME)/.dsh` 与
  app-support 目录）作为可选回退；`runtime.dataDir=app-support` 可把数据目录整体
  迁到 `~/Library/Application Support/<identifier>/dsh-home`（默认 identifier 为 `ai.deepseek.dsh-desktop`；沙盒友好路径，Tauri `app_data_dir()` 自动跟随容器）。
- Hardened Runtime 保持开启，因此 `allow-jit` / `allow-unsigned-executable-memory` /
  `allow-dyld-environment-variables` 三项必须保留（Node 的 V8 需要；Tauri 会用这份
  entitlements 重新签名侧车）。

### 4. 插件安装

- 环境注入即解决：`COREPACK_ENABLE_DOWNLOAD_PROMPT=0`、带 pnpm 的 PATH、可选
  `npm_config_registry`（默认 npmmirror）都随侧车环境**被子进程继承**，Agent 在
  harness 里跑 `dsh plugin --profile web add <pkg>` 不会因 PATH/权限失败。
- 插件装到 `$DSH_HOME/profiles/web`（`~/.dsh` 或 app-support 下的 dsh-home），是永久
  目录，重启不丢；不写 /tmp。
- `runtime.presetPlugins` 会在首次启动时自动 `dsh plugin --profile web add`（幂等）；
  壳也暴露了 `install_plugin` IPC（远程 harness 页不开放 IPC，此命令给壳内 UI 用）。

### 5. 依赖与清理

- 闭包来自 `pnpm deploy --prod`：只含生产依赖；devDependencies、测试、文档、
  `scripts/`、`website/` 等都不进闭包（它们本来就不是 `@deepseek-ai/dsh` 的依赖）。
- 裁剪规则覆盖 `**/*.test.js`、`**/test/**`、`**/__tests__/**` 之外的类型/源码/映射：
  `.map`、`.d.ts`、`.d.cts`、`.d.mts`、`.pdb`、`.ts`。
- 打包的是 `dist/`、`lib/` 构建产物：先 `pnpm run build` 生成 `apps/web/dist` 与各包
  `lib/`，`prepare-runtime.mjs` 再从工作区 rsync 这些已构建产物进闭包；源码不打包。

### 6. 开箱即用

- 默认 `runtime.mode=bundled`：闭包随安装包走，首启零下载、可离线。
- `runtime.mode=download`（Sakana-yuyu 策略）：安装包只带 Node 侧车 + 壳（~45MB），
  首启从 `runtime.manifestUrl`（GitHub Releases）或 `runtime.mirrorUrl`（npmmirror）
  拉 `runtime-manifest-<target>.json`，按 `sha256` 校验后解压到 app-data `runtime/`，
  之后每次启动复用缓存目录。
- 用户只需在界面里填 API Key，全程无命令行。

## 已安装应用的就地更新（不重打整包）

闭包或壳代码更新后，不必重跑 `tauri build` 整包；构建产物已就绪时直接更新已安装的
`.app`：

```bash
# 前置构建（按需）：
node desktop/scripts/prepare-runtime.mjs                  # 闭包变更后
node desktop/scripts/fetch-node.mjs darwin-x64            # Node 侧车变更后
pnpm --dir desktop tauri build --no-bundle --target x86_64-apple-darwin   # 壳代码变更后

# 复制进已安装的 .app 并重新签名（ad-hoc + hardened runtime + JIT entitlements）：
node desktop/scripts/update-app.mjs                       # 默认 /Applications/DSH Desktop.app
# node desktop/scripts/update-app.mjs /path/to/DSH Desktop.app
```

脚本会先退出正在运行的实例，把 `src-tauri/dsh-runtime/`、`src-tauri/node-dist/` 与两个
可执行文件同步进 `Contents/Resources` / `Contents/MacOS`，再用与 Tauri 相同的签名参数
（`-` ad-hoc、`--options runtime`、entitlements.mac.plist）重新签名并 `codesign --verify`。

## 下次更新功能的完整流程

先判断改了什么，决定重建哪一层：

| 改动范围 | 必须重建 | 可跳过 |
|---|---|---|
| `packages/`、`apps/`（框架/UI/CLI） | `pnpm run build`（根）+ `prepare:runtime` | — |
| `ui-overrides/` | `pnpm run build`（根）+ `prepare:runtime`（自动 remap） | 哈希没变才 `DSH_SKIP_REMAP=1` |
| `desktop/src-tauri/`（Rust 壳） | `tauri build --no-bundle`（出二进制） | — |
| 换 Node 版本 / 改 `fetch-node.mjs` | `fetch:node darwin-x64` | Node 版本没变可不跑 |
| 只改 `desktop/scripts/*.mjs` 流程逻辑 | 按上面对应层重跑 | — |

日常迭代（更新已安装应用，秒级）：

```bash
cd /Users/zhaoyunsheng/Documents/DSH
pnpm run build                 # 1. fork 构建（框架/UI 改动时；只改壳可跳过）
cd desktop
pnpm prepare:runtime           # 2. 重建闭包（自动 remap UI 覆写哈希、内置 pnpm/dsh shim）
pnpm fetch:node darwin-x64     # 3. 换 Node 版本时才需要（否则跳过）
pnpm tauri build --no-bundle --target x86_64-apple-darwin   # 4. 只改 Rust 壳时才需要
pnpm update:app                # 5. 更新已安装应用（复制 + 重签）
# 重启 DSH Desktop 验证功能
```

需要新安装包（分发）时才整包：

```bash
cd desktop && pnpm dmg:x64      # = tauri build + 拷到 desktop/release/
```

注意：

- `pnpm run build` 与 `prepare:runtime` 需要联网（npm registry），沙盒/CI 中要提权。
- 闭包含原生模块，必须在目标平台构建（macOS 只能在 macOS，Windows 只能在 Windows）。
- 发新版本前同步三处 version：`desktop/package.json`、`desktop/src-tauri/Cargo.toml`、`desktop/src-tauri/tauri.conf.json`。
- 密钥/凭据在 `~/.dsh/.credentials.yaml`（0600），不会进包；settings.yaml 只存引用名。

## 打包命令

前置（一次性，本机已满足 Node 24 / pnpm 11；Rust 需 ≥ 1.77.2，Tauri 2 要求）：

```bash
# 0) Rust 工具链（旧版本先升级，Tauri 2 需要 ≥ 1.77.2）
rustup update stable

# 1) 装壳的构建工具（desktop 独立于根 workspace，单独安装）
pnpm --dir desktop install

# 2) 先构建 fork（生成各包 lib/ 与 apps/web/dist，prepare-runtime 依赖它们）
corepack pnpm run build
```

### macOS

```bash
cd desktop
node scripts/prepare-runtime.mjs          # 生产闭包 → dsh-runtime/
node scripts/fetch-node.mjs darwin-arm64   # Node 侧车（Apple Silicon）
pnpm tauri build --target aarch64-apple-darwin
# 或一条命令：pnpm build:macos:arm64

# Intel 版
node scripts/fetch-node.mjs darwin-x64
pnpm tauri build --target x86_64-apple-darwin
```

产物：`desktop/src-tauri/target/darwin-arm64/release/bundle/dmg/DSH Desktop-0.1.0-rc.5-aarch64.dmg`
（`signingIdentity: "-"` 为 ad-hoc 签名；正式分发请换成开发者证书并做 notarization）。

冒烟测试：

```bash
"desktop/src-tauri/target/darwin-arm64/release/bundle/macos/DSH Desktop.app/Contents/MacOS/DSH Desktop"
# 预期日志：[dsh] dsh web: http://127.0.0.1:<port>，随后窗口出现界面
```

### Windows

在装了 MSVC toolchain 的机器上（闭包内含 node-pty 等本平台原生模块，**必须在目标
平台构建**，不能跨平台交叉打包）：

```powershell
cd desktop
node scripts\prepare-runtime.mjs
node scripts\fetch-node.mjs win32-x64
pnpm tauri build --target x86_64-pc-windows-msvc
# 或 pnpm build:windows
```

产物：`desktop\src-tauri\target\win32-x64\release\bundle\nsis\DSH Desktop-0.1.0-rc.5-setup.exe`
（NSIS 安装到当前用户目录，免管理员权限；WebView2 由系统提供，缺失时 NSIS 引导安装）。

### download 模式发布资产

```bash
cd desktop
node scripts/prepare-runtime.mjs
node scripts/bundle-runtime.mjs darwin-arm64 darwin-x64 win32-x64
# 把 release/runtime/*.tar.gz 与 runtime-manifest-<tag>.json 传到
# GitHub Releases 或镜像，并把 tauri.conf.json 里 runtime.mode 改为 "download"
```

## 侧车启动流程（Rust 端）

1. `lib.rs::setup` 在异步任务里调 `sidecar::boot`。
2. 解析 `tauri.conf.json > plugins > dsh-desktop > runtime`（Rust 端 `app.config().plugins`）：闭包来源（bundled/download）、数据目录、
   registry、预装插件。
3. 组装 PATH 与环境（PATH 前置、`DSH_HOME`、`COREPACK_ENABLE_DOWNLOAD_PROMPT=0`、
   `npm_config_registry`、`DSH_DESKTOP_NODE`）。
4. 写 `node` shim 到 app-data `bin/`（指向侧车绝对路径，处理路径含空格）。
5. `app.shell().sidecar("node")` 以 `[entry, "web", "--port", "0"]` 启动；stdout 里
   匹配 `dsh web: (https?://\S+)` 后 `window.navigate(url)`。
6. 侧车子进程存入 `SidecarState`；窗口销毁时 `child.kill()`，退出即停服务。

## 注意事项

- **平台绑定**：闭包含 node-pty 等原生模块，macOS 闭包只能在 macOS 构建，Windows 闭包
  只能在 Windows 构建。建议 CI 按平台矩阵各自跑 `prepare-runtime` + `tauri build`。
- **首次构建很慢**：`pnpm deploy` 要解析整棵 workspace；`fetch-node.mjs` 需联网下载
  Node（国内可用 `DSH_NODE_MIRROR=https://npmmirror.com/mirrors/node`）。
- **ExFAT 外置盘**：闭包几万个小文件在 ExFAT 大簇上磁盘占用会膨胀到数 GB，构建产物
  放 APFS 本地盘，只把最终 dmg/exe 拷出去。
- **升级 fork**：merge 上游 → `corepack pnpm run build` → 重跑 `prepare-runtime.mjs`，
  脚本自动用新源码；`prepare-runtime` 会自动执行
  `ui-overrides/scripts/remap-css-hashes.mjs` 重映射 UI 覆写插件里的 CSS-module 哈希类名
  （`DSH_SKIP_REMAP=1` 可跳过）。
- 产物目录与 `node_modules/` 全部 gitignore；按仓库约定只本地提交，不 push。
