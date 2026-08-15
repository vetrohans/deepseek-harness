# DSH Desktop（Electron 壳）

用 Electron 把 deepseek-harness 的本地 Web UI（`dsh web`，默认 127.0.0.1:3080）包成 macOS 桌面应用（DMG）。

## 架构
- 主进程 `src/main.js`：spawn `dsh web` 子进程（`--port 0` 自动选空闲端口），解析
  `dsh web: http://...` 就绪行，然后 BrowserWindow 加载该地址；退出时清理子进程。
- dev 模式：直接跑仓库源码（corepack pnpm dsh web）。
- 打包模式：运行 `resources/dsh-runtime` 下的编译产物 + 独立 Node。

## 开发
```bash
# 前置：仓库根目录已 pnpm install && pnpm run build
cd desktop
pnpm install        # 安装 electron / electron-builder（首次较大）
pnpm run dev        # 启动 Electron，拉起 dsh web 并显示窗口
```

## 打包 DMG
```bash
cd desktop
pnpm run pack:dir   # 先本地验证 .app
pnpm run pack       # 出 DMG（签名/公证需配置 Apple Developer 证书）
```

## 打包运行时（dsh-runtime）
发布前需要把编译好的 dsh 服务复制到 `desktop/dsh-runtime/`（或仓库根 `dsh-runtime/`，
与 electron-builder.yml 的 extraResources 路径对应）：
- `pnpm run build` 后的产物（apps/cli/lib、packages/*/lib、apps/web/dist）
- 完整 `node_modules`（pnpm 布局，保留符号链接结构）
- 独立的 Node ≥22.19 二进制（`node/` 目录），避免依赖 Electron 内置 Node 版本

## 签名与公证
- 需要 Apple Developer 账号：Developer ID Application 证书。
- 环境变量：`CSC_LINK`、`CSC_KEY_PASSWORD`、`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`TEAM_ID`。
- electron-builder 配置已开启 hardenedRuntime + entitlements，notarize 可在 CI 中配置。

## 与上游同步
见仓库根 `scripts/sync-upstream.sh`（base -> main -> dev 合入流程）。
