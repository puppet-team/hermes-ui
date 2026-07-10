import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { jobsApi } from '../api/jobs'
import { skillsApi } from '../api/skills'
import type { SkillSummary } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Toggle } from '../components/ui/Toggle'
import { useToast } from '../components/ui/Toast'

type JobType = 'cron' | 'interval'

const presets: { label: string; value: string }[] = [
  { label: '每分钟', value: '0 * * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 0 点', value: '0 0 * * *' },
  { label: '每天 9 点', value: '0 9 * * *' },
  { label: '每周一', value: '0 0 * * 1' },
]

export function JobEdit() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<JobType>('cron')
  const [schedule, setSchedule] = useState('0 9 * * *')
  const [skillId, setSkillId] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    skillsApi.list().then(setSkills).catch(() => {})
    if (isNew) {
      setLoading(false)
      return
    }
    jobsApi
      .get(id!)
      .then((job) => {
        setName(job.name)
        setDescription(job.description)
        setType(job.type)
        setSchedule(job.schedule)
        setSkillId(job.skillId || '')
        setEnabled(job.enabled)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请填写任务名称')
      return
    }
    if (!schedule.trim()) {
      toast.error('请填写调度配置')
      return
    }
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        schedule: schedule.trim(),
        type,
        skillId: skillId || undefined,
      }
      if (isNew) {
        const created = await jobsApi.create(data)
        toast.success('任务已创建')
        navigate(`/jobs/${created.id}/edit`, { replace: true })
      } else {
        await jobsApi.update(id!, {
          name: data.name,
          schedule: data.schedule,
          description: data.description,
          skillId: data.skillId,
        })
        toast.success('已保存')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded-lg w-48" />
        <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/jobs')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          返回
        </Button>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {isNew ? '新建定时任务' : '编辑任务'}
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <Field label="任务名称" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如:每日代码审查报告" />
        </Field>

        <Field label="描述">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="任务的说明..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-hermes-400 resize-none"
          />
        </Field>

        <Field label="调度类型">
          <div className="flex gap-2">
            {(['cron', 'interval'] as JobType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t)
                  setSchedule(t === 'cron' ? '0 9 * * *' : '3600')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-hermes-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t === 'cron' ? 'Cron 表达式' : '固定间隔'}
              </button>
            ))}
          </div>
        </Field>

        <Field label={type === 'cron' ? 'Cron 表达式' : '间隔秒数'} required>
          <Input
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder={type === 'cron' ? '0 9 * * *' : '3600'}
            className="font-mono"
          />
          {type === 'cron' ? (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {presets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSchedule(p.value)}
                  className="px-2 py-1 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-hermes-50 hover:text-hermes-600 dark:hover:bg-hermes-900/30 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">每 {parseInt(schedule) || 0} 秒执行一次</p>
          )}
        </Field>

        <Field label="关联技能">
          <select
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-hermes-400"
          >
            <option value="">不关联</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (v{s.version})
              </option>
            ))}
          </select>
        </Field>

        <Field label="启用状态">
          <div className="flex items-center gap-3">
            <Toggle checked={enabled} onChange={setEnabled} />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {enabled ? '创建后立即启用' : '创建后保持禁用'}
            </span>
          </div>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/jobs')}>
          取消
        </Button>
        <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
          保存
        </Button>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
