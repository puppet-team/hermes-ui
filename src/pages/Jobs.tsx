import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Clock,
  Play,
  RefreshCw,
  Trash2,
  Pencil,
  Calendar,
  Timer,
} from 'lucide-react'
import { jobsApi } from '../api/jobs'
import type { ScheduledJob } from '../types'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Toggle } from '../components/ui/Toggle'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'

export function Jobs() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()
  const { confirm } = useConfirm()

  const load = async () => {
    setLoading(true)
    try {
      setJobs(await jobsApi.list())
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

  const handleToggle = async (job: ScheduledJob) => {
    try {
      const updated = await jobsApi.toggle(job.id)
      setJobs((list) => list.map((j) => (j.id === job.id ? updated : j)))
      toast.success(updated.enabled ? '已启用' : '已禁用')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleRun = async (job: ScheduledJob) => {
    try {
      const result = await jobsApi.run(job.id)
      toast.success(result.message)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '执行失败')
    }
  }

  const handleDelete = async (job: ScheduledJob) => {
    const ok = await confirm({
      title: `删除任务「${job.name}」?`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await jobsApi.remove(job.id)
      setJobs((list) => list.filter((j) => j.id !== job.id))
      toast.success('已删除')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            定时任务
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            共 {jobs.length} 个任务 · {jobs.filter((j) => j.enabled).length} 个启用中
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
            onClick={() => navigate('/jobs/new')}
            icon={<Plus className="w-4 h-4" />}
          >
            新建任务
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-7 h-7" />}
          title="暂无定时任务"
          description="新建任务来按计划自动执行技能"
          action={
            <Button size="sm" onClick={() => navigate('/jobs/new')} icon={<Plus className="w-4 h-4" />}>
              新建任务
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-card transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-hermes-50 dark:bg-hermes-900/30 flex items-center justify-center shrink-0">
                  {job.type === 'cron' ? (
                    <Calendar className="w-5 h-5 text-hermes-500" />
                  ) : (
                    <Timer className="w-5 h-5 text-hermes-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {job.name}
                    </h3>
                    <Badge tone={job.enabled ? 'green' : 'slate'}>
                      {job.enabled ? '启用' : '禁用'}
                    </Badge>
                    {job.type === 'cron' ? (
                      <Badge tone="purple">Cron</Badge>
                    ) : (
                      <Badge tone="blue">间隔</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {job.description || '无描述'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 flex-wrap">
                    <span className="font-mono text-hermes-600 dark:text-hermes-400">
                      {job.type === 'cron' ? job.schedule : `每 ${job.schedule}s`}
                    </span>
                    <span>执行 {job.runCount} 次</span>
                    {job.lastRunAt && <span>上次:{formatTime(job.lastRunAt)}</span>}
                    {job.nextRunAt && job.enabled && (
                      <span>下次:{formatTime(job.nextRunAt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Toggle checked={job.enabled} onChange={() => handleToggle(job)} size="sm" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleRun(job)}
                    icon={<Play className="w-3.5 h-3.5" />}
                    aria-label="立即执行"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => navigate(`/jobs/${job.id}/edit`)}
                    icon={<Pencil className="w-3.5 h-3.5" />}
                    aria-label="编辑"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:text-red-500"
                    onClick={() => handleDelete(job)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    aria-label="删除"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
