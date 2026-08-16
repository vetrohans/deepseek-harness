# dsh-preview-panel（DSH 右侧分栏预览）

在 DeepSeek Harness Web GUI 中，把「点击对话里的服务器地址」变成可预览的右侧分栏：

- 点击对话中的 `http://localhost:3000`、`127.0.0.1:xxx`、内网 IP、或任何带端口的地址 → 弹小浮窗：
  - **用 DSH 打开** → 打开右侧预览分栏并加载该地址
  - **用浏览器打开** → 新标签页打开
- 右侧分栏是布局网格的第 4 列（sidebar | center | details | preview），工作区自动收缩、**不遮挡**。
- 分栏宽度可拖动（280–1200px），对话窗口可被压到 400px；手柄保持原 8px。
- 分栏内有地址栏（可改 URL、回车跳转）、刷新、新标签页打开、关闭（✕）按钮。

## 当前工作流（源码模式，2026-08 起）

本项目已改为**仓库源码 + 桌面壳**模式（不再直接改已安装 App 的 bundle）：

1. **预览插件（左侧滑条 / 余额胶囊 / 全局 CSS 覆盖）**：唯一可编辑副本是
   本目录的 `lib/client.js`。改完必须**同步到仓库插件**再构建：

   ```bash
   cp ui-overrides/lib/client.js packages/plugins/dsh-client-ui-preview/lib/client.js
   corepack pnpm run build          # 重建 lib + web bundle
   # 桌面壳（Electron 已移除，Tauri 迁移中，启动方式后续更新）
   ```

2. **布局 / 四列分栏**：已在源码 `packages/client/ui-layout`，直接改源码。
3. **右侧栏 better-sidebar**：源码在 `packages/plugins/dsh-better-sidebar`（lib 不入库，构建时生成）。
4. **其它 UI（会话头、统计行、消息面板等）**：改对应 `packages/client/...` 源码。
5. **上游更新后**：先跑 `node ui-overrides/scripts/remap-css-hashes.mjs`（重映射
   `lib/client.js` 里被构建改变的 CSS-module 哈希类名），再重新构建。
6. **Git**：只做本地提交，**绝不 push**（除非用户明确要求）。

> 下面「用法 / 实现原理」描述的是旧版"已安装 App"工作流（`dsh-ui.sh` /
> `apply-patches.py` / `migrate-to-new-machine.sh`），仅历史遗留，当前源码模式
> 不需要它们；`remap-css-hashes.mjs` 仍然有效。

## 打包（桌面壳 -> DMG）

> Electron 桌面壳已于 2026-08 移除，改为 **Tauri** 方案（见 `desktop/README.md`）。
> 打包时 `desktop/scripts/prepare-runtime.mjs` 会自动执行 `remap-css-hashes.mjs`
> （进入闭包前重映射，`DSH_SKIP_REMAP=1` 跳过）。

## 位置（历史）

维护文件都在本目录：`~/.dsh/UI功能改动/`

```
~/.dsh/UI功能改动/
├── dsh-ui.sh          一键脚本（apply / restore / status）
├── apply-patches.py   布局补丁（幂等，更新后重跑这个）
├── lib/client.js      预览插件 UI（分栏 + 链接浮窗）
├── lib/index.js       插件节点端占位
├── package.json       插件包描述
└── README.md          本说明
```

## 用法

```bash
cd ~/.dsh/UI功能改动

./dsh-ui.sh apply                 # 打补丁 + 重装插件 + 重启 GUI
./dsh-ui.sh apply --no-restart    # 同上但不重启
./dsh-ui.sh watch                 # 监听改动，自动 apply（改完文件即自动生效）
./dsh-ui.sh restore               # 完全还原 + 重启
./dsh-ui.sh status                # 查看状态
```

## 之后想改 UI / 新增功能（都在本目录改）

本目录就是**唯一的源文件目录**，所有改动都落在这里，再由 `dsh-ui.sh` 同步进 GUI：

| 想改什么 | 改哪个文件 |
| --- | --- |
| 布局（分栏宽度、列数、手势、网格规则…） | `apply-patches.py`（加/改一个 `repl(...)` 条目） |
| 面板/浮窗外观与交互 | `lib/client.js` |
| 新增独立功能（新按钮、新面板、新浮窗…） | 在 `lib/client.js` 里加组件 + 在 `apply()` 里注册进对应 slot |

两种落地方式：

1. **手动**：改完跑 `./dsh-ui.sh apply`。
2. **自动**：先开一个终端跑 `./dsh-ui.sh watch`，之后每次保存文件，脚本会自动同步并重启 GUI（每改一次会重启一次，改动确认后 `Ctrl+C` 退出 watch）。

每个补丁条目幂等，新旧改动可叠加；若更新改了布局导致锚点失效，脚本会报 `FAIL` 提示检查。

**版本管理**：本目录已用 git 初始化。建议每次改完提交一次，方便 diff / 回退：

```bash
cd ~/.dsh/UI功能改动
git add -A && git commit -m "描述这次改动"
```

## 实现原理（两部分）

DeepSeek Harness 的 GUI 是「客户端插件 + slot 注册」架构：布局组件 `dsh-client-ui-layout` 声明顶层 slot（sidebar / conversation / details / shell.overlay），各插件把 React 组件注册进 slot。改动分两层：

**① 布局补丁（在应用包内，会被更新覆盖）**
直接修改编译后的 bundle：
`/Applications/DeepSeek Harness.app/Contents/Resources/harness/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js`
- 网格加第 4 轨 + 声明 `preview` slot（single / root）
- `computeColumns` 改 4 轨求解（center 最小 400px，preview 280–1200px）
- store 加 `preview` 宽度状态与 `set/open/close/togglePreview` 动作
- `ctx.layout` 服务加 `openPreview()/closePreview()/togglePreview()`
- 加 preview 列的 DragHandle（复用原拖拽机制，手柄 8px 未改）

**② 预览插件（在用户目录 ~/.dsh 内，更新不影响）**
新插件包 `@local/dsh-client-ui-preview`：
- `~/.dsh/profiles/node_modules/@local/dsh-client-ui-preview/`
- 通过 `~/.dsh/profiles/web/cordis.patch.yml` 的 `insert` 条目注册进插件集
- 浏览器端注册两个组件：`preview` slot（分栏内容）+ `shell.overlay` slot（链接浮窗），加 document 点击拦截器识别服务器地址

## 更新软件后还在吗

- **插件（②）**：还在 —— 在 `~/.dsh` 下，不在应用包内。
- **布局补丁（①）**：**不在了** —— 更新替换整个 `.app`，`client.js` 恢复原样。

**更新后修复**：一条命令即可（幂等）：

```bash
cd ~/.dsh/UI功能改动 && ./dsh-ui.sh apply
```

## 卸载

```bash
cd ~/.dsh/UI功能改动 && ./dsh-ui.sh restore
```

> 只想去掉「链接浮窗」但保留布局第 4 列：手动删 `cordis.patch.yml` 里的条目 + 删 `~/.dsh/profiles/node_modules/@local`，再重启即可。
