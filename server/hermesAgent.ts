import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type {
  ScheduledJob,
  ModelProvider,
  NotifyChannel,
  AgentGateway,
  GatewayStatus,
  ProviderType,
} from '../src/types/index.ts'

const execFileAsync = promisify(execFile)

// ============ hermes-agent 路径 ============
// 与 hermes-agent 保持一致:HERMES_HOME 环境变量覆盖,默认 ~/.hermes
export const HERMES_HOME = process.env.HERMES_HOME
  ? path.resolve(process.env.HERMES_HOME)
  : path.join(os.homedir(), '.hermes')

const CONFIG_YAML = path.join(HERMES_HOME, 'config.yaml')
const ENV_FILE = path.join(HERMES_HOME, '.env')
const CRON_JOBS = path.join(HERMES_HOME, 'cron', 'jobs.json')
const SKILLS_DIR = path.join(HERMES_HOME, 'skills')

// hermes CLI 可执行文件:优先用 ~/.hermes/bin/hermes,回退 PATH 中的 hermes
const HERMES_BIN =
  process.env.HERMES_BIN || path.join(HERMES_HOME, 'bin', 'hermes')

// hermes-agent gateway API 端口(OpenAI 兼容)
const GATEWAY_API = process.env.HERMES_API_PORT || '8642'

export function getHermesHome(): string {
  return HERMES_HOME
}
export function getHermesBin(): string {
  return HERMES_BIN
}
export function getSkillsDir(): string {
  return SKILLS_DIR
}

/** 调用 hermes CLI,返回 stdout */
async function runHermes(args: string[], timeoutMs = 15000): Promise<string> {
  try {
    const { stdout } = await execFileAsync(HERMES_BIN, args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, HERMES_HOME },
    })
    return stdout
  } catch (e) {
    const err = e as { stderr?: string; message?: string }
    throw new Error(err.stderr?.trim() || err.message || 'hermes 命令执行失败')
  }
}

/** 检测 hermes CLI 是否可用 */
export async function isHermesAvailable(): Promise<boolean> {
  try {
    await runHermes(['--version'], 5000)
    return true
  } catch {
    return false
  }
}

// ============ Cron 定时任务(真实 ~/.hermes/cron/jobs.json)============
interface HermesCronJob {
  id: string
  name: string | null
  prompt: string | null
  skills: string[]
  schedule: { kind: string; run_at?: string; display?: string } | string
  schedule_display?: string
  enabled: boolean
  state?: string
  next_run_at?: string | null
  last_run_at?: string | null
  last_status?: string | null
  deliver?: string
  repeat?: { times: number; completed: number }
  created_at?: string
  paused_at?: string | null
  paused_reason?: string | null
}

interface HermesCronFile {
  jobs: HermesCronJob[]
  updated_at?: string
}

/** 读取真实 cron 任务,映射为 UI 类型 */
async function readCronJobs(): Promise<ScheduledJob[]> {
  try {
    const raw = await fs.readFile(CRON_JOBS, 'utf-8')
    const data = JSON.parse(raw) as HermesCronFile
    return (data.jobs || []).map(mapCronJob)
  } catch {
    return []
  }
}

function mapCronJob(j: HermesCronJob): ScheduledJob {
  const schedule =
    typeof j.schedule === 'string'
      ? j.schedule
      : j.schedule?.display || j.schedule?.run_at || ''
  const kind = typeof j.schedule === 'string' ? 'cron' : j.schedule?.kind || 'cron'
  return {
    id: j.id,
    name: j.name || j.prompt?.slice(0, 30) || j.id,
    description: j.prompt || '',
    type: kind === 'once' ? 'interval' : 'cron',
    schedule,
    skillId: j.skills?.[0],
    enabled: j.enabled,
    lastRunAt: j.last_run_at || undefined,
    nextRunAt: j.next_run_at || undefined,
    runCount: j.repeat?.completed || 0,
    createdAt: j.created_at || '',
    updatedAt: j.created_at || '',
  }
}

export const hermesCron = {
  async list(): Promise<ScheduledJob[]> {
    return readCronJobs()
  },

  /** 创建 cron 任务:走 hermes CLI(保证调度器校验) */
  async create(input: {
    name: string
    prompt: string
    schedule: string
    skillId?: string
    deliver?: string
  }): Promise<ScheduledJob> {
    const args = ['cron', 'create', input.schedule, input.prompt || '""']
    if (input.name) args.push('--name', input.name)
    if (input.skillId) args.push('--skill', input.skillId)
    if (input.deliver) args.push('--deliver', input.deliver)
    const stdout = await runHermes(args)
    // 解析 "Created job: <id>"
    const idMatch = stdout.match(/Created job:\s*(\S+)/)
    if (!idMatch) throw new Error('创建失败:未能解析任务 ID')
    const job = await this.get(idMatch[1])
    if (!job) throw new Error('创建失败:任务未出现在列表中')
    return job
  },

  async get(id: string): Promise<ScheduledJob | null> {
    const jobs = await readCronJobs()
    return jobs.find((j) => j.id === id) || null
  },

  /** 删除:走 CLI */
  async remove(id: string): Promise<void> {
    await runHermes(['cron', 'delete', id])
  },

  /** 编辑:走 CLI hermes cron edit */
  async update(
    id: string,
    patch: {
      name?: string
      schedule?: string
      prompt?: string
      description?: string
      skillId?: string
    },
  ): Promise<ScheduledJob | null> {
    const args = ['cron', 'edit', id]
    if (patch.schedule) args.push('--schedule', patch.schedule)
    // description 与 prompt 互通:UI 用 description,hermes 用 prompt
    const prompt = patch.prompt ?? patch.description
    if (prompt) args.push('--prompt', prompt)
    if (patch.name) args.push('--name', patch.name)
    if (patch.skillId) args.push('--skill', patch.skillId)
    await runHermes(args)
    return this.get(id)
  },

  /** 启用/禁用:编辑 state(paused_at)。hermes cron edit 无 toggle,用 enabled 字段直写 jobs.json */
  async toggle(id: string): Promise<ScheduledJob | null> {
    const jobs = await readCronJobs()
    const job = jobs.find((j) => j.id === id)
    if (!job) return null
    const next = !job.enabled
    // 直写 jobs.json 切换 enabled(state 由调度器维护)
    await setCronEnabled(id, next)
    return this.get(id)
  },

  /** 立即执行:无 CLI 直接触发,返回提示 */
  async run(_id: string): Promise<{ message: string }> {
    return {
      message: '请运行 hermes gateway 使调度器生效;该任务将在下次调度时执行',
    }
  },
}

/** 直写 jobs.json 切换某任务的 enabled */
async function setCronEnabled(id: string, enabled: boolean): Promise<void> {
  const raw = await fs.readFile(CRON_JOBS, 'utf-8')
  const data = JSON.parse(raw) as HermesCronFile
  const job = data.jobs.find((j) => j.id === id)
  if (!job) throw new Error('任务不存在')
  job.enabled = enabled
  if (enabled) {
    job.state = 'scheduled'
    job.paused_at = null
    job.paused_reason = null
  } else {
    job.state = 'paused'
    job.paused_at = new Date().toISOString()
  }
  await fs.writeFile(CRON_JOBS, JSON.stringify(data, null, 2), 'utf-8')
}

// ============ Models / Providers(config.yaml + .env)============
interface HermesProvider {
  name: string
  base_url: string
  api_key?: string
  models?: Array<{ name: string; context_length?: number; max_tokens?: number }>
}

export const hermesModels = {
  /** 读取 config.yaml 的 model + providers + .env API keys,映射为 UI 类型 */
  async list(): Promise<ModelProvider[]> {
    const config = await readConfig()
    const result: ModelProvider[] = []
    const seen = new Set<string>()

    // 1) 顶层 model 块(当前激活的模型/提供商,hermes-agent 的主配置)
    const modelCfg = config.model as
      | { default?: string; provider?: string; base_url?: string }
      | undefined
    if (modelCfg && (modelCfg.provider || modelCfg.base_url || modelCfg.default)) {
      const providerName = modelCfg.provider || 'default'
      const id = `model:${providerName}`
      if (!seen.has(id)) {
        seen.add(id)
        const envKeys = await readEnvKeys()
        // 推断该 provider 对应的 API key 环境变量
        const apiKey = resolveProviderApiKey(providerName, envKeys)
        result.push({
          id,
          name: providerName.charAt(0).toUpperCase() + providerName.slice(1),
          type: inferProviderType(modelCfg.base_url || ''),
          baseUrl: modelCfg.base_url || '',
          apiKey: apiKey ? '(在 .env 配置)' : '',
          models: modelCfg.default
            ? [
                {
                  id: `${id}:${modelCfg.default}`,
                  name: modelCfg.default,
                  contextWindow: 0,
                  maxTokens: 0,
                  enabled: true,
                  isDefault: true,
                },
              ]
            : [],
          createdAt: '',
          updatedAt: '',
        })
      }
    }

    // 2) providers 自定义提供商
    const providers = (config.providers || {}) as Record<string, HermesProvider>
    for (const [key, p] of Object.entries(providers)) {
      const id = `provider:${key}`
      if (seen.has(id)) continue
      seen.add(id)
      result.push({
        id,
        name: p.name || key,
        type: inferProviderType(p.base_url),
        baseUrl: p.base_url || '',
        apiKey: p.api_key || '',
        models: (p.models || []).map((m) => ({
          id: `${id}:${m.name}`,
          name: m.name,
          contextWindow: m.context_length || 0,
          maxTokens: m.max_tokens || 0,
          enabled: true,
          isDefault: false,
        })),
        createdAt: '',
        updatedAt: '',
      })
    }

    // 3) .env 中已配置但未被以上覆盖的 API key 平台
    const envKeys = await readEnvKeys()
    const builtin = inferBuiltinProviders(envKeys)
    for (const b of builtin) {
      // 跳过已被顶层 model 块或 providers 覆盖的同名 provider
      const lowerName = b.name.toLowerCase()
      const alreadyCovered = result.some(
        (r) =>
          r.id === b.id ||
          r.name.toLowerCase() === lowerName ||
          r.id.endsWith(`:${b.id}`),
      )
      if (alreadyCovered) continue
      seen.add(b.id)
      result.push({
        id: b.id,
        name: b.name,
        type: b.type,
        baseUrl: b.baseUrl,
        apiKey: b.hasKey ? '(在 .env 配置)' : '',
        models: [],
        createdAt: '',
        updatedAt: '',
      })
    }
    return result
  },

  async get(id: string): Promise<ModelProvider | null> {
    const list = await this.list()
    return list.find((p) => p.id === id) || null
  },

  /** 创建/更新 provider:写入 config.yaml 的 providers */
  async upsert(
    id: string,
    data: { name: string; type: ProviderType; baseUrl: string; apiKey: string },
  ): Promise<ModelProvider> {
    const config = await readConfig()
    const providers = (config.providers || {}) as Record<string, HermesProvider>
    providers[id] = {
      name: data.name,
      base_url: data.baseUrl,
      api_key: data.apiKey,
      models: providers[id]?.models || [],
    }
    config.providers = providers
    await writeConfig(config)
    const result = await this.get(id)
    return result!
  },

  async create(data: {
    name: string
    type: ProviderType
    baseUrl: string
    apiKey: string
  }): Promise<ModelProvider> {
    const id = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return this.upsert(id, data)
  },

  async update(
    id: string,
    data: { name: string; type: ProviderType; baseUrl: string; apiKey: string },
  ): Promise<ModelProvider | null> {
    return this.upsert(id, data)
  },

  async remove(id: string): Promise<boolean> {
    const config = await readConfig()
    const providers = (config.providers || {}) as Record<string, HermesProvider>
    if (!providers[id]) return false
    delete providers[id]
    config.providers = providers
    await writeConfig(config)
    return true
  },

  /** 测试连通性:对 base_url 发 /v1/models(用 .env 中的真实 API key) */
  async test(id: string): Promise<{ ok: boolean; message: string; latency?: number }> {
    const provider = await this.get(id)
    if (!provider) return { ok: false, message: '提供商不存在' }
    if (!provider.baseUrl) return { ok: false, message: '未配置 base_url' }
    // 解析真实 API key:provider.apiKey 可能是明文或 "(在 .env 配置)" 占位符
    let apiKey = provider.apiKey
    if (!apiKey || apiKey.startsWith('(')) {
      // 从 .env 读取:用 provider 名或 id 推断 env 变量名
      const envKeys = await readEnvKeys()
      const providerName = id.startsWith('model:')
        ? id.replace('model:', '')
        : id.replace('provider:', '')
      apiKey = resolveProviderApiKeyReal(providerName, envKeys) || ''
    }
    const start = Date.now()
    try {
      const url = new URL('/v1/models', provider.baseUrl)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(url, {
        method: 'GET',
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: controller.signal,
      })
      clearTimeout(timer)
      const latency = Date.now() - start
      return res.ok
        ? { ok: true, message: `连通正常,延迟 ${latency}ms`, latency }
        : { ok: false, message: `HTTP ${res.status}`, latency }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : '测试失败' }
    }
  },
}

function inferProviderType(baseUrl: string): ProviderType {
  const u = baseUrl.toLowerCase()
  if (u.includes('openai.com')) return 'openai'
  if (u.includes('anthropic.com')) return 'anthropic'
  if (u.includes('azure')) return 'azure'
  if (u.includes('localhost') || u.includes('127.0.0.1')) return 'ollama'
  return 'custom'
}

// ============ Channels / 通知凭据(.env)============
// hermes-agent 通过 .env 配置通知平台凭据
const CHANNEL_PLATFORMS: {
  id: string
  name: string
  type: NotifyChannel['type']
  envKeys: string[]
}[] = [
  { id: 'telegram', name: 'Telegram', type: 'webhook', envKeys: ['TELEGRAM_BOT_TOKEN'] },
  { id: 'discord', name: 'Discord', type: 'webhook', envKeys: ['DISCORD_BOT_TOKEN'] },
  { id: 'slack', name: 'Slack', type: 'slack', envKeys: ['SLACK_BOT_TOKEN'] },
  { id: 'email', name: '邮件', type: 'email', envKeys: ['EMAIL_ADDRESS'] },
  { id: 'whatsapp', name: 'WhatsApp', type: 'webhook', envKeys: ['WHATSAPP_ENABLED'] },
  { id: 'signal', name: 'Signal', type: 'webhook', envKeys: ['SIGNAL_HTTP_URL'] },
  { id: 'matrix', name: 'Matrix', type: 'webhook', envKeys: ['MATRIX_HOMESERVER_URL'] },
  { id: 'feishu', name: '飞书', type: 'feishu', envKeys: ['FEISHU_APP_ID'] },
  { id: 'wecom', name: '企业微信', type: 'wecom', envKeys: ['WECOM_BOT_ID'] },
  { id: 'dingtalk', name: '钉钉', type: 'webhook', envKeys: ['DINGTALK_CLIENT_ID'] },
]

export const hermesChannels = {
  /** 读取 .env,检测已配置的通知平台 */
  async list(): Promise<NotifyChannel[]> {
    const envKeys = await readEnvKeys()
    return CHANNEL_PLATFORMS.map((p) => {
      const hasAll = p.envKeys.every((k) => envKeys[k])
      const config: Record<string, string> = {}
      for (const k of p.envKeys) {
        if (envKeys[k]) config[k] = '(已配置)'
      }
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        config,
        enabled: hasAll,
        createdAt: '',
        updatedAt: '',
      }
    })
  },

  async get(id: string): Promise<NotifyChannel | null> {
    const list = await this.list()
    return list.find((c) => c.id === id) || null
  },

  /** 更新凭据:写入 .env */
  async update(
    id: string,
    data: { config: Record<string, string> },
  ): Promise<NotifyChannel | null> {
    const platform = CHANNEL_PLATFORMS.find((p) => p.id === id)
    if (!platform) throw new Error('未知渠道')
    await updateEnv(data.config)
    return this.get(id)
  },

  async create(): Promise<NotifyChannel> {
    throw new Error('通知渠道由 hermes-agent 内置,请通过编辑更新凭据')
  },

  async remove(): Promise<boolean> {
    throw new Error('内置渠道不可删除')
  },

  /** 测试发送:检查凭据是否完整 */
  async test(id: string): Promise<{ ok: boolean; message: string }> {
    const ch = await this.get(id)
    if (!ch) return { ok: false, message: '渠道不存在' }
    if (ch.enabled) {
      return {
        ok: true,
        message: `${ch.name} 凭据已配置,可通过 "hermes cron create --deliver ${id}" 测试发送`,
      }
    }
    return { ok: false, message: `${ch.name} 凭据未配置,请在 .env 中设置 ${ch.config ? '' : '对应环境变量'}` }
  },
}

// ============ Gateway(hermes gateway + 8642 API)============
export const hermesGateway = {
  /** 列出本机 hermes-agent gateway(单节点,实时状态) */
  async list(): Promise<AgentGateway[]> {
    const status = await this.getStatus()
    return [
      {
        id: 'local-agent',
        name: '本机 Hermes Agent',
        endpoint: `http://127.0.0.1:${GATEWAY_API}`,
        upstreams: [],
        authType: 'none',
        rateLimit: { enabled: false, rps: 0, burst: 0 },
        status: status.status,
        routes: [
          { path: '/v1/chat/completions', upstream: 'agent', enabled: status.status === 'online' },
          { path: '/v1/models', upstream: 'agent', enabled: status.status === 'online' },
        ],
        createdAt: '',
        updatedAt: new Date().toISOString(),
      },
    ]
  },

  async get(): Promise<AgentGateway | null> {
    const list = await this.list()
    return list[0] || null
  },

  /** 解析 hermes gateway status + 探活 API 端口 */
  async getStatus(): Promise<{ status: GatewayStatus; detail: string }> {
    // 探活 8642
    const online = await probeApi()
    if (online) return { status: 'online', detail: `API 服务运行中 (端口 ${GATEWAY_API})` }
    // 检查 hermes gateway status 输出
    try {
      const stdout = await runHermes(['gateway', 'status'], 8000)
      if (/not running|✗/i.test(stdout)) {
        return { status: 'offline', detail: 'Gateway 未运行,执行 hermes gateway run 启动' }
      }
      return { status: 'online', detail: stdout.trim() }
    } catch (e) {
      return {
        status: 'unknown',
        detail: e instanceof Error ? e.message : '无法获取状态',
      }
    }
  },

  /** 探活:GET /v1/models */
  async ping(): Promise<{ status: GatewayStatus; latency?: number; error?: string }> {
    const start = Date.now()
    const online = await probeApi()
    const latency = Date.now() - start
    return online
      ? { status: 'online', latency }
      : { status: 'offline', error: `API 端口 ${GATEWAY_API} 不可达,请启动 hermes gateway` }
  },

  /** 启动 gateway:优先用已安装的系统服务,否则后台运行 gateway run */
  async start(): Promise<{ message: string }> {
    const { spawn } = await import('node:child_process')
    return new Promise((resolve) => {
      // gateway run 是前台阻塞,用 nohup + detached 后台启动
      // 注意:hermes gateway run 不接受 --host 参数,只有 --replace/--force/--no-supervise
      const child = spawn(
        'nohup',
        [HERMES_BIN, 'gateway', 'run', '--replace'],
        {
          detached: true,
          stdio: 'ignore',
          env: { ...process.env, HERMES_HOME },
        },
      )
      child.unref()
      // gateway 启动较慢,给足时间再提示
      setTimeout(
        () => resolve({ message: 'Gateway 启动指令已发送,正在初始化(约需数秒),请稍后点击刷新' }),
        2000,
      )
    })
  },

  /** 安装为系统服务 */
  async install(): Promise<{ message: string }> {
    const stdout = await runHermes(['gateway', 'install'], 30000)
    return { message: stdout.trim() || '安装指令已执行' }
  },

  /** 停止 gateway */
  async stop(): Promise<{ message: string }> {
    try {
      const stdout = await runHermes(['gateway', 'stop'], 10000)
      return { message: stdout.trim() || '停止指令已执行' }
    } catch (e) {
      return { message: e instanceof Error ? e.message : '停止失败' }
    }
  },
}

/** 探活 hermes-agent API(8642 /v1/models) */
async function probeApi(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`http://127.0.0.1:${GATEWAY_API}/v1/models`, {
      signal: controller.signal,
    })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

// ============ config.yaml 读写 ============
export async function readConfig(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(CONFIG_YAML, 'utf-8')
    return (parseYaml(raw) || {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function writeConfig(config: Record<string, unknown>): Promise<void> {
  await fs.mkdir(HERMES_HOME, { recursive: true })
  await fs.writeFile(CONFIG_YAML, stringifyYaml(config), 'utf-8')
}

// ============ .env 读写 ============
/** 读取 .env 为 key->value(值脱敏判断是否存在) */
async function readEnvKeys(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(ENV_FILE, 'utf-8')
    const result: Record<string, string> = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (m) result[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return result
  } catch {
    return {}
  }
}

/** 读取 .env 完整内容(编辑用) */
export async function readEnvRaw(): Promise<string> {
  try {
    return await fs.readFile(ENV_FILE, 'utf-8')
  } catch {
    return ''
  }
}

/** 更新 .env 中的若干 key(保留其他行) */
async function updateEnv(updates: Record<string, string>): Promise<void> {
  let raw = await readEnvRaw()
  const lines = raw.split('\n')
  for (const [key, value] of Object.entries(updates)) {
    if (!value && value !== '') continue
    const idx = lines.findIndex((l) => new RegExp(`^\\s*${key}\\s*=`).test(l))
    if (idx >= 0) {
      lines[idx] = `${key}=${value}`
    } else {
      lines.push(`${key}=${value}`)
    }
  }
  raw = lines.join('\n')
  await fs.mkdir(HERMES_HOME, { recursive: true })
  await fs.writeFile(ENV_FILE, raw, 'utf-8')
}

/** provider 名 -> 对应的 API key 环境变量名 */
const PROVIDER_API_KEY_ENV: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  google: 'GOOGLE_API_KEY',
  gemini: 'GEMINI_API_KEY',
  xai: 'XAI_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  together: 'TOGETHER_API_KEY',
  grok: 'XAI_API_KEY',
  nous: 'NOUS_API_KEY',
}

/** 根据 provider 名解析对应的 API key(只判断是否存在,不返回明文) */
function resolveProviderApiKey(
  providerName: string,
  envKeys: Record<string, string>,
): string | null {
  const key =
    PROVIDER_API_KEY_ENV[providerName.toLowerCase()] ||
    `${providerName.toUpperCase()}_API_KEY`
  return envKeys[key] ? key : null
}

/** 根据 provider 名读取 .env 中真实的 API key 明文(用于测试连通性) */
function resolveProviderApiKeyReal(
  providerName: string,
  envKeys: Record<string, string>,
): string | null {
  const key =
    PROVIDER_API_KEY_ENV[providerName.toLowerCase()] ||
    `${providerName.toUpperCase()}_API_KEY`
  return envKeys[key] || null
}

/** 推断内置 provider(基于 .env 已配置的 API key) */
function inferBuiltinProviders(
  envKeys: Record<string, string>,
): { id: string; name: string; type: ProviderType; baseUrl: string; hasKey: boolean }[] {
  const builtin = [
    { id: 'openai', name: 'OpenAI', type: 'openai' as ProviderType, baseUrl: 'https://api.openai.com/v1', key: 'OPENAI_API_KEY' },
    { id: 'anthropic', name: 'Anthropic', type: 'anthropic' as ProviderType, baseUrl: 'https://api.anthropic.com', key: 'ANTHROPIC_API_KEY' },
    { id: 'openrouter', name: 'OpenRouter', type: 'custom' as ProviderType, baseUrl: 'https://openrouter.ai/api/v1', key: 'OPENROUTER_API_KEY' },
    { id: 'deepseek', name: 'DeepSeek', type: 'custom' as ProviderType, baseUrl: 'https://api.deepseek.com/v1', key: 'DEEPSEEK_API_KEY' },
    { id: 'google', name: 'Google', type: 'custom' as ProviderType, baseUrl: 'https://generativelanguage.googleapis.com/v1', key: 'GOOGLE_API_KEY' },
    { id: 'xai', name: 'xAI (Grok)', type: 'custom' as ProviderType, baseUrl: 'https://api.x.ai/v1', key: 'XAI_API_KEY' },
    { id: 'groq', name: 'Groq', type: 'custom' as ProviderType, baseUrl: 'https://api.groq.com/openai/v1', key: 'GROQ_API_KEY' },
    { id: 'mistral', name: 'Mistral', type: 'custom' as ProviderType, baseUrl: 'https://api.mistral.ai/v1', key: 'MISTRAL_API_KEY' },
    { id: 'together', name: 'Together AI', type: 'custom' as ProviderType, baseUrl: 'https://api.together.xyz/v1', key: 'TOGETHER_API_KEY' },
  ]
  return builtin
    .filter((b) => envKeys[b.key])
    .map((b) => ({ id: b.id, name: b.name, type: b.type, baseUrl: b.baseUrl, hasKey: true }))
}

// ============ 初始化(只确保目录存在,不写 seed)============
export async function ensureHermesDirs(): Promise<void> {
  await fs.mkdir(HERMES_HOME, { recursive: true })
  await fs.mkdir(path.join(HERMES_HOME, 'cron'), { recursive: true })
  await fs.mkdir(SKILLS_DIR, { recursive: true })
}
