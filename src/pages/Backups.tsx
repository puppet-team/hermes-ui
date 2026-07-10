import { useEffect, useRef, useState } from 'react'
import {
  Archive,
  Download,
  Upload,
  FileText,
  HardDrive,
  RefreshCw,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import { backupsApi, skillsApi } from '../api/skills'
import type { BackupItem } from '../types'
import { Card, SectionTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'

export function Backups() {
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const { confirm } = useConfirm()

  const load = async () => {
    setLoading(true)
    try {
      setBackups(await backupsApi.list())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalSize = backups.reduce((s, b) => s + b.size, 0)
  const skillCount = new Set(backups.map((b) => b.skillId)).size

  const handleExportAll = () => {
    window.open(backupsApi.exportAllUrl(), '_blank')
    toast.success('开始下载全部备份')
  }

  const handleImportClick = () => fileRef.current?.click()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      let parsed: Record<string, string> = {}
      if (file.name.endsWith('.json')) {
        parsed = JSON.parse(text)
      } else if (file.name.endsWith('.md')) {
        // 单个技能文件:用 frontmatter 的 name 作 id
        const nameMatch = text.match(/^name:\s*(.+)$/m)
        const id = (nameMatch?.[1] || file.name.replace(/_SKILL\.md$|\.md$/i, '')).trim()
        parsed[id] = text
      } else {
        throw new Error('仅支持 .json 或 .md 文件')
      }
      const ids = Object.keys(parsed)
      let count = 0
      for (const id of ids) {
        await skillsApi.importSkill(id, parsed[id])
        count++
      }
      toast.success(`已导入 ${count} 个技能`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRestore = async (b: BackupItem) => {
    const ok = await confirm({
      title: `恢复「${b.skillName}」v${b.version}?`,
      description: '将用该快照覆盖当前技能内容。',
      confirmText: '恢复',
    })
    if (!ok) return
    try {
      const content = await skillsApi.getVersionContent(b.skillId, b.filename)
      await skillsApi.save(b.skillId, content)
      toast.success('已恢复')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '恢复失败')
    }
  }

  const handleDeleteBackup = async (b: BackupItem) => {
    const ok = await confirm({
      title: '删除该快照?',
      description: b.filename,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await skillsApi.deleteVersion(b.skillId, b.filename)
      toast.success('已删除')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            备份中心
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            导入导出技能 · 管理版本快照
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            loading={importing}
            icon={<Upload className="w-4 h-4" />}
          >
            导入
          </Button>
          <Button
            size="sm"
            onClick={handleExportAll}
            icon={<Download className="w-4 h-4" />}
          >
            导出全部
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.md"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={<Archive className="w-5 h-5" />}
          label="快照总数"
          value={String(backups.length)}
          tone="amber"
        />
        <StatTile
          icon={<FileText className="w-5 h-5" />}
          label="涉及技能"
          value={String(skillCount)}
          tone="blue"
        />
        <StatTile
          icon={<HardDrive className="w-5 h-5" />}
          label="占用空间"
          value={formatSize(totalSize)}
          tone="green"
        />
      </div>

      {/* 备份列表 */}
      <Card padded={false}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <SectionTitle
            title="版本快照"
            subtitle="所有技能的历史版本,可恢复或删除"
            icon={<Archive className="w-4 h-4" />}
          />
        </div>
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : backups.length === 0 ? (
          <EmptyState
            icon={<Archive className="w-7 h-7" />}
            title="暂无备份"
            description="发布技能版本时会自动创建快照备份"
          />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left font-medium px-4 py-3">技能</th>
                  <th className="text-left font-medium px-4 py-3">版本</th>
                  <th className="text-left font-medium px-4 py-3">快照时间</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">
                    大小
                  </th>
                  <th className="text-right font-medium px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {backups.map((b) => (
                  <tr
                    key={`${b.skillId}/${b.filename}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {b.skillName}
                      </span>
                      <span className="text-xs text-slate-400 ml-2 font-mono">
                        {b.skillId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="amber">v{b.version}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">
                      {formatSize(b.size)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => handleRestore(b)}
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        恢复
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:text-red-500"
                        onClick={() => handleDeleteBackup(b)}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        aria-label="删除"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'amber' | 'blue' | 'green'
}) {
  const tones = {
    amber: 'text-hermes-600 dark:text-hermes-400 bg-hermes-50 dark:bg-hermes-900/30',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30',
  }
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {value}
          </p>
        </div>
      </div>
    </Card>
  )
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
