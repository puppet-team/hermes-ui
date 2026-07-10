import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { skillsApi } from '../../api/skills'

interface PublishDialogProps {
  open: boolean
  onClose: () => void
  skillId: string
  currentVersion: string
  content: string
  onPublished: () => void
}

export function PublishDialog({
  open,
  onClose,
  skillId,
  currentVersion,
  content,
  onPublished,
}: PublishDialogProps) {
  const [version, setVersion] = useState('')
  const [snapshot, setSnapshot] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const toast = useToast()

  // 建议的下一版本号
  const suggested = suggestNextVersion(currentVersion)

  const handlePublish = async () => {
    const v = version.trim() || suggested
    if (!/^\d+\.\d+\.\d+$/.test(v)) {
      toast.error('版本号格式应为 x.y.z')
      return
    }
    setPublishing(true)
    try {
      await skillsApi.publishVersion(skillId, v, content, snapshot)
      toast.success(`已发布版本 v${v}`)
      setVersion('')
      onPublished()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发布失败')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="发布新版本"
      description={`当前版本 v${currentVersion}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handlePublish} loading={publishing}>
            发布
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            新版本号
          </label>
          <Input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder={suggested}
            className="font-mono"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            格式 x.y.z,留空则使用建议值 {suggested}
          </p>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={snapshot}
            onChange={(e) => setSnapshot(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-hermes-500 focus:ring-hermes-400"
          />
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              同时创建版本快照备份
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              将当前内容存入 .versions/ 目录,可随时回滚
            </p>
          </div>
        </label>
      </div>
    </Modal>
  )
}

function suggestNextVersion(current: string): string {
  const parts = current.split('.').map((n) => parseInt(n, 10) || 0)
  while (parts.length < 3) parts.push(0)
  parts[2] += 1
  return parts.join('.')
}
