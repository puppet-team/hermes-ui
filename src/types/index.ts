// 前后端共享的类型定义

export type SkillStatus = 'active' | 'draft' | 'deprecated'

/** SKILL.md 解析后的技能元数据 */
export interface SkillMeta {
  name: string
  description: string
  version: string
  category: string
  status: SkillStatus
  updatedAt: string
  [key: string]: string | undefined
}

/** 技能列表项(轻量,不含正文) */
export interface SkillSummary {
  id: string
  name: string
  description: string
  version: string
  category: string
  status: SkillStatus
  updatedAt: string
}

/** 技能完整信息(含正文) */
export interface SkillDetail extends SkillSummary {
  content: string
  /** 原始 frontmatter 字段 */
  rawMeta: Record<string, string>
}

/** 历史版本快照 */
export interface SkillVersion {
  id: string
  skillId: string
  version: string
  /** 快照文件名 */
  filename: string
  /** 快照时间 ISO */
  createdAt: string
  size: number
}

/** 备份项(技能目录下的快照汇总) */
export interface BackupItem {
  skillId: string
  skillName: string
  filename: string
  version: string
  createdAt: string
  size: number
}

/** 保存技能的请求体 */
export interface SaveSkillInput {
  id?: string
  content: string
}

/** 发布新版本的请求体 */
export interface PublishVersionInput {
  version: string
  content: string
  /** 是否同时写入快照备份 */
  snapshot?: boolean
}

// ================ 定时任务 ================
export interface ScheduledJob {
  id: string
  name: string
  description: string
  type: 'cron' | 'interval'
  /** cron 表达式 或 间隔秒数 */
  schedule: string
  /** 关联技能 id */
  skillId?: string
  enabled: boolean
  lastRunAt?: string
  nextRunAt?: string
  runCount: number
  createdAt: string
  updatedAt: string
}

// ================ 模型管理 ================
export type ProviderType = 'openai' | 'anthropic' | 'azure' | 'ollama' | 'custom'

export interface ModelConfig {
  id: string
  name: string
  contextWindow: number
  maxTokens: number
  enabled: boolean
  isDefault: boolean
}

export interface ModelProvider {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
  models: ModelConfig[]
  createdAt: string
  updatedAt: string
}

export interface ModelTestResult {
  ok: boolean
  message: string
  latency?: number
}

// ================ 通知渠道 ================
export type ChannelType = 'webhook' | 'email' | 'slack' | 'wecom' | 'feishu'

export interface NotifyChannel {
  id: string
  name: string
  type: ChannelType
  /** 按 type 不同的配置字段 */
  config: Record<string, string>
  enabled: boolean
  template?: string
  createdAt: string
  updatedAt: string
}

export interface ChannelTestResult {
  ok: boolean
  message: string
}

// ================ 网关管理 ================
export type GatewayStatus = 'online' | 'offline' | 'unknown'
export type AuthType = 'none' | 'apikey' | 'bearer'

export interface UpstreamRef {
  id: string
  type: 'model' | 'skill'
  name: string
}

export interface RouteRule {
  path: string
  upstream: string
  enabled: boolean
}

export interface AgentGateway {
  id: string
  name: string
  endpoint: string
  upstreams: UpstreamRef[]
  authType: AuthType
  authSecret?: string
  rateLimit: { enabled: boolean; rps: number; burst: number }
  status: GatewayStatus
  routes: RouteRule[]
  createdAt: string
  updatedAt: string
}

export interface GatewayPingResult {
  status: GatewayStatus
  latency?: number
  error?: string
}
