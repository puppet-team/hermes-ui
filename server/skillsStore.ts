import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseSkillFileRich, stringifySkillFile } from './frontmatter.ts'
import { getSkillsDir } from './hermesAgent.ts'
import type {
  SkillSummary,
  SkillDetail,
  SkillVersion,
  BackupItem,
  SkillStatus,
} from '../src/types/index.ts'

// 技能根目录:指向真实 hermes-agent 的 ~/.hermes/skills
// (沿用 hermesAgent 的 HERMES_HOME 解析,支持 HERMES_HOME 环境变量)
const SKILLS_ROOT = getSkillsDir()

const VERSIONS_DIR = '.versions'
const SKILL_FILE = 'SKILL.md'

/** 确保技能目录存在(不写入任何示例数据) */
export async function ensureSeed(): Promise<void> {
  await fs.mkdir(SKILLS_ROOT, { recursive: true })
}

export function getRoot(): string {
  return SKILLS_ROOT
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function isSkillDir(name: string): boolean {
  return !name.startsWith('.') && !name.startsWith('_')
}

/** 递归查找所有 SKILL.md(支持 messaging/feishu-file-sender/SKILL.md 这种子目录结构) */
async function findSkillFiles(
  dir: string,
  base: string,
  results: { id: string; path: string }[] = [],
): Promise<{ id: string; path: string }[]> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }
  // 优先:当前目录直接有 SKILL.md,则这是一个技能目录,不再下钻
  const hasSkillMd = entries.some(
    (e) => e.isFile() && e.name === SKILL_FILE,
  )
  if (hasSkillMd) {
    const rel = path.relative(base, dir)
    results.push({ id: rel, path: path.join(dir, SKILL_FILE) })
    return results
  }
  // 否则递归子目录(跳过隐藏目录如 .hub、.curator)
  for (const entry of entries) {
    if (!entry.isDirectory() || !isSkillDir(entry.name)) continue
    await findSkillFiles(path.join(dir, entry.name), base, results)
  }
  return results
}

/** 列出所有技能(摘要) */
export async function listSkills(): Promise<SkillSummary[]> {
  await ensureSeed()
  const files = await findSkillFiles(SKILLS_ROOT, SKILLS_ROOT)
  const summaries: SkillSummary[] = []
  for (const { id, path: fp } of files) {
    try {
      const raw = await fs.readFile(fp, 'utf-8')
      const { meta } = parseSkillFileRich(raw)
      const stat = await fs.stat(fp)
      // category:优先 frontmatter,否则用 id 的第一段(如 messaging)
      const category =
        meta.category || (id.includes('/') ? id.split('/')[0] : '未分类')
      summaries.push({
        id,
        name: meta.name || id.split('/').pop() || id,
        description: meta.description || '',
        version: meta.version || '0.0.0',
        category,
        status: (meta.status as SkillStatus) || 'active',
        updatedAt: meta.updatedAt || stat.mtime.toISOString().slice(0, 10),
      })
    } catch {
      // 读取失败跳过
    }
  }
  return summaries.sort((a, b) => a.name.localeCompare(b.name))
}

/** 读取单个技能完整内容 */
export async function getSkill(id: string): Promise<SkillDetail | null> {
  // id 可能是 "messaging/feishu-file-sender" 这种子目录路径
  const skillFile = path.join(SKILLS_ROOT, id, SKILL_FILE)
  const raw = await fs.readFile(skillFile, 'utf-8')
  const { meta, body } = parseSkillFileRich(raw)
  const stat = await fs.stat(skillFile)
  const category =
    meta.category || (id.includes('/') ? id.split('/')[0] : '未分类')
  return {
    id,
    name: meta.name || id.split('/').pop() || id,
    description: meta.description || '',
    version: meta.version || '0.0.0',
    category,
    status: (meta.status as SkillStatus) || 'active',
    updatedAt: meta.updatedAt || stat.mtime.toISOString().slice(0, 10),
    content: raw,
    rawMeta: meta,
    body,
  } as SkillDetail & { body: string }
}

/** 保存技能内容(新建或更新)。id 为空时由 name 生成目录名 */
export async function saveSkill(
  id: string | undefined,
  content: string,
): Promise<{ id: string; created: boolean }> {
  const { meta, body } = parseSkillFileRich(content)
  const name = meta.name || id || `skill-${Date.now()}`
  const targetId = id || sanitize(name)
  const dir = path.join(SKILLS_ROOT, targetId)
  await fs.mkdir(dir, { recursive: true })
  // 更新 updatedAt
  const finalMeta = { ...meta, name, updatedAt: meta.updatedAt || today() }
  const finalContent = stringifySkillFile(finalMeta, body)
  const skillFile = path.join(dir, SKILL_FILE)
  let created = true
  try {
    await fs.access(skillFile)
    created = false
  } catch {
    // 不存在 => 新建
  }
  await fs.writeFile(skillFile, finalContent, 'utf-8')
  return { id: targetId, created }
}

/** 删除技能(含版本目录) */
export async function deleteSkill(id: string): Promise<void> {
  const dir = path.join(SKILLS_ROOT, id)
  await fs.rm(dir, { recursive: true, force: true })
}

/** 读取版本历史 */
export async function listVersions(id: string): Promise<SkillVersion[]> {
  const vDir = path.join(SKILLS_ROOT, id, VERSIONS_DIR)
  try {
    await fs.access(vDir)
  } catch {
    return []
  }
  const files = await fs.readdir(vDir)
  const versions: SkillVersion[] = []
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const fp = path.join(vDir, file)
    const stat = await fs.stat(fp)
    // 文件名格式: {id}_v{version}_{timestamp}.md
    const parsed = parseVersionFilename(file)
    versions.push({
      id: file.replace(/\.md$/, ''),
      skillId: id,
      version: parsed.version,
      filename: file,
      createdAt: parsed.timestamp || stat.mtime.toISOString(),
      size: stat.size,
    })
  }
  return versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function parseVersionFilename(
  file: string,
): { version: string; timestamp: string } {
  // {id}_v1.2.0_20260709T101530.md
  const m = file.match(/_v([0-9.]+)_([^_]+)\.md$/)
  if (m) {
    const ts = m[2]
    // 尝试把 20260709T101530 转成 ISO
    const iso = formatTimestamp(ts)
    return { version: m[1], timestamp: iso || ts }
  }
  return { version: '0.0.0', timestamp: '' }
}

function formatTimestamp(ts: string): string | null {
  const m = ts.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?$/)
  if (!m) return null
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = m
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`
}

function tsNow(): string {
  const d = new Date()
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return (
    `${p(d.getFullYear(), 4)}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  )
}

/** 发布新版本:将当前内容写入快照,并更新主文件 version */
export async function publishVersion(
  id: string,
  version: string,
  content: string,
  snapshot = true,
): Promise<SkillVersion | null> {
  const dir = path.join(SKILLS_ROOT, id)
  const skillFile = path.join(dir, SKILL_FILE)
  const { meta, body } = parseSkillFileRich(content)
  const newMeta = { ...meta, version, updatedAt: today() }
  const newContent = stringifySkillFile(newMeta, body)

  let snapshotResult: SkillVersion | null = null
  if (snapshot) {
    const vDir = path.join(dir, VERSIONS_DIR)
    await fs.mkdir(vDir, { recursive: true })
    const filename = `${id}_v${version}_${tsNow()}.md`
    const snapPath = path.join(vDir, filename)
    await fs.writeFile(snapPath, content, 'utf-8')
    const stat = await fs.stat(snapPath)
    snapshotResult = {
      id: filename.replace(/\.md$/, ''),
      skillId: id,
      version,
      filename,
      createdAt: new Date().toISOString(),
      size: stat.size,
    }
  }
  // 更新主文件为新版本内容
  await fs.writeFile(skillFile, newContent, 'utf-8')
  return snapshotResult
}

/** 回滚到指定版本快照 */
export async function rollbackTo(
  id: string,
  filename: string,
): Promise<void> {
  const snapPath = path.join(SKILLS_ROOT, id, VERSIONS_DIR, filename)
  const snapRaw = await fs.readFile(snapPath, 'utf-8')
  const { meta, body } = parseSkillFileRich(snapRaw)
  // 回滚时保留原 version 标记,更新 updatedAt
  const rolledMeta = { ...meta, updatedAt: today() }
  const finalContent = stringifySkillFile(rolledMeta, body)
  await fs.writeFile(path.join(SKILLS_ROOT, id, SKILL_FILE), finalContent, 'utf-8')
}

/** 删除某个版本快照 */
export async function deleteVersion(
  id: string,
  filename: string,
): Promise<void> {
  const snapPath = path.join(SKILLS_ROOT, id, VERSIONS_DIR, filename)
  await fs.rm(snapPath, { force: true })
}

/** 读取版本快照内容 */
export async function getVersionContent(
  id: string,
  filename: string,
): Promise<string> {
  const snapPath = path.join(SKILLS_ROOT, id, VERSIONS_DIR, filename)
  return fs.readFile(snapPath, 'utf-8')
}

/** 列出所有备份(所有技能的版本快照汇总) */
export async function listBackups(): Promise<BackupItem[]> {
  await ensureSeed()
  const entries = await fs.readdir(SKILLS_ROOT, { withFileTypes: true })
  const backups: BackupItem[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !isSkillDir(entry.name)) continue
    const versions = await listVersions(entry.name)
    // 读取技能名
    let skillName = entry.name
    try {
      const raw = await fs.readFile(
        path.join(SKILLS_ROOT, entry.name, SKILL_FILE),
        'utf-8',
      )
      const { meta } = parseSkillFileRich(raw)
      skillName = meta.name || entry.name
    } catch {
      // ignore
    }
    for (const v of versions) {
      backups.push({
        skillId: entry.name,
        skillName,
        filename: v.filename,
        version: v.version,
        createdAt: v.createdAt,
        size: v.size,
      })
    }
  }
  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** 导出技能为单个 md 文件内容(返回字符串) */
export async function exportSkill(id: string): Promise<{
  filename: string
  content: string
}> {
  const skillFile = path.join(SKILLS_ROOT, id, SKILL_FILE)
  const content = await fs.readFile(skillFile, 'utf-8')
  return { filename: `${id}_SKILL.md`, content }
}

/** 导出全部技能为 JSON(简化:打包成单个 json) */
export async function exportAll(): Promise<{
  filename: string
  content: string
}> {
  const skills = await listSkills()
  const all: Record<string, string> = {}
  for (const s of skills) {
    try {
      const sf = path.join(SKILLS_ROOT, s.id, SKILL_FILE)
      all[s.id] = await fs.readFile(sf, 'utf-8')
    } catch {
      // skip
    }
  }
  return {
    filename: `hermes-skills-backup-${today()}.json`,
    content: JSON.stringify(all, null, 2),
  }
}

/** 导入技能(从 md 内容)。若 id 已存在则覆盖 */
export async function importSkill(
  id: string,
  content: string,
): Promise<{ id: string; created: boolean }> {
  return saveSkill(id, content)
}

function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `skill-${Date.now()}`
}
