# packages/plugins — DSH Desktop 二次开发插件

本目录存放随 fork 源码构建的 dsh 插件（"everything is a plugin" 的落地）：

| 包 | 说明 | 注册方式 |
|---|---|---|
| `dsh-client-ui-preview` | 右侧分栏预览 + 余额胶囊 + UI 微调（`@local/dsh-client-ui-preview`） | `packages/bundle/web-app/cordis.patch.yml` insert 行 |
| `dsh-better-sidebar` | VSCode 风格右侧工作台（资源管理器/编辑器/终端/Git/浏览器） | 同上（insert 行；其自身 bundle 层未入 shipped profile，避免重复挂载） |

## 与上游约定的差异（有意为之）

- 根 `.gitignore` 全局忽略 `lib/`（上游约定 lib 为构建产物、不入库）。
- `dsh-client-ui-preview` **没有源码**，lib 是唯一实现 → 用 `git add -f` **强制入库**。
- `dsh-better-sidebar` 从源码构建（真实 tsdown 配置），lib 由 `pnpm run build` 生成、
  **不入库**（与仓库其他包一致；不同构建模式的 CSS 哈希不稳定，入库会产生 churn）。

## 新增插件的检查清单

1. 包放 `packages/plugins/<name>/`，`package.json` 带 `dsh.client`/`dsh.bundle` 元数据与 `exports["./client"]`。
2. 预构建发布 → `tsdown.config.ts` 写 `export default { entry: '' }`。
3. `lib/` 用 `git add -f` 入库（根 .gitignore 默认忽略）。
4. 在 `packages/bundle/web-app/cordis.patch.yml` 加 insert 行；若是 bundle 也记得在 `apps/cli`、`packages/bundle/web-app` 的 dependencies 加 `workspace:^`。
5. `corepack pnpm install` → `corepack pnpm dsh web` 冒烟：日志无报错、`__DSH_BOOT__` 有该插件、`/plugins/<name>/client.js` 返回 200。
6. 全仓 `corepack pnpm run typecheck`。

## 上游更新后：CSS 哈希一键重映射

DSH 的 CSS-module 哈希类名随构建变化，上游更新后插件 CSS 里的类名会失效。
**无需浏览器**，用与构建同算法（lightningcss）重算并自动替换：

```bash
# 合入上游 → 必要时 pnpm install → 然后：
node ui-overrides/scripts/remap-css-hashes.mjs --dry-run   # 先预览
node ui-overrides/scripts/remap-css-hashes.mjs             # 应用（处理两个插件副本）
# 重启 dsh web / Electron 壳，Cmd+Shift+R 硬刷新验证
```

- 自动按"同模块多 local 命中"匹配新前缀；已生效的前缀会保留（幂等）。
- 语义特例 / 低置信映射在脚本顶部 `MANUAL_MAP` / `DROP_PREFIXES` 维护
  （如 `ZK0AtW -> _206-Pq`、`body -> bodyWrap`、`xRnBFa` 已删除）。
- 首次运行前请确认 `pnpm run build` 后的哈希与源码一致（本仓库已验证一致）。
