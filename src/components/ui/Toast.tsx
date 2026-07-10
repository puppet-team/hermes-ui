import {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const config: Record<ToastType, { icon: ReactNode; cls: string }> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    cls: 'border-emerald-200 dark:border-emerald-800',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    cls: 'border-red-200 dark:border-red-800',
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-500" />,
    cls: 'border-blue-200 dark:border-blue-800',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, type, message }])
      setTimeout(() => remove(id), 3000)
    },
    [remove],
  )

  const success = useCallback((m: string) => toast(m, 'success'), [toast])
  const error = useCallback((m: string) => toast(m, 'error'), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 p-3 rounded-lg bg-white dark:bg-slate-900 shadow-card-hover border ${config[t.type].cls} animate-slide-up`}
          >
            <span className="shrink-0 mt-0.5">{config[t.type].icon}</span>
            <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">
              {t.message}
            </p>
            <button
              onClick={() => remove(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用')
  return ctx
}
