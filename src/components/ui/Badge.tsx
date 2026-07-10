import type { ReactNode } from 'react'
import type { SkillStatus } from '../../types'

type Tone = 'amber' | 'green' | 'slate' | 'red' | 'blue' | 'purple'

const tones: Record<Tone, string> = {
  amber:
    'bg-hermes-50 text-hermes-700 ring-hermes-200 dark:bg-hermes-900/30 dark:text-hermes-300 dark:ring-hermes-800',
  green:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800',
  slate:
    'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800',
  purple:
    'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800',
}

interface BadgeProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'slate', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

const statusTone: Record<SkillStatus, Tone> = {
  active: 'green',
  draft: 'slate',
  deprecated: 'red',
}

const statusLabel: Record<SkillStatus, string> = {
  active: '已上线',
  draft: '草稿',
  deprecated: '已弃用',
}

export function StatusBadge({ status }: { status: SkillStatus }) {
  return (
    <Badge tone={statusTone[status]}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {statusLabel[status]}
    </Badge>
  )
}
