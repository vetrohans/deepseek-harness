#!/usr/bin/env bash
#
# migrate-to-new-machine.sh — 一键把整套 UI 插件迁移到新电脑
#
# 用法（在新电脑上，先装好 DeepSeek Harness，再把本项目文件夹拷过去）：
#   ./migrate-to-new-machine.sh
#
# 脚本自动完成：
#   1) 检查 DeepSeek Harness 是否已安装
#   2) 把项目文件夹部署到 ~/.dsh/UI功能改动（若脚本不在那里运行）
#   3) 还原 ~/.dsh/profiles/web 的配置（package.json / cordis.yml /
#      cordis.patch.yml / pnpm-lock.yaml / pnpm-workspace.yaml）
#   4) pnpm install 安装 profile 依赖（dsh-notification 等，需要联网）
#   5) 把 node_modules 里的 dsh-better-sidebar 换成指向本地项目的符号链接
#      （默认装的是 github 官方版，符号链接才能让本地改动生效）
#   6) 构建 dsh-better-sidebar（pnpm install + pnpm build）
#   7) 打布局补丁 + 部署主 UI 插件（复用 dsh-ui.sh apply）
#   8) 重启 DeepSeek Harness 应用
#
# 环境变量：
#   DSH_APP_BUNDLE   应用路径（默认 /Applications/DeepSeek Harness.app）
#   DSH_NO_RESTART=1 跳过第 8 步（应用重启）
#
set -euo pipefail

say()  { printf '\033[1;36m[migrate]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[migrate]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[migrate]\033[0m %s\n' "$*" >&2; exit 1; }

PROJ_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.dsh/UI功能改动"
PROFILE_SRC="$PROJ_SRC/migrate/profiles/web"
PROFILE_DST="$HOME/.dsh/profiles/web"
APP_BUNDLE="${DSH_APP_BUNDLE:-/Applications/DeepSeek Harness.app}"
HARNESS="$APP_BUNDLE/Contents/Resources/harness"

# ---------- 0. 前置检查 ----------
say "检查 DeepSeek Harness ..."
[ -d "$HARNESS" ] || die "未找到 DeepSeek Harness：$APP_BUNDLE
请先把 DeepSeek Harness.app 安装到 /Applications（或设置 DSH_APP_BUNDLE 指向实际路径）。"
[ -f "$PROFILE_SRC/package.json" ] || die "缺少 profile 配置目录：$PROFILE_SRC（本文件夹拷贝不完整，请重新拷贝）"

# ---------- node / pnpm 探测 ----------
RUNTIME_BIN=""
for _f in "$APP_BUNDLE"/Contents/Resources/runtime/*/bin; do
  [ -d "$_f" ] && { RUNTIME_BIN="$_f"; break; }
done

find_node() {
  local f
  for f in "$RUNTIME_BIN"/node "$HOME"/.nvm/versions/node/*/bin/node; do
    [ -x "$f" ] && { echo "$f"; return 0; }
  done
  command -v node 2>/dev/null || true
}
NODE="${DSH_NODE:-$(find_node)}"

# 找到可用的 pnpm（数组形式，支持带参数的命令如 "corepack pnpm"）。
# 顺序：PATH 上的 pnpm → Harness 自带 corepack/npx → nvm → PATH 上的 corepack/npx。
# Harness 自带的 corepack/npx 其 shebang 是 `env node`，必须把 runtime bin 加进 PATH
# 才能找到 node，所以用 env 包裹。
PNPM_CMD=()
if command -v pnpm >/dev/null 2>&1; then
  PNPM_CMD=(pnpm)
elif [ -x "$RUNTIME_BIN/corepack" ]; then
  PNPM_CMD=(env "PATH=$RUNTIME_BIN:$PATH" "$RUNTIME_BIN/corepack" pnpm)
elif [ -x "$RUNTIME_BIN/npx" ]; then
  PNPM_CMD=(env "PATH=$RUNTIME_BIN:$PATH" "$RUNTIME_BIN/npx" --yes pnpm)
elif [ -x "$HOME/.nvm/versions/node"/*/bin/pnpm ]; then
  PNPM_CMD=("$HOME/.nvm/versions/node"/*/bin/pnpm)
elif command -v corepack >/dev/null 2>&1; then
  PNPM_CMD=(corepack pnpm)
elif command -v npx >/dev/null 2>&1; then
  PNPM_CMD=(npx --yes pnpm)
fi
[ -n "$NODE" ] || die "找不到 node。请安装 Node.js 20+（含 npm/corepack）。"
[ "${#PNPM_CMD[@]}" -gt 0 ] || die "找不到 pnpm。请安装 Node.js 20+（corepack enable）或把 pnpm 加入 PATH。"

# ---------- 1. 部署项目到 ~/.dsh/UI功能改动 ----------
if [ "$PROJ_SRC" != "$DEST" ]; then
  say "拷贝项目 → $DEST（排除 node_modules / .DS_Store / 调试脚本）..."
  mkdir -p "$HOME/.dsh"
  rsync -a --delete \
    --exclude node_modules \
    --exclude .pnpm-store \
    --exclude .DS_Store \
    --exclude 'repro-*.mjs' \
    "$PROJ_SRC/" "$DEST/"
  say "项目已部署到 $DEST"
else
  say "项目已在 $DEST，跳过拷贝"
fi
cd "$DEST"

# ---------- 2. 还原 profile 配置 ----------
say "还原 profile 配置 → $PROFILE_DST"
mkdir -p "$PROFILE_DST"
cp -f "$PROFILE_SRC/"package.json "$PROFILE_SRC/"cordis.yml \
      "$PROFILE_SRC/"cordis.patch.yml "$PROFILE_SRC/"pnpm-lock.yaml \
      "$PROFILE_SRC/"pnpm-workspace.yaml "$PROFILE_DST/" 2>/dev/null \
  || cp -f "$PROFILE_SRC"/* "$PROFILE_DST/"
say "profile 配置已就位（$PROFILE_DST）"

# ---------- 3. 安装 profile 依赖 ----------
say "pnpm install（profile 依赖，需要联网；首次较慢）..."
( cd "$PROFILE_DST" && "${PNPM_CMD[@]}" install )

# ---------- 4. 换成指向本地项目的符号链接 ----------
say "dsh-better-sidebar → 本地项目符号链接"
rm -rf "$PROFILE_DST/node_modules/dsh-better-sidebar"
ln -s ../../../UI功能改动/dsh-better-sidebar "$PROFILE_DST/node_modules/dsh-better-sidebar"
[ -L "$PROFILE_DST/node_modules/dsh-better-sidebar" ] \
  || die "符号链接创建失败：$PROFILE_DST/node_modules/dsh-better-sidebar"

# ---------- 5. 构建 dsh-better-sidebar ----------
say "构建 dsh-better-sidebar ..."
( cd "$DEST/dsh-better-sidebar" && "${PNPM_CMD[@]}" install && "${PNPM_CMD[@]}" build )

# ---------- 6. 布局补丁 + 主插件部署 ----------
say "应用布局补丁 + 部署主 UI 插件（dsh-ui.sh apply --no-restart）..."
"$DEST/dsh-ui.sh" apply --no-restart

# ---------- 7. 重启 DeepSeek Harness ----------
if [ "${DSH_NO_RESTART:-0}" != "1" ]; then
  if osascript -e 'application "DeepSeek Harness" is running' 2>/dev/null | grep -qi true; then
    say "重启 DeepSeek Harness ..."
    osascript -e 'quit app "DeepSeek Harness"' >/dev/null 2>&1 || true
    sleep 2
  fi
  open "$APP_BUNDLE" 2>/dev/null || warn "未能自动打开 DeepSeek Harness，请手动打开"
else
  warn "已跳过应用重启（DSH_NO_RESTART=1），请手动重启 DeepSeek Harness"
fi

say ""
say "=============================================================="
say " 迁移完成！"
say "  1) 打开 DeepSeek Harness 应用"
say "  2) 浏览器打开 GUI（默认 http://127.0.0.1:59767）"
say "  3) 按 Cmd+Shift+R 硬刷新一次"
say "  4) 如有疑问：./dsh-ui.sh status 查看部署状态"
say "=============================================================="
