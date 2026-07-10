import {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const close = (value: boolean) => {
    setOpen(false)
    resolver?.(value)
    setResolver(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={open}
        onClose={() => close(false)}
        title={options?.title}
        description={options?.description}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)}>
              {options?.cancelText || '取消'}
            </Button>
            <Button
              variant={options?.danger ? 'danger' : 'primary'}
              onClick={() => close(true)}
            >
              {options?.confirmText || '确认'}
            </Button>
          </>
        }
      >
        <div className="h-1" />
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm 必须在 ConfirmProvider 内使用')
  return ctx
}
