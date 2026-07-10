import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Layers, LayoutGrid, List, Search, RefreshCw } from 'lucide-react'
import { skillsApi } from '../api/skills'
import type { SkillSummary, SkillStatus } from '../types'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { SkillCard } from '../components/skill/SkillCard'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'

type View = 'grid' | 'table'
type StatusFilter = 'all' | SkillStatus

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '已上线' },
  { value: 'draft', label: '草稿' },
  { value: 'deprecated', label: '已弃用' },
]

export function Skills() {
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('grid')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const navigate = useNavigate()
  const toast = useToast()
  const { confirm } = useConfirm()

  const load = async () => {
    setLoading(true)
    try {
      const data = await skillsApi.list()
      setSkills(data)
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

  const categories = useMemo(() => {
    const set = new Set(skills.map((s) => s.category))
    return ['all', ...Array.from(set).sort()]
  }, [skills])

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.description.toLowerCase().includes(q)
        )
          return false
      }
      if (category !== 'all' && s.category !== category) return false
      if (status !== 'all' && s.status !== status) return false
      return true
    })
  }, [skills, search, category, status])

  const handleDelete = async (skill: SkillSummary) => {
    const ok = await confirm({
      title: `删除技能「${skill.name}」?`,
      description: '该操作将删除技能文件及其所有版本快照,不可恢复。',
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await skillsApi.remove(skill.id)
      toast.success('已删除')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const handleExport = (skill: SkillSummary) => {
    window.open(skillsApi.exportUrl(skill.id), '_blank')
    toast.success('开始下载')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 页头 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            技能列表
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            共 {skills.length} 个技能 · 管理你的 AI Agent 能力库
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
            size="sm"
            onClick={() => navigate('/skills/new')}
            icon={<Plus className="w-4 h-4" />}
          >
            新建技能
          </Button>
        </div>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="技能总数"
          value={skills.length}
          tone="amber"
        />
        <StatTile
          label="已上线"
          value={skills.filter((s) => s.status === 'active').length}
          tone="green"
        />
        <StatTile
          label="草稿"
          value={skills.filter((s) => s.status === 'draft').length}
          tone="slate"
        />
        <StatTile
          label="分类"
          value={categories.length - 1}
          tone="blue"
        />
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索名称或描述..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-hermes-400"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-hermes-400"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? '全部分类' : c}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-hermes-400"
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'grid'
                ? 'bg-white dark:bg-slate-700 text-hermes-600 shadow-sm'
                : 'text-slate-400'
            }`}
            aria-label="网格视图"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-1.5 rounded-md transition-colors ${
              view === 'table'
                ? 'bg-white dark:bg-slate-700 text-hermes-600 shadow-sm'
                : 'text-slate-400'
            }`}
            aria-label="表格视图"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 内容 */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-7 h-7" />}
          title={skills.length === 0 ? '还没有技能' : '没有匹配的技能'}
          description={
            skills.length === 0
              ? '新建你的第一个 AI Agent 技能吧'
              : '尝试调整搜索或筛选条件'
          }
          action={
            skills.length === 0 ? (
              <Button
                size="sm"
                onClick={() => navigate('/skills/new')}
                icon={<Plus className="w-4 h-4" />}
              >
                新建技能
              </Button>
            ) : undefined
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onDelete={handleDelete}
              onExport={handleExport}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left font-medium px-4 py-3">名称</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">
                  描述
                </th>
                <th className="text-left font-medium px-4 py-3">分类</th>
                <th className="text-left font-medium px-4 py-3">版本</th>
                <th className="text-left font-medium px-4 py-3">状态</th>
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">
                  更新时间
                </th>
                <th className="text-right font-medium px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((skill) => (
                <tr
                  key={skill.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/skills/${skill.id}`)}
                      className="font-medium text-slate-800 dark:text-slate-100 hover:text-hermes-600 dark:hover:text-hermes-400"
                    >
                      {skill.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell max-w-xs truncate">
                    {skill.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="amber">{skill.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                    v{skill.version}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={skill.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">
                    {skill.updatedAt}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/skills/${skill.id}/edit`)}
                    >
                      编辑
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'amber' | 'green' | 'slate' | 'blue'
}) {
  const tones = {
    amber: 'text-hermes-600 dark:text-hermes-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    slate: 'text-slate-600 dark:text-slate-300',
    blue: 'text-blue-600 dark:text-blue-400',
  }
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</p>
    </div>
  )
}
