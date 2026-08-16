# DSH Desktop 打包与迭代复盘（2026-08-16）

覆盖三件事：软件打包流水线、已安装应用的就地更新流程、「手动步骤」的脚本注入。
配合 [desktop/README.md](README.md)（操作手册）阅读；本文记录**为什么这么做**与**踩过的坑**。

## 一、软件打包（终态流水线）

```text
pnpm run build                         # 1. fork 构建：lib/ + apps/web/dist
node scripts/prepare-runtime.mjs       # 2. 生产闭包 → src-tauri/dsh-runtime/（约 452MB 原始）
node scripts/fetch-node.mjs darwin-x64 # 3. Node 侧车 → src-tauri/binaries/ + node-dist/
pnpm tauri build --target x86_64-apple-darwin   # 4. DMG
```

- 产物：`desktop/release/DSH Desktop_0.1.0-rc.5_x64.dmg`（**136MB**，< 200MB 达标）。
- 体积构成：闭包压缩 ~95MB + Node 侧车 ~35MB + Tauri 壳 ~5MB（系统 WebView，无 Chromium）。
- 闭包来自 `pnpm deploy --prod`（本地 fork 源码构建，因为 UI 改动在 `packages/`，官方 npm 包没有）；再裁剪
  `.map/.d.ts/.pdb/.ts`、只留本平台 node-pty prebuild、补 55 个 workspace peer 包 + `e2b`/`@agentclientprotocol/sdk`、
  内置 `pnpm`。

## 二、已安装应用更新：构建 → 复制进 .app → 重新签名（不重打整包）

新增 `desktop/scripts/update-app.mjs`，取代「每次改动都整包 tauri build」：

```bash
node desktop/scripts/prepare-runtime.mjs                # 闭包变更后
node desktop/scripts/fetch-node.mjs darwin-x64          # Node 变更后
pnpm --dir desktop tauri build --no-bundle --target x86_64-apple-darwin   # 壳代码变更后
node desktop/scripts/update-app.mjs                     # 复制 + 重签，默认 /Applications/DSH Desktop.app
```

脚本流程：退出运行实例（主程序 + Node 侧车，pkill 容忍无进程）→ `rsync --delete` 同步
`dsh-runtime/` 与 `node-dist/` 进 `Contents/Resources` → 替换 `Contents/MacOS/dsh-desktop` 与 `node` →
用与 Tauri 相同的参数重签（ad-hoc、`--options runtime`、entitlements.mac.plist 保留 JIT）→
`codesign --verify --deep --strict`。

**为什么**：整包 tauri build 每次重拷 452MB 闭包 + 重建 DMG，耗时几分钟；就地更新是秒级。
**注意**：`/Applications` 写入与 codesign 需要提权（沙盒会 EPERM）。

## 三、脚本注入：把「上游更新后手动步骤」收进流水线

| 脚本 | 注入位置 | 解决什么 |
|---|---|---|
| `ui-overrides/scripts/remap-css-hashes.mjs` | `prepare-runtime.mjs` step 1/7（rsync/deploy 前，`DSH_SKIP_REMAP=1` 跳过） | UI 覆写插件是 pre-built，`lib/client.js` 是手工维护副本；上游合并后 140 个 CSS-module 哈希类名过期，不重映射进闭包的 UI 就是坏的 |
| npm/npx/corepack shim | `fetch-node.mjs`（生成 shim 指向包内真实入口） | dist 的 `bin/npm`/`npx`/`corepack` 是符号链接，摊平复制会断 `../lib/cli.js`；shim 用 `DSH_DESKTOP_NODE` 或 PATH 找 node |
| `dsh` shim | `prepare-runtime.mjs`（`bin/dsh` + `dsh.cmd`） | 应用内终端直接敲 `dsh plugin --profile web add <pkg>`，不用全路径调用闭包 |
| `pnpm` shim | `prepare-runtime.mjs` | `dsh plugin` 是 pnpm 转发器，闭包内必须能解析 pnpm |
| `node` shim | Rust `first_run::ensure_node_shim`（运行时写入 app-data bin） | `.app` 只读，shim 放用户可写目录，指向侧车绝对路径（处理路径含空格） |

原则：**凡是「升级后必须手动跑」的步骤，一律收进构建流水线**；**工具链可用性问题用 shim 而不是复制文件**
（符号链接进 .app 易碎，shim 与 pnpm 同模式最稳）。

## 四、踩坑记录（含修复）

1. **Rust 1.68 太旧**：`brew upgrade rust` → 1.97.1（Tauri 2 需 ≥1.77.2）。
2. **闭包入口路径**：`pnpm deploy` 的产物根就是 `@deepseek-ai/dsh`，CLI 入口是 `dsh-runtime/lib/bin.js`，
   不是 `node_modules/@deepseek-ai/dsh/lib/bin.js`（Rust 与脚本都改过）。
3. **tauri-plugin-shell v2**：没有 `shell-sidecar` feature（v1 才有）；子进程类型是 `process::CommandChild`
   （`kill(self)` 按值消费）；`Command` 构建器方法消费 self，环境注入用 fold 链式。
4. **Tauri 2.11 schema 无 `app.config`**：自定义配置移到 `plugins.dsh-desktop.runtime`；
   Rust 端 `app.config().plugins.0.get("dsh-desktop")`（`PluginConfig(pub HashMap)` 新类型）。
5. **fetch-node 参数是 dist tag（`darwin-x64`）**不是 target triple；Node 下载缓存移到 `.node-cache/`
   （gitignore），避免 245MB 缓存被打进包。
6. **npx `ECOMPROMISED`**：`npx -y <pkg> install` 会嵌套再跑 `npx @deepseek-ai/dsh`，撞 npm 缓存锁。
   结论：第三方 DSH 插件安装走 `dsh plugin --profile web add <pkg>`，不走 `npx ... install`。
7. **沙盒 EPERM → npm 误报 root-owned files**：npm 把任何缓存 EPERM 都报成「cache folder contains
   root-owned files」；真相是 Codex/DSH 沙盒挡 `~/.npm` 写入 + 网络。非沙盒 `npm cache verify` 干净。
8. **settings.yaml 冒号缺空格**：`apiKeyEnv:sk-...` → `MULTILINE_IMPLICIT_KEY` → dsh web 启动即退（code 1）。
   修复 + 备份；并纠正语义：`apiKeyEnv` 是**凭据名**，key 本体在 `~/.dsh/.credentials.yaml`。
9. **DeepSeekEyes 探针空返回**：像素探针（3×3 九色图）在应用管道里返回空文本（插件按官方 rc.6 开发，
   fork 闭包是 rc.5，健康检查不兼容）；key、模型、编码均直测通过。已设 `deepseekeyes.activeProbe: false`
   跳过探针，**真实读图已验证通过**。

## 五、原则沉淀

- **打包与更新分离**：发布用 `tauri build` 出 DMG；已安装应用一律走 update-app，不整包重打。
- **手动步骤必须注入**：remap、shim 全部收进 prepare-runtime / fetch-node，升级即自动生效。
- **误导性报错先取证**：root-owned files（沙盒 EPERM）、probe empty（管道兼容）都不是表面原因。
- **密钥管理**：key 只存 `~/.dsh/.credentials.yaml`（0600）；settings.yaml 只存引用名；含明文 key 的备份及时删除。
- **版本一致性**：第三方插件可能按上游版本开发（rc.6），fork 闭包是 rc.5 —— 插件兼容性以实际验证为准。

## 遗留

- DeepSeekEyes 真实读图已验证通过（探针关闭后正常）。
- Agent Note 已补：`.agents/notes/implemented/process/2026-08-16-tauri-desktop-packaging.md`（EN + ZH + i18n sidecar，
  格式与翻译配对门禁通过）。
- 翻译配对门禁存在**既有失败**（`ui-overrides/README.md`、`packages/plugins/dsh-better-sidebar/README.md` 等缺双语对照），
  与本轮桌面工作无关。
- `desktop/release/` 的 DMG 已是最新（含 remap 修复）；后续代码变更走 update-app，需要新安装包时再整包出。
