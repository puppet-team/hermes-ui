import { useEffect, useState } from 'react'
import {
  Bell,
  Trash2,
  Pencil,
  Send,
  Webhook,
  Mail,
  MessageSquare,
} from 'lucide-react'
import { channelsApi } from '../api/channels'
import type { NotifyChannel, ChannelType } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'

const channelTypes: {
  value: ChannelType
  label: string
  icon: typeof Bell
  color: string
}[] = [
  { value: 'webhook', label: 'Webhook', icon: Webhook, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
  { value: 'email', label: '邮件', icon: Mail, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
  { value: 'slack', label: 'Slack', icon: MessageSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
  { value: 'wecom', label: '企业微信', icon: MessageSquare, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/30' },
  { value: 'feishu', label: '飞书', icon: MessageSquare, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' },
]

export function Channels() {
  const [channels, setChannels] = useState<NotifyChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<NotifyChannel | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      setChannels(await channelsApi.list())
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

  const handleTest = async (ch: NotifyChannel) => {
    setTesting(ch.id)
    try {
      const result = await channelsApi.test(ch.id)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '测试失败')
    } finally {
      setTesting(null)
    }
  }

  const handleDelete = async (_ch: NotifyChannel) => {
    toast.error('内置通知渠道不可删除,请通过编辑更新凭据')
  }

  const handleSaved = (ch: NotifyChannel) => {
    setChannels((list) => {
      const idx = list.findIndex((x) => x.id === ch.id)
      if (idx === -1) return [...list, ch]
      const next = [...list]
      next[idx] = ch
      return next
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            通知渠道
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {channels.filter((c) => c.enabled).length}/{channels.length} 个已配置 · 凭据存于 ~/.hermes/.env
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-7 h-7" />}
          title="无法读取通知渠道"
          description="请确认 hermes-agent 已正确安装"
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {channels.map((ch) => {
            const def = channelTypes.find((t) => t.value === ch.type)!
            const Icon = def.icon
            return (
              <Card key={ch.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${def.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{ch.name}</h3>
                      <p className="text-[11px] text-slate-400 truncate">
                        {ch.config.url || ch.config.to || ch.config.channel || '未配置目标'}
                      </p>
                    </div>
                  </div>
                  <Badge tone={ch.enabled ? 'green' : 'slate'}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ch.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {ch.enabled ? '已配置' : '未配置'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge tone="purple">{def.label}</Badge>
                  {ch.template && <Badge tone="slate">含模板</Badge>}
                </div>
                <div className="flex items-center gap-1 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => handleTest(ch)}
                    loading={testing === ch.id}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    测试发送
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 ml-auto"
                    onClick={() => { setEditing(ch); setShowModal(true) }}
                    icon={<Pencil className="w-3.5 h-3.5" />}
                    aria-label="编辑"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:text-red-500"
                    onClick={() => handleDelete(ch)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    aria-label="删除"
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showModal && (
        <ChannelModal
          channel={editing}
          onClose={() => setShowModal(false)}
          onSaved={(ch) => {
            handleSaved(ch)
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

// ============ 渠道编辑弹窗(编辑 ~/.hermes/.env 凭据)============
/** 每个内置平台需要的环境变量 */
const platformEnvKeys: Record<string, { key: string; label: string; placeholder: string; type?: string }[]> = {
  telegram: [{ key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', placeholder: '123456:ABC-...', type: 'password' }],
  discord: [{ key: 'DISCORD_BOT_TOKEN', label: 'Bot Token', placeholder: '', type: 'password' }],
  slack: [{ key: 'SLACK_BOT_TOKEN', label: 'Bot Token', placeholder: 'xoxb-...', type: 'password' }],
  email: [
    { key: 'EMAIL_ADDRESS', label: '邮箱地址', placeholder: 'you@example.com' },
    { key: 'EMAIL_PASSWORD', label: '密码/授权码', placeholder: '', type: 'password' },
  ],
  whatsapp: [{ key: 'WHATSAPP_ENABLED', label: '启用', placeholder: 'true' }],
  signal: [{ key: 'SIGNAL_HTTP_URL', label: 'Signal API URL', placeholder: 'http://localhost:8080' }],
  matrix: [
    { key: 'MATRIX_HOMESERVER_URL', label: 'Homeserver URL', placeholder: 'https://matrix.org' },
    { key: 'MATRIX_ACCESS_TOKEN', label: 'Access Token', placeholder: '', type: 'password' },
  ],
  feishu: [
    { key: 'FEISHU_APP_ID', label: 'App ID', placeholder: '' },
    { key: 'FEISHU_APP_SECRET', label: 'App Secret', placeholder: '', type: 'password' },
  ],
  wecom: [{ key: 'WECOM_BOT_ID', label: '机器人 ID', placeholder: '' }],
  dingtalk: [{ key: 'DINGTALK_CLIENT_ID', label: 'Client ID', placeholder: '' }],
}

function ChannelModal({
  channel,
  onClose,
  onSaved,
}: {
  channel: NotifyChannel | null
  onClose: () => void
  onSaved: (ch: NotifyChannel) => void
}) {
  const toast = useToast()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // 编辑的目标平台 id(channel.id 是平台标识)
  const platformId = channel?.id || ''
  const envFields = platformEnvKeys[platformId] || []

  const handleSave = async () => {
    setSaving(true)
    try {
      // 只写入非空字段
      const config: Record<string, string> = {}
      for (const f of envFields) {
        if (values[f.key]) config[f.key] = values[f.key]
      }
      if (Object.keys(config).length === 0) {
        toast.error('请至少填写一项凭据')
        setSaving(false)
        return
      }
      const result = await channelsApi.update(platformId, config)
      toast.success('凭据已写入 ~/.hermes/.env')
      onSaved(result)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`编辑「${channel?.name || ''}」凭据`}
      description="凭据将写入 ~/.hermes/.env,由 hermes-agent 读取"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} loading={saving}>保存</Button>
        </>
      }
    >
      <div className="space-y-4">
        {envFields.length === 0 ? (
          <p className="text-sm text-slate-400">该平台无可配置凭据</p>
        ) : (
          envFields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                {f.label}
                <span className="text-slate-300 ml-2 font-mono">{f.key}</span>
              </label>
              <Input
                type={f.type || 'text'}
                value={values[f.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="font-mono"
              />
            </div>
          ))
        )}
        <p className="text-[11px] text-slate-400">
          提示:配置后可通过 <code className="font-mono">hermes cron create --deliver {platformId}</code> 发送通知到该渠道
        </p>
      </div>
    </Modal>
  )
}
