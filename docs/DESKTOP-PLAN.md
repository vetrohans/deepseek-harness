# DSH Desktop —— fork / 二次开发 / Electron 打包 / 合入上游 计划

> 基于 https://github.com/deepseek-ai/deepseek-harness （MIT License，v0.1.0-rc.x，快速迭代中）

## 总体思路
- 自己的代码（Electron 壳 + dsh 插件）与上游代码物理隔离。
- 二次开发优先做成 dsh 插件（Everything is a Plugin），尽量不改核心。
- fork 只保留最小核心补丁，让 `base -> main -> dev` 能近乎无冲突地合入上游。

## 分支模型
- `base`：pristine，只允许 fast-forward 上游 `master`，禁止直接修改。
- `main`：`base` + 极少量核心补丁。
- `dev`：二次开发 + `desktop/`（Electron 壳）+ 自研插件。默认工作分支。
- `release/desktop-vX.Y.Z`：发版分支（出 DMG）。

## 合入上游（scripts/sync-upstream.sh）
```bash
scripts/sync-upstream.sh
```
流程：fetch upstream --tags → base ff-only → merge base→main → merge main→dev → pnpm install → build/typecheck。
冲突时：解决后 `git add .` 继续 `git merge --continue`；
i18n 配对冲突用 `corepack pnpm run resolve-translation-pairing-conflicts`。

## 二次开发纪律
1. 功能做成 dsh 插件，放 `packages/plugins/<你的插件>/`（或独立插件仓库）。
2. 只在 `desktop/`、`packages/plugins/` 加文件；不动根 package.json / lockfile 的业务部分。
3. 新增依赖写进自己包内，避免和上游抢文件。

## Electron 打包（desktop/）
- 架构：Electron 主进程 spawn `dsh web`（127.0.0.1:3080）→ BrowserWindow 加载 → 退出清理。
- 运行时：`pnpm run build` 产物 + node_modules + apps/web/dist 打进 app.asar；Node 版本需 ≥22.19（建议捆绑 Node 22 LTS）。
- 打包：electron-builder → dmg + zip；Developer ID 签名 + notarize；electron-updater 自动更新。
- API Key：设置页 → macOS Keychain，启动时注入环境变量。
- 数据目录：~/Library/Application Support/<AppName>。

## 许可证
MIT：保留 LICENSE 与版权声明，随包带上 THIRD_PARTY_NOTICES.md。
