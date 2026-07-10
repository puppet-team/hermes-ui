import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** 内边距,默认有 */
  padded?: boolean
}

export function Card({ children, className = '', padded = true }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card ${padded ? 'p-4' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

interface SectionTitleProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
}

export function SectionTitle({
  title,
  subtitle,
  action,
  icon,
}: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-hermes-500 shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}
