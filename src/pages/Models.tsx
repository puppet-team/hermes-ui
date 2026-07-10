import { useEffect, useState } from 'react'
import {
  Plus,
  Cpu,
  Trash2,
  Pencil,
  Zap,
  Eye,
  EyeOff,
  Copy,
  Star,
  Server,
} from 'lucide-react'
import { modelsApi } from '../api/models'
import type { ModelProvider, ProviderType, ModelConfig } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Toggle } from '../components/ui/Toggle'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'

const providerTypes: { value: ProviderType; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'azure', label: 'Azure' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'custom', label: '自定义' },
]

export function Models() {
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ModelProvider | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const toast = useToast()
  const { confirm } = useConfirm()

  const load = async () => {
    setLoading(true)
    try {
      setProviders(await modelsApi.list())
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

  const handleTest = async (p: ModelProvider) => {
    setTesting(p.id)
    try {
      const result = await modelsApi.test(p.id)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '测试失败')
    } finally {
      setTesting(null)
    }
  }

  const handleDelete = async (p: ModelProvider) => {
    const ok = await confirm({
      title: `删除提供商「${p.name}」?`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await modelsApi.remove(p.id)
      setProviders((list) => list.filter((x) => x.id !== p.id))
      toast.success('已删除')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const openNew = () => {
    setEditing(null)
    setShowModal(true)
  }
  const openEdit = (p: ModelProvider) => {
    setEditing(p)
    setShowModal(true)
  }

  const handleSaved = (p: ModelProvider) => {
    setProviders((list) => {
      const idx = list.findIndex((x) => x.id === p.id)
      if (idx === -1) return [...list, p]
      const next = [...list]
      next[idx] = p
      return next
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            模型管理
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {providers.length} 个提供商 · 管理 LLM 接入配置
          </p>
        </div>
        <Button size="sm" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          新建提供商
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={<Cpu className="w-7 h-7" />}
          title="暂无模型提供商"
          description="添加 OpenAI / Anthropic / Ollama 等提供商配置"
          action={<Button size="sm" onClick={openNew} icon={<Plus className="w-4 h-4" />}>新建提供商</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {providers.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-hermes-50 dark:bg-hermes-900/30 flex items-center justify-center shrink-0">
                    <Server className="w-5 h-5 text-hermes-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate font-mono">{p.baseUrl}</p>
                  </div>
                </div>
                <Badge tone="blue">{providerTypes.find((t) => t.value === p.type)?.label || p.type}</Badge>
              </div>

              <div className="flex-1">
                {p.models.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">未配置模型</p>
                ) : (
                  <div className="space-y-1.5">
                    {p.models.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {m.isDefault && <Star className="w-3 h-3 text-hermes-500 fill-hermes-500 shrink-0" />}
                          <span className="font-mono text-slate-700 dark:text-slate-200 truncate">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-slate-400">{formatCtx(m.contextWindow)}</span>
                          <Badge tone={m.enabled ? 'green' : 'slate'}>
                            {m.enabled ? '启用' : '禁用'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => handleTest(p)}
                  loading={testing === p.id}
                  icon={<Zap className="w-3.5 h-3.5" />}
                >
                  测试
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 ml-auto"
                  onClick={() => openEdit(p)}
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  aria-label="编辑"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:text-red-500"
                  onClick={() => handleDelete(p)}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  aria-label="删除"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <ProviderModal
          provider={editing}
          onClose={() => setShowModal(false)}
          onSaved={(p) => {
            handleSaved(p)
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function formatCtx(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

// ============ 提供商编辑弹窗 ============
function ProviderModal({
  provider,
  onClose,
  onSaved,
}: {
  provider: ModelProvider | null
  onClose: () => void
  onSaved: (p: ModelProvider) => void
}) {
  const toast = useToast()
  const [name, setName] = useState(provider?.name || '')
  const [type, setType] = useState<ProviderType>(provider?.type || 'openai')
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || '')
  const [apiKey, setApiKey] = useState(provider?.apiKey || '')
  const [showKey, setShowKey] = useState(false)
  const [models, setModels] = useState<ModelConfig[]>(provider?.models || [])
  const [saving, setSaving] = useState(false)

  const addModel = () => {
    setModels((m) => [
      ...m,
      { id: `m-${Date.now().toString(36)}`, name: '', contextWindow: 8192, maxTokens: 4096, enabled: true, isDefault: m.length === 0 },
    ])
  }
  const updateModel = (id: string, patch: Partial<ModelConfig>) => {
    setModels((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }
  const removeModel = (id: string) => {
    setModels((m) => m.filter((x) => x.id !== id))
  }
  const setDefault = (id: string) => {
    setModels((m) => m.map((x) => ({ ...x, isDefault: x.id === id })))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请填写提供商名称')
      return
    }
    if (!baseUrl.trim()) {
      toast.error('请填写 Base URL')
      return
    }
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        type,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        models: models.filter((m) => m.name.trim()),
      }
      const result = provider
        ? await modelsApi.update(provider.id, data)
        : await modelsApi.create(data)
      toast.success('已保存')
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
      title={provider ? '编辑提供商' : '新建提供商'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} loading={saving}>保存</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">名称 *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如:OpenAI" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProviderType)}
              className="w-full h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-hermes-400"
            >
              {providerTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Base URL *</label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" className="font-mono" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">API Key</label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="font-mono pr-20"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                onClick={() => setShowKey((v) => !v)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showKey ? '隐藏' : '显示'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(apiKey)
                  toast.success('已复制')
                }}
                disabled={!apiKey}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                aria-label="复制"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 模型列表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">模型列表</label>
            <Button variant="ghost" size="sm" className="h-7" onClick={addModel} icon={<Plus className="w-3.5 h-3.5" />}>
              添加模型
            </Button>
          </div>
          {models.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg">暂无模型,点击「添加模型」</p>
          ) : (
            <div className="space-y-2">
              {models.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <input
                    value={m.name}
                    onChange={(e) => updateModel(m.id, { name: e.target.value })}
                    placeholder="模型名"
                    className="flex-1 min-w-0 h-8 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-hermes-400"
                  />
                  <input
                    type="number"
                    value={m.contextWindow}
                    onChange={(e) => updateModel(m.id, { contextWindow: parseInt(e.target.value) || 0 })}
                    placeholder="上下文"
                    title="上下文窗口"
                    className="w-20 h-8 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-hermes-400"
                  />
                  <button
                    onClick={() => setDefault(m.id)}
                    title="设为默认"
                    className={`p-1.5 rounded ${m.isDefault ? 'text-hermes-500' : 'text-slate-300 hover:text-hermes-400'}`}
                  >
                    <Star className={`w-3.5 h-3.5 ${m.isDefault ? 'fill-hermes-500' : ''}`} />
                  </button>
                  <Toggle checked={m.enabled} onChange={(v) => updateModel(m.id, { enabled: v })} size="sm" />
                  <button
                    onClick={() => removeModel(m.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500"
                    aria-label="删除模型"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
