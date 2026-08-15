#!/usr/bin/env bash
#
# dsh-ui.sh — DeepSeek Harness UI 一键维护脚本
#
# 用法:
#   ./dsh-ui.sh apply          # 打布局补丁 + 重装插件 + 重启 GUI（默认）
#   ./dsh-ui.sh apply --no-restart
#   ./dsh-ui.sh watch          # 监听本目录改动，自动 apply（Ctrl+C 退出）
#   ./dsh-ui.sh restore        # 完全还原 + 重启 GUI
#   ./dsh-ui.sh restore --no-restart
#   ./dsh-ui.sh status         # 查看当前状态
#
# 之后想再调 UI，只改两个地方即可（脚本会把它们同步到正确位置）：
#   1) 布局改动  -> 编辑 apply-patches.py（加/改一个 repl(...) 条目）
#   2) 面板/浮窗 -> 编辑 lib/client.js
# 改完跑 ./dsh-ui.sh apply 就生效。每个 repl 条目都是幂等的（已应用则跳过），
# 所以新旧改动可以放心叠加；若某次软件更新改了布局导致锚点失效，脚本会在
# 结尾报 FAIL，提示你检查对应条目，而不会悄悄坏掉。
set -euo pipefail

# ---------- 路径 ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_BUNDLE="${DSH_APP_BUNDLE:-/Applications/DeepSeek Harness.app}"
HARNESS="$APP_BUNDLE/Contents/Resources/harness"
LAYOUT="$HARNESS/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js"
PROFILE="$HOME/.dsh/profiles/web"
PLUGIN_DST="$HOME/.dsh/profiles/node_modules/@local/dsh-client-ui-preview"
PATCH_YML="$PROFILE/cordis.patch.yml"
GUI_PORT="${DSH_GUI_PORT:-60901}"
GUI_LOG="$HOME/.dsh/gui-server.log"

# ---------- node 探测 ----------
find_node() {
  local f
  for f in "$APP_BUNDLE"/Contents/Resources/runtime/*/bin/node; do
    [ -x "$f" ] && { echo "$f"; return 0; }
  done
  for f in "$HOME"/.nvm/versions/node/*/bin/node; do
    [ -x "$f" ] && { echo "$f"; return 0; }
  done
  command -v node 2>/dev/null || true
}
NODE="${DSH_NODE:-$(find_node)}"

say()  { printf '\033[1;36m[dsh-ui]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[dsh-ui]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[dsh-ui]\033[0m %s\n' "$*" >&2; exit 1; }

# ---------- GUI 服务器 ----------
gui_pid() { lsof -tiTCP:"$GUI_PORT" -sTCP:LISTEN 2>/dev/null || true; }

wait_gui() {
  local i
  for i in $(seq 1 30); do
    if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$GUI_PORT/"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

restart_gui() {
  say "重启 GUI 服务器 (端口 $GUI_PORT) ..."
  local pid
  pid="$(gui_pid)"
  if [ -n "$pid" ]; then
    kill $pid 2>/dev/null || true
    sleep 1
  fi
  if [ -z "$NODE" ] || [ ! -x "$NODE" ]; then die "找不到可用的 node"; fi
  nohup "$NODE" "$HARNESS/lib/bin.js" web --port "$GUI_PORT" > "$GUI_LOG" 2>&1 &
  if wait_gui; then
    say "GUI 已就绪: http://127.0.0.1:$GUI_PORT/  (日志: $GUI_LOG)"
  else
    warn "GUI 未在预期时间内就绪，请查看日志: $GUI_LOG"
  fi
}

# ---------- 插件同步 ----------
sync_plugin() {
  say "同步预览插件到 $PLUGIN_DST ..."
  mkdir -p "$PLUGIN_DST/lib"
  cp -f "$SCRIPT_DIR/package.json" "$PLUGIN_DST/package.json"
  cp -f "$SCRIPT_DIR/lib/index.js" "$PLUGIN_DST/lib/index.js"
  cp -f "$SCRIPT_DIR/lib/client.js" "$PLUGIN_DST/lib/client.js"
}

ensure_plugin_entry() {
  say "确保插件条目存在于 $PATCH_YML ..."
  if grep -q "dsh-client-ui-preview" "$PATCH_YML" 2>/dev/null; then
    say "  已存在，跳过"
    return 0
  fi
  local block
  block=$(cat <<'EOF'
- insert:
    - id: dsh-client-ui-preview
      name: '@local/dsh-client-ui-preview'
EOF
)
  if grep -qx "\[\]" "$PATCH_YML" 2>/dev/null; then
    printf '%s\n' "$block" > "$PATCH_YML"
  else
    printf '\n%s\n' "$block" >> "$PATCH_YML"
  fi
  say "  已写入"
}

remove_plugin_entry() {
  say "移除插件条目 ..."
  [ -f "$PATCH_YML" ] || return 0
  python3 - "$PATCH_YML" <<'PY'
import sys
p = sys.argv[1]
lines = open(p, encoding="utf-8").read().splitlines(keepends=True)
out = []
i = 0
while i < len(lines):
    line = lines[i]
    if line.rstrip("\n").strip() == "- insert:":
        j = i + 1
        block = [line]
        while j < len(lines) and (lines[j].startswith((" ", "\t"))):
            block.append(lines[j]); j += 1
        if any("dsh-client-ui-preview" in b for b in block):
            i = j
            continue
        out.extend(block); i = j
        continue
    out.append(line); i += 1
open(p, "w", encoding="utf-8").write("".join(out))
PY
  say "  已移除"
}

# ---------- 布局补丁 ----------
apply_layout() {
  say "应用布局补丁 ..."
  python3 "$SCRIPT_DIR/apply-patches.py" "$LAYOUT"
}

restore_layout() {
  say "恢复布局 ..."
  if [ -f "$LAYOUT.dshpv.orig" ]; then
    cp -f "$LAYOUT.dshpv.orig" "$LAYOUT"
  elif [ -f "$LAYOUT.dshpv.bak" ]; then
    cp -f "$LAYOUT.dshpv.bak" "$LAYOUT"
  elif [ -f "$LAYOUT.dshpv2.bak" ]; then
    cp -f "$LAYOUT.dshpv2.bak" "$LAYOUT"
  else
    warn "未找到布局备份，跳过（可能本来就未被修改）"
  fi
}

# ---------- 子命令 ----------
cmd_apply() {
  [ ! -f "$LAYOUT" ] && die "找不到布局文件: $LAYOUT（应用路径是否变了？用 DSH_APP_BUNDLE 指定）"
  apply_layout
  sync_plugin
  ensure_plugin_entry
  if [ "${1:-}" != "--no-restart" ]; then restart_gui; fi
  say "完成。刷新 GUI 窗口即可看到效果。"
}

# 对源目录做一次快照（文件名+内容，稳定排序），用于 watch 检测改动。
snapshot() {
  ( cd "$SCRIPT_DIR" && find . -type f -not -path './.git/*' | sort | while IFS= read -r f; do
      printf '%s\n' "$f"
      cat "$f" 2>/dev/null
    done | md5 -q )
}

cmd_watch() {
  say "监听本目录源文件，改动即自动 apply（Ctrl+C 退出）..."
  local last="" cur=""
  while true; do
    cur="$(snapshot)"
    if [ -n "$last" ] && [ "$cur" != "$last" ]; then
      say "检测到改动 → 自动 apply ..."
      apply_layout
      sync_plugin
      ensure_plugin_entry
      restart_gui
      say "已自动应用。刷新 GUI 窗口查看效果。继续监听中..."
    fi
    last="$cur"
    sleep 2
  done
}

cmd_restore() {
  restore_layout
  remove_plugin_entry
  rm -rf "$PLUGIN_DST"
  if [ "${1:-}" != "--no-restart" ]; then restart_gui; fi
  say "已还原。刷新 GUI 窗口。"
}

cmd_status() {
  echo "布局补丁: $([ -f "$LAYOUT" ] && grep -q 'clampWidth(preview, 280, 1200)' "$LAYOUT" && echo '已应用 ✓' || echo '未应用 ✗')"
  echo "预览插件: $([ -f "$PLUGIN_DST/lib/client.js" ] && echo '已安装 ✓' || echo '未安装 ✗')"
  echo "插件条目: $(grep -q 'dsh-client-ui-preview' "$PATCH_YML" 2>/dev/null && echo '已注册 ✓' || echo '未注册 ✗')"
  echo "GUI 服务器: $( [ -n "$(gui_pid)" ] && echo "运行中 ✓ (http://127.0.0.1:$GUI_PORT)" || echo '未运行 ✗')"
  echo "布局文件: $LAYOUT"
  echo "插件目录: $PLUGIN_DST"
}

case "${1:-status}" in
  apply)   cmd_apply "${2:-}" ;;
  watch)   cmd_watch ;;
  restore) cmd_restore "${2:-}" ;;
  status)  cmd_status ;;
  *)       echo "用法: $0 {apply|restore|watch|status} [--no-restart]"; exit 1 ;;
esac
