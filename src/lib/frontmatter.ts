// 前端 frontmatter 解析(与后端逻辑一致,用于实时预览)
import type { SkillMeta, SkillStatus } from '../types'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function parseFrontmatter(raw: string): {
  meta: SkillMeta
  body: string
} {
  const match = raw.match(FRONTMATTER_RE)
  const meta: Record<string, string> = {}
  let body = raw
  if (match) {
    body = raw.slice(match[0].length)
    for (const line of match[1].split(/\r?\n/)) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      const key = line.slice(0, idx).trim()
      let value = line.slice(idx + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (key) meta[key] = value
    }
  }
  const skillMeta: SkillMeta = {
    name: meta.name || '',
    description: meta.description || '',
    version: meta.version || '0.0.0',
    category: meta.category || '未分类',
    status: (meta.status as SkillStatus) || 'draft',
    updatedAt: meta.updatedAt || '',
  }
  return { meta: skillMeta, body }
}

/** 生成新建技能的模板内容 */
export function newSkillTemplate(name = ''): string {
  const today = new Date().toISOString().slice(0, 10)
  const skillName = name || 'my-skill'
  return `---
name: ${skillName}
description: 在此描述技能的作用
version: 0.1.0
category: 未分类
status: draft
updatedAt: ${today}
---

# ${skillName}

简述该技能的使用场景与目标。

## 使用说明

1. 第一步
2. 第二步
3. 第三步

## 示例

\`\`\`text
示例输出
\`\`\`
`
}
