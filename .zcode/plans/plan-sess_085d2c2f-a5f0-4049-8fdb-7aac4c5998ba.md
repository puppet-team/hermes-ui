# 与本地 hermes-agent 对接方案

让 hermes-ui 直接操作真实 hermes-agent(`~/.hermes/`),通过 **hermes CLI + 文件直读写**,并**清掉所有 seed 示例数据**。

## 1. 核心改动:数据源从平行假数据切到真实 hermes-agent

| 模块 | 当前(假数据) | 改后(真实 hermes) |
|------|--------------|-------------------|
| Skills | `~/hermes-skills/` + seed | `~/.hermes/skills/`(真实,env `HERMES_SKILLS_DIR` 默认改指) |
| Jobs | `~/hermes-config/jobs.json` + seed | `~/.hermes/cron/jobs.json`(真实,CLI `hermes cron`) |
| Models | `~/hermes-config/models.json` + seed | `~/.hermes/config.yaml` 的 `providers` + `.env` API keys |
| Channels | `~/hermes-config/channels.json` + seed | `~/.hermes/.env` 的通知凭据(telegram/discord/slack/email...) |
| Gateways | `~/hermes-config/gateways.json` + seed | `hermes gateway status/run/install` + 探测 8642 API |

**清除所有 seed**:四个模块的 `seedXxx()` 函数全部删除/置空,启动时不写任何示例数据,只读真实状态。

## 2. 新增后端 `server/hermesAgent.ts` — hermes-agent 桥接层

封装所有与 hermes-agent 的交互:
- `HERMES_HOME`:默认 `~/.hermes`,尊重 `HERMES_HOME` 环境变量(与 agent 一致)
- **Cron**:读 `~/.hermes/cron/jobs.json`(真实 schema);写走 CLI `hermes cron create/edit/delete`(保证校验/调度正确)
- **Models/Providers**:读 config.yaml(`providers` + `model`)+ `.env` API keys;写用 `hermes config set`
- **Channels/通知凭据**:读 `.env` 中已配置的通知平台(检测 env 变量存在性);写 `.env`
- **Gateway**:调用 `hermes gateway status` 解析状态;`hermes gateway run/install/stop`;探活 8642
- **Skills**:复用 skillsStore,仅改根目录指向 `~/.hermes/skills`

## 3. 各模块适配真实 schema

### Jobs(真实 cron/jobs.json schema)
真实字段与我现在的 UI 类型差异较大,需重映射:
```
真实: {id, name, prompt, skills[], schedule:{kind,run_at,display}, enabled,
       state, next_run_at, last_run_at, deliver, repeat, ...}
```
- 后端 jobsStore 改为读真实 jobs.json,映射成 UI 的 ScheduledJob 类型
- 创建/编辑/删除/启用切换:调用 `hermes cron create/edit/delete` CLI(通过 child_process.execFile)
- "立即执行"暂时标记(无 CLI 直接触发,保留按钮但提示需 gateway 运行)

### Models(providers from config.yaml)
- 读 config.yaml 的 `providers`(自定义提供商,含 name/base_url/models)+ 顶层 `model`(当前模型)
- 读 `.env` 检测哪些 API key 已配置(OpenAI/Anthropic/OpenRouter 等)
- 测试连通性:对 provider 的 base_url 发 /v1/models 请求(沿用现有逻辑)
- 编辑:写回 config.yaml 的 providers(YAML 操作,需装 `yaml` 包)

### Channels(通知凭据 from .env)
hermes 的通知通过 `.env` 配置凭据(TELEGRAM_BOT_TOKEN/DISCORD_BOT_TOKEN/SLACK_BOT_TOKEN/EMAIL_ADDRESS 等)。
- 读 `.env`,检测已配置的平台(按 dump.py 里的平台清单)
- 展示为"已配置/未配置"的渠道列表
- 编辑:写 `.env`(添加/更新凭据)
- 测试:无直接发送 CLI,暂时保留测试按钮但提示

### Gateways(hermes gateway)
- 读:`hermes gateway status` 解析运行状态 + 探活 `http://127.0.0.1:8642/v1/models`
- 启动/停止:`hermes gateway run`(前台)/ `hermes gateway install`(服务)
- 不再存 gateways.json,改为实时状态
- 列表项就是"本机 hermes-agent gateway"这一个真实节点 + 其状态/端口/路由

## 4. 清理工作
- 删除 `server/configStore.ts` 中 jobs/models/channels/gateways 的 seed 函数
- 删除 `~/hermes-config/` 目录(假数据)
- 删除 `~/hermes-skills/` 目录(假数据,真实用 `~/.hermes/skills`)
- skillsStore 的 `ensureSeed`(技能示例)也置空

## 5. 依赖
- 装 `yaml` 包(读写 config.yaml)+ `@types/js-yaml`

## 6. 实施步骤
1. 装 `yaml` 依赖
2. 写 `server/hermesAgent.ts`(CLI 封装 + 文件读写桥接)
3. 改 `server/skillsStore.ts`:根目录指向 `~/.hermes/skills`,清 seed
4. 改 `server/configStore.ts`:清空所有 seed,改为委托 hermesAgent
5. 改 `server/index.ts`:路由适配真实 schema(gateway 启停等)
6. 清理假数据目录 `~/hermes-config`、`~/hermes-skills`
7. 改前端类型 + api 适配真实字段
8. 改 5 个页面适配真实数据展示
9. 验证:`hermes cron create` 在 UI 创建后能在 `hermes cron list` 看到
10. `pnpm build` + `pnpm dev` 验证

## 7. 验证标准
- UI 创建的 cron 任务,`hermes cron list` 能看到真实任务
- UI 显示的 skills 来自 `~/.hermes/skills`
- Gateway 状态反映 `hermes gateway status` 的真实结果
- 启动后无任何 seed 示例数据,空状态友好提示
- 配置改动写入真实 `~/.hermes/config.yaml` 和 `.env`