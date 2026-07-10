// 简单的 YAML frontmatter 解析(不依赖外部库,只支持扁平 key: value)
// SKILL.md 格式:
// ---
// name: xxx
// description: xxx
// version: 1.0.0
// ---
// 正文 markdown

import { parse as parseYaml } from 'yaml'

export interface ParsedSkill {
  meta: Record<string, string>
  body: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/** 扁平解析(向后兼容,仅 key: value) */
export function parseSkillFile(raw: string): ParsedSkill {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) {
    return { meta: {}, body: raw }
  }
  const metaBlock = match[1]
  const body = raw.slice(match[0].length)
  const meta: Record<string, string> = {}
  for (const line of metaBlock.split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    // 去掉引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) meta[key] = value
  }
  return { meta, body }
}

/**
 * 完整 YAML 解析(支持嵌套,如 hermes-agent 的 metadata.version)。
 * 返回扁平化后的 meta:把 metadata.version 展平为 version 等。
 */
export function parseSkillFileRich(raw: string): ParsedSkill {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) {
    return { meta: {}, body: raw }
  }
  const metaBlock = match[1]
  const body = raw.slice(match[0].length)
  const meta: Record<string, string> = {}
  try {
    const parsed = parseYaml(metaBlock) as Record<string, unknown>
    // 扁平化:顶层 key 直接取值;嵌套 metadata.* 提升到顶层
    for (const [key, value] of Object.entries(parsed)) {
      if (value === null || value === undefined) continue
      if (typeof value === 'string' || typeof value === 'number') {
        meta[key] = String(value)
      } else if (typeof value === 'object') {
        // 嵌套对象(如 metadata:{version,tags}),把子字段提升
        const nested = value as Record<string, unknown>
        for (const [subKey, subVal] of Object.entries(nested)) {
          if (subVal !== null && subVal !== undefined) {
            meta[subKey] = String(subVal)
          }
        }
      }
    }
  } catch {
    // YAML 解析失败,回退到扁平解析
    return parseSkillFile(raw)
  }
  return { meta, body }
}

export function stringifySkillFile(meta: Record<string, string>, body: string): string {
  const order = ['name', 'description', 'version', 'category', 'status', 'updatedAt']
  const knownKeys = new Set(order)
  const lines: string[] = ['---']
  for (const key of order) {
    if (meta[key] !== undefined) {
      lines.push(`${key}: ${formatValue(meta[key])}`)
    }
  }
  // 额外字段
  for (const [key, value] of Object.entries(meta)) {
    if (!knownKeys.has(key)) {
      lines.push(`${key}: ${formatValue(value)}`)
    }
  }
  lines.push('---', '')
  return lines.join('\n') + body
}

function formatValue(value: string): string {
  // 含特殊字符时加引号
  if (/[:#\-?{}[\],&*!|>'"%@`]/.test(value) || value.includes('\n')) {
    return `"${value.replace(/"/g, '\\"')}"`
  }
  return value
}
