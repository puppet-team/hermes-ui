import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeMap[size]} bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 animate-slide-up max-h-[90vh] flex flex-col`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="-mr-2 -mt-1"
              icon={<X className="w-4 h-4" />}
              aria-label="关闭"
            />
          </div>
        )}
        <div className="p-5 overflow-y-auto scroll-thin flex-1">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
