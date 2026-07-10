import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Download,
  Trash2,
  History,
  GitBranch,
  RotateCcw,
  Eye,
  Tag,
  Clock,
  Folder,
} from 'lucide-react'
import { skillsApi } from '../api/skills'
import type { SkillDetail, SkillVersion } from '../types'
import { parseFrontmatter } from '../lib/frontmatter'
import { renderMarkdown } from '../lib/markdown'
import { Card, SectionTitle } from '../components/ui/Card'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PublishDialog } from '../components/skill/PublishDialog'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'

export function SkillDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [skill, setSkill] = useState<SkillDetail | null>(null)
  const [versions, setVersions] = useState<SkillVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [showPublish, setShowPublish] = useState(false)
  const [viewVersion, setViewVersion] = useState<SkillVersion | null>(null)
  const [versionContent, setVersionContent] = useState('')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [s, v] = await Promise.all([
        skillsApi.get(id),
        skillsApi.listVersions(id),
      ])
      setSkill(s)
      setVersions(v)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const { meta, body } = useMemo(
    () => (skill ? parseFrontmatter(skill.content) : { meta: null, body: '' }),
    [skill],
  )
  const html = useMemo(() => renderMarkdown(body), [body])

  const handleDelete = async () => {
    if (!skill) return
    const ok = await confirm({
      title: `删除技能「${skill.name}」?`,
      description: '将删除技能文件及所有版本快照,不可恢复。',
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await skillsApi.remove(skill.id)
      toast.success('已删除')
      navigate('/')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const handleExport = () => {
    if (!skill) return
    window.open(skillsApi.exportUrl(skill.id), '_blank')
    toast.success('开始下载')
  }

  const handleRollback = async (v: SkillVersion) => {
    const ok = await confirm({
      title: `回滚到版本 v${v.version}?`,
      description: '当前内容将被该版本快照覆盖(主文件 version 标记保留)。',
      confirmText: '回滚',
      danger: true,
    })
    if (!ok || !skill) return
    try {
      await skillsApi.rollback(skill.id, v.filename)
      toast.success('已回滚')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '回滚失败')
    }
  }

  const handleDeleteVersion = async (v: SkillVersion) => {
    if (!skill) return
    const ok = await confirm({
      title: '删除该版本快照?',
      description: v.filename,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await skillsApi.deleteVersion(skill.id, v.filename)
      toast.success('已删除快照')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const handleViewVersion = async (v: SkillVersion) => {
    if (!skill) return
    setViewVersion(v)
    setVersionContent('')
    try {
      const content = await skillsApi.getVersionContent(skill.id, v.filename)
      setVersionContent(content)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '读取失败')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 dark:bg-slate-900 rounded w-64" />
        <div className="h-32 bg-slate-100 dark:bg-slate-900 rounded-xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-xl" />
      </div>
    )
  }

  if (!skill || !meta) {
    return (
      <EmptyState
        icon={<Folder className="w-7 h-7" />}
        title="技能不存在"
        description="该技能可能已被删除"
        action={
          <Button size="sm" onClick={() => navigate('/')}>
            返回列表
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 页头 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            返回
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                {skill.name}
              </h1>
              <StatusBadge status={skill.status} />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
              {skill.id}/SKILL.md
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            icon={<Download className="w-4 h-4" />}
          >
            导出
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPublish(true)}
            icon={<GitBranch className="w-4 h-4" />}
          >
            发布版本
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/skills/${skill.id}/edit`)}
            icon={<Pencil className="w-4 h-4" />}
          >
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600"
            onClick={handleDelete}
            icon={<Trash2 className="w-4 h-4" />}
            aria-label="删除"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* 左侧:内容预览 */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <SectionTitle title="技能内容" subtitle="SKILL.md 渲染预览" />
            <div
              className="prose-skill max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </Card>
        </div>

        {/* 右侧:元数据 + 版本历史 */}
        <div className="space-y-5">
          {/* 元数据 */}
          <Card>
            <SectionTitle title="元数据" icon={<Tag className="w-4 h-4" />} />
            <dl className="space-y-2.5 text-sm">
              <MetaRow label="名称" value={meta.name} />
              <MetaRow label="版本" value={`v${meta.version}`} mono />
              <MetaRow label="分类" value={meta.category} badge />
              <MetaRow label="状态" value={meta.status} />
              <MetaRow
                label="更新时间"
                value={meta.updatedAt}
                icon={<Clock className="w-3 h-3" />}
              />
              <div>
                <dt className="text-xs text-slate-400">描述</dt>
                <dd className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {meta.description || '-'}
                </dd>
              </div>
            </dl>
          </Card>

          {/* 版本历史 */}
          <Card>
            <SectionTitle
              title="版本历史"
              subtitle={`${versions.length} 个快照`}
              icon={<History className="w-4 h-4" />}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPublish(true)}
                  className="h-7 text-xs"
                >
                  发布
                </Button>
              }
            />
            {versions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                暂无历史版本,发布新版本时会自动创建快照
              </p>
            ) : (
              <ul className="space-y-2">
                {versions.map((v, idx) => (
                  <li
                    key={v.id}
                    className={`relative pl-5 pb-3 ${idx === versions.length - 1 ? '' : 'border-l border-slate-200 dark:border-slate-800'}`}
                  >
                    <span className="absolute left-0 top-1 w-2 h-2 rounded-full bg-hermes-400 -translate-x-[3px]" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 font-mono">
                        v{v.version}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(v.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatSize(v.size)} · {v.filename}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => handleViewVersion(v)}
                        icon={<Eye className="w-3 h-3" />}
                      >
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => handleRollback(v)}
                        icon={<RotateCcw className="w-3 h-3" />}
                      >
                        回滚
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2 hover:text-red-500"
                        onClick={() => handleDeleteVersion(v)}
                        icon={<Trash2 className="w-3 h-3" />}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* 发布版本对话框 */}
      <PublishDialog
        open={showPublish}
        onClose={() => setShowPublish(false)}
        skillId={skill.id}
        currentVersion={skill.version}
        content={skill.content}
        onPublished={load}
      />

      {/* 查看版本内容 */}
      <Modal
        open={!!viewVersion}
        onClose={() => setViewVersion(null)}
        title={viewVersion ? `版本 v${viewVersion.version}` : ''}
        description={viewVersion?.filename}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setViewVersion(null)}>
              关闭
            </Button>
            {viewVersion && (
              <Button
                onClick={() => {
                  handleRollback(viewVersion)
                  setViewVersion(null)
                }}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                回滚到此版本
              </Button>
            )}
          </>
        }
      >
        <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto scroll-thin max-h-[50vh] whitespace-pre-wrap">
          {versionContent || '加载中...'}
        </pre>
      </Modal>
    </div>
  )
}

function MetaRow({
  label,
  value,
  mono,
  badge,
  icon,
}: {
  label: string
  value: string
  mono?: boolean
  badge?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-slate-400 shrink-0">{label}</dt>
      <dd className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1 min-w-0">
        {icon}
        {badge ? (
          <Badge tone="amber">{value}</Badge>
        ) : (
          <span className={`truncate ${mono ? 'font-mono text-xs' : ''}`}>
            {value || '-'}
          </span>
        )}
      </dd>
    </div>
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
