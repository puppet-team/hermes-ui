import { useEffect, useState } from 'react'
import {
  Network,
  Activity,
  Play,
  Square,
  Power,
  RefreshCw,
  Server,
  Terminal,
} from 'lucide-react'
import { gatewaysApi } from '../api/gateways'
import type { AgentGateway, GatewayStatus } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'

const statusConfig: Record<GatewayStatus, { tone: 'green' | 'red' | 'slate'; label: string; dot: string }> = {
  online: { tone: 'green', label: '在线', dot: 'bg-emerald-500' },
  offline: { tone: 'red', label: '离线', dot: 'bg-red-500' },
  unknown: { tone: 'slate', label: '未知', dot: 'bg-slate-400' },
}

export function Gateways() {
  const [gateway, setGateway] = useState<AgentGateway | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const list = await gatewaysApi.list()
      setGateway(list[0] || null)
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

  const handleAction = async (
    fn: () => Promise<{ message: string }>,
    name: string,
  ) => {
    setAction(name)
    try {
      const result = await fn()
      toast.success(result.message)
      setTimeout(load, 1000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setAction(null)
    }
  }

  const handlePing = async () => {
    setAction('ping')
    try {
      const result = await gatewaysApi.ping()
      setGateway((gw) => (gw ? { ...gw, status: result.status } : gw))
      if (result.status === 'online') {
        toast.success(`在线 · 延迟 ${result.latency}ms`)
      } else {
        toast.error(result.error || '离线')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '探活失败')
    } finally {
      setAction(null)
    }
  }

  const sc = gateway ? statusConfig[gateway.status] : statusConfig.unknown

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            网关管理
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            管理 hermes-agent 网关服务 · OpenAI 兼容 API
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            loading={loading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePing}
            loading={action === 'ping'}
            icon={<Activity className="w-4 h-4" />}
          >
            探活
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-40 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
      ) : !gateway ? (
        <EmptyState
          icon={<Network className="w-7 h-7" />}
          title="无法读取网关状态"
          description="请确认 hermes-agent 已正确安装(hermes CLI 可用)"
        />
      ) : (
        <Card>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-hermes-50 dark:bg-hermes-900/30 flex items-center justify-center shrink-0">
              <Server className="w-6 h-6 text-hermes-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {gateway.name}
                </h3>
                <Badge tone={sc.tone}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${gateway.status === 'online' ? 'animate-pulse' : ''}`} />
                  {sc.label}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">{gateway.endpoint}</p>

              {/* 路由/端点信息 */}
              <div className="mt-4">
                <p className="text-[11px] text-slate-400 mb-2">可用端点</p>
                <div className="flex flex-wrap gap-1.5">
                  {gateway.routes.map((r, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono ${
                        r.enabled
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800/50'
                      }`}
                    >
                      {r.path}
                    </span>
                  ))}
                </div>
              </div>

              {/* CLI 提示 */}
              <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  <Terminal className="w-3 h-3" /> CLI 命令
                </p>
                <div className="space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <p>$ hermes gateway run</p>
                  <p>$ hermes gateway status</p>
                  <p>$ hermes gateway install</p>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAction(gatewaysApi.start, 'start')}
                loading={action === 'start'}
                disabled={gateway.status === 'online'}
                icon={<Play className="w-3.5 h-3.5" />}
              >
                启动
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction(gatewaysApi.stop, 'stop')}
                loading={action === 'stop'}
                disabled={gateway.status !== 'online'}
                icon={<Square className="w-3.5 h-3.5" />}
              >
                停止
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction(gatewaysApi.install, 'install')}
                loading={action === 'install'}
                icon={<Power className="w-3.5 h-3.5" />}
              >
                安装服务
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
