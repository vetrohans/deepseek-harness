# 开发任务必读清单（强制）

> 规则：**任何开发任务开始前，必须先读完下列文档**，再动手写代码。
> 本清单由用户明确要求固化（2026-08-15）。

## 必读文档（按顺序）

1. **开发系列（develop）** — 在 `docs/user/develop/`（仓库内权威副本，随上游同步）：
   - `basic/index.zh.md` — 第一个插件（apply / inject / ctx.effect）
   - `basic/tool.zh.md` — 开发一个工具（defineTool / ctx.tools.register）
   - `basic/config.zh.md` — 插件配置（Config + Schemastery schema）
   - `basic/publish.zh.md` — 打包与安装（bundle vs profile / dsh plugin / 层顺序 / allowBuilds）
   - `framework/index.zh.md` — 插件生命周期（Fiber 状态机 / HMR）
   - `framework/service.zh.md` — 服务与依赖（Service 基类 / inject / 服务隔离）
   - `framework/events.zh.md` — 事件系统（emit / bail / serial / waterfall）
   - `practice/index.zh.md` — 能力分层（Service Definition / Provider / Consumer）
   - `practice/llm-adapter.zh.md` — LLM 适配器（LlmAdapter / stream 分片）

2. **Cordis 框架教程** — `docs/cordis-tutorial/`（01–07 章，中文 `*.zh.md`）：
   - 第 2 章《生命周期与 effect》本地参考副本：`ui-overrides/docs/cordis-tutorial-02-lifecycle-and-effects.zh.md`

## 与本仓库开发相关的额外必读

- `AGENTS.md`（仓库根，贡献者规范）
- `docs/development.zh.md`（构建 / 类型检查 / 门禁 / 日常命令）

## 开发前自问

- [ ] 我已通读上面列出的相关章节？
- [ ] 我的改动是否应该做成**插件**而不是改核心？（优先插件化）
- [ ] 用到的注册是否都走 `ctx.*`（自动清理），非托管资源是否包了 `ctx.effect()`？
- [ ] 新增配置是否进了 `Config` schema（不硬编码）？
- [ ] 是否符合 bundle / profile / 层顺序约定？
