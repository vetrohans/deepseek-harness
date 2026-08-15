#!/usr/bin/env node
/**
 * remap-css-hashes.mjs — 上游 DSH 更新后，一键把 UI 微调插件里的 CSS-module
 * 哈希类名重映射到新构建（免浏览器、免手工）。
 *
 * 背景：CSS-module 的哈希类名（如 _4PgkvG_primary）随构建内容变化；上游更新后
 * 插件 CSS 里的旧类名会失效。本脚本用与构建相同的 lightningcss 算法
 * （pattern '[hash]_[local]'，filename=绝对路径）重算所有源码 CSS module 的
 * local->哈希 映射，再把插件里的旧 `前缀_local` 按"同模块多 local 命中"自动
 * 匹配到新前缀并替换。
 *
 * 用法（上游更新并 pnpm run build 之后）：
 *   node ui-overrides/scripts/remap-css-hashes.mjs            # 处理两个插件副本
 *   node ui-overrides/scripts/remap-css-hashes.mjs --dry-run  # 只预览不写
 *   node ui-overrides/scripts/remap-css-hashes.mjs --plugin <路径>  # 只处理指定文件
 *
 * 自动映射之外，可用下面的 MANUAL_MAP / DROP_PREFIXES 处理低置信/语义特例。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { transform } = require('lightningcss')

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..') // repo root (ui-overrides/scripts -> root)

// ---------------------------------------------------------------------------
// 1) 手动覆盖（低置信/语义特例）—— 优先于自动匹配
//    旧前缀 -> 新前缀；DROP_PREFIXES 里的前缀整组删除（旧版本专属、rc.5 已不存在）
// ---------------------------------------------------------------------------
const MANUAL_MAP = {
  // 语义特例：旧 ZK0AtW 是 Bash 工具行；rc.5 里是 ToolRow（_206-Pq，且 body 改名为 bodyWrap）
  ZK0AtW: { prefix: '_206-Pq', localMap: { body: 'bodyWrap' } },
  // 低置信 1/1 命中，按语义固定
  _7InkJa: { prefix: '_9tLbjq' }, // QueueDock.count
  _8BRaxW: { prefix: 'JjU0sa' },  // ContextMeter.trigger
}
const DROP_PREFIXES = ['xRnBFa'] // rc.5 无对应元素，整体删除

// ---------------------------------------------------------------------------
// 2) 扫描源码里所有 *.module.css，用 lightningcss 重算 local->哈希
// ---------------------------------------------------------------------------
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'lib' || entry.name === 'dist') continue
    const p = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(p)
    else if (entry.name.endsWith('.module.css')) yield p
  }
}

/** local name -> Set(hashed names)（同名 local 可能出现在多个 module） */
function buildClassRegistry() {
  const registry = new Map() // local -> Map(prefix -> {count, mods:Set})
  const srcRoot = join(ROOT, 'packages')
  for (const file of walk(srcRoot)) {
    if (file.includes(`${sep}plugins${sep}`)) continue // 只扫框架模块，不含我们自己的插件
    const code = readFileSync(file)
    let out
    try {
      out = transform({ filename: file, code, cssModules: { pattern: '[hash]_[local]' }, minify: true })
    } catch { continue }
    for (const [local, exp] of Object.entries(out.exports ?? {})) {
      const name = exp.name
      const i = name.lastIndexOf('_')
      const prefix = name.slice(0, i)
      if (!registry.has(local)) registry.set(local, new Map())
      const byPrefix = registry.get(local)
      if (!byPrefix.has(prefix)) byPrefix.set(prefix, { count: 0, mods: new Set() })
      byPrefix.get(prefix).count += 1
      byPrefix.get(prefix).mods.add(relative(ROOT, file))
    }
  }
  return registry
}

// ---------------------------------------------------------------------------
// 3) 从插件 CSS 提取旧类名，按前缀分组
// ---------------------------------------------------------------------------
function extractOldClasses(src) {
  // 只从双引号字符串字面量里取（CSS 常量），避免 JS 代码里的 .prop 假阳性
  const cssTexts = []
  for (const m of src.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    cssTexts.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'))
  }
  const css = cssTexts.join('\n')
  const byPrefix = new Map() // prefix -> Set(locals)
  for (const m of css.matchAll(/\.([A-Za-z0-9_-]+)_([A-Za-z][A-Za-z0-9_-]*)/g)) {
    const prefix = m[1], local = m[2]
    if (/^(dshqn|dshpv|vY0v1a|f7MvrG)/.test(prefix)) continue // 自带作用域
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, new Set())
    byPrefix.get(prefix).add(local)
  }
  return byPrefix
}

// ---------------------------------------------------------------------------
// 4) 主流程
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const pluginArg = args.findIndex(a => a === '--plugin')
const defaultTargets = [
  join(ROOT, 'ui-overrides/lib/client.js'),
  join(ROOT, 'packages/plugins/dsh-client-ui-preview/lib/client.js'),
]
const targets = pluginArg !== -1 ? [resolve(args[pluginArg + 1])] : defaultTargets

console.log(`[remap] root=${ROOT} dry-run=${dryRun}`)
const registry = buildClassRegistry()
console.log(`[remap] 扫描到 CSS module local 映射: ${registry.size} 个 local 名`)

let totalReplaced = 0
for (const target of targets) {
  if (!existsSync(target)) { console.log(`[remap] 跳过（不存在）: ${target}`); continue }
  const src = readFileSync(target, 'utf8')
  const oldByPrefix = extractOldClasses(src)
  const replacements = [] // [oldClass, newClass]
  const dropped = []
  const unmatched = []

  for (const [prefix, locals] of oldByPrefix) {
    if (DROP_PREFIXES.includes(prefix)) { dropped.push(prefix); continue }
    const manual = MANUAL_MAP[prefix]
    const newPrefix = manual !== undefined
      ? manual.prefix
      : (() => {
          // 自动：找覆盖最多 locals 的新前缀（同模块优先）
          const cand = new Map() // prefix -> {score, mods}
          for (const local of locals) {
            const byPrefix = registry.get(local)
            if (!byPrefix) continue
            for (const [p, info] of byPrefix) {
              if (!cand.has(p)) cand.set(p, { score: 0, mods: new Set() })
              cand.get(p).score += 1
              for (const mod of info.mods) cand.get(p).mods.add(mod)
            }
          }
          const sorted = [...cand.entries()].sort((a, b) => b[1].score - a[1].score)
          // 幂等：当前前缀仍能覆盖这些 local 时优先保留（新构建里它依然有效）
          const current = sorted.find(([p]) => p === prefix)
          const best = current !== undefined ? current : sorted[0]
          return best && best[1].score > 0 ? best[0] : undefined
        })()

    if (newPrefix === undefined) { unmatched.push(prefix); continue }
    for (const local of locals) {
      const targetLocal = manual?.localMap?.[local] ?? local
      // 手动映射时校验新前缀里确实有该 local（防呆），没有则提示
      const exists = registry.get(targetLocal)?.has(newPrefix) ?? false
      if (manual !== undefined && !exists) {
        console.log(`[remap]  ⚠ 手动映射 ${prefix}_${local} -> ${newPrefix}_${targetLocal}（新构建中未见，请人工确认）`)
      }
      replacements.push([`${prefix}_${local}`, `${newPrefix}_${targetLocal}`])
    }
  }

  // 应用替换（先长后短避免前缀重叠误伤）
  let out = src
  for (const [old, next] of replacements.sort((a, b) => b[0].length - a[0].length)) {
    out = out.split(`.${old}`).join(`.${next}`)
  }
  // 删除 drop 前缀的选择器（.P_xxx 整段）；prefix 需转义，不能进字符类
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const prefix of dropped) {
    out = out.replace(new RegExp(`\\.${esc(prefix)}_[A-Za-z0-9_-]*\\{[^}]*\\}`, 'g'), '')
  }

  const n = replacements.length
  totalReplaced += n
  console.log(`\n[remap] ${relative(ROOT, target)}: 映射 ${n} 个类名, 删除 ${dropped.length} 个前缀, 未匹配 ${unmatched.length} 个`)
  for (const [old, next] of replacements) console.log(`  .${old} -> .${next}`)
  for (const p of unmatched) console.log(`  ? 未匹配前缀: ${p}`)

  if (out === src) { console.log('[remap] 无变化'); continue }
  if (dryRun) { console.log('[remap] --dry-run，未写入'); continue }
  writeFileSync(target, out)
  console.log('[remap] 已写入 ✅（上游更新后记得重启 dsh web 并 Cmd+Shift+R 硬刷新）')
}
console.log(`\n[remap] 完成，共映射 ${totalReplaced} 个类名`)
