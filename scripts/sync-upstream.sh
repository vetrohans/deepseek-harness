#!/usr/bin/env bash
# 把 deepseek-ai/deepseek-harness 上游合入本 fork。
# 分支模型: base(pristine, ff-only) -> main(最小核心补丁) -> dev(二次开发+desktop)
# 用法: scripts/sync-upstream.sh
set -euo pipefail

UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-upstream}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-master}"

cd "$(dirname "$0")/.."

# 工作区必须干净，避免误合入未提交改动
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "!! 工作区有未提交改动，请先 commit 或 stash 再同步。" >&2
  exit 1
fi

echo "==> Fetch upstream: $UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
git fetch "$UPSTREAM_REMOTE" --tags --prune

echo "==> base: fast-forward 到上游（pristine，只允许 ff）"
git checkout -q base
git merge --ff-only "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"

echo "==> main: 合入 base（重放最小核心补丁）"
git checkout -q main
git merge -q --no-edit base

echo "==> dev: 合入 main（二次开发分支）"
git checkout -q dev
git merge -q --no-edit main

echo "==> 更新依赖与 lockfile"
corepack pnpm install

echo "==> 构建与类型检查"
corepack pnpm run build
corepack pnpm run typecheck

echo ""
echo "==> 完成。当前分支: $(git branch --show-current)"
echo "==> 如果 i18n 配对文档冲突未解决，请运行:"
echo "    corepack pnpm run resolve-translation-pairing-conflicts"
echo "==> 如果合并因冲突停止，请解决后: git add . && git merge --continue"
