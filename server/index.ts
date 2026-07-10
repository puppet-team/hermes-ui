import express from 'express'
import cors from 'cors'
import {
  ensureSeed,
  getRoot,
  listSkills,
  getSkill,
  saveSkill,
  deleteSkill,
  listVersions,
  publishVersion,
  rollbackTo,
  deleteVersion,
  getVersionContent,
  listBackups,
  exportSkill,
  exportAll,
  importSkill,
} from './skillsStore.ts'
import {
  ensureConfigSeed,
  getHermesHome,
  jobsStore,
  modelsStore,
  channelsStore,
  gatewaysStore,
  testModelProvider,
  testChannel,
} from './configStore.ts'

const app = express()
const PORT = 8787

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.text({ limit: '10mb', type: 'text/plain' }))

// 错误包装
function asyncHandler(
  fn: (req: express.Request, res: express.Response) => Promise<unknown>,
) {
  return async (req: express.Request, res: express.Response) => {
    try {
      await fn(req, res)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error'
      const code = (err as { code?: string })?.code === 'ENOENT' ? 404 : 500
      res.status(code).json({ error: message })
    }
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, root: getRoot() })
})

app.get(
  '/api/root',
  asyncHandler(async (_req, res) => {
    await ensureSeed()
    res.json({ root: getRoot() })
  }),
)

// 技能列表
app.get(
  '/api/skills',
  asyncHandler(async (_req, res) => {
    res.json(await listSkills())
  }),
)

// 单个技能详情
app.get(
  '/api/skills/:id',
  asyncHandler(async (req, res) => {
    const skill = await getSkill(String(req.params.id))
    if (!skill) {
      res.status(404).json({ error: '技能不存在' })
      return
    }
    res.json(skill)
  }),
)

// 保存(新建/更新)
app.put(
  '/api/skills/:id',
  asyncHandler(async (req, res) => {
    const content = typeof req.body === 'string' ? req.body : req.body?.content
    if (!content) {
      res.status(400).json({ error: '缺少 content' })
      return
    }
    const result = await saveSkill(String(req.params.id), content)
    res.json(result)
  }),
)

// 新建技能
app.post(
  '/api/skills',
  asyncHandler(async (req, res) => {
    const content = typeof req.body === 'string' ? req.body : req.body?.content
    if (!content) {
      res.status(400).json({ error: '缺少 content' })
      return
    }
    const result = await saveSkill(undefined, content)
    res.status(201).json(result)
  }),
)

// 删除
app.delete(
  '/api/skills/:id',
  asyncHandler(async (req, res) => {
    await deleteSkill(String(req.params.id))
    res.json({ ok: true })
  }),
)

// 版本历史
app.get(
  '/api/skills/:id/versions',
  asyncHandler(async (req, res) => {
    res.json(await listVersions(String(req.params.id)))
  }),
)

// 读取版本快照内容
app.get(
  '/api/skills/:id/versions/:filename',
  asyncHandler(async (req, res) => {
    const content = await getVersionContent(String(req.params.id), String(req.params.filename))
    res.type('text/plain').send(content)
  }),
)

// 发布新版本
app.post(
  '/api/skills/:id/versions',
  asyncHandler(async (req, res) => {
    const { version, content, snapshot } = req.body || {}
    if (!version || !content) {
      res.status(400).json({ error: '缺少 version 或 content' })
      return
    }
    const snap = await publishVersion(
      String(req.params.id),
      version,
      content,
      snapshot !== false,
    )
    res.status(201).json(snap)
  }),
)

// 回滚
app.post(
  '/api/skills/:id/rollback',
  asyncHandler(async (req, res) => {
    const { filename } = req.body || {}
    if (!filename) {
      res.status(400).json({ error: '缺少 filename' })
      return
    }
    await rollbackTo(String(req.params.id), filename)
    res.json({ ok: true })
  }),
)

// 删除版本快照
app.delete(
  '/api/skills/:id/versions/:filename',
  asyncHandler(async (req, res) => {
    await deleteVersion(String(req.params.id), String(req.params.filename))
    res.json({ ok: true })
  }),
)

// 备份中心:列出全部备份
app.get(
  '/api/backups',
  asyncHandler(async (_req, res) => {
    res.json(await listBackups())
  }),
)

// 导出单个技能
app.get(
  '/api/skills/:id/export',
  asyncHandler(async (req, res) => {
    const { filename, content } = await exportSkill(String(req.params.id))
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    )
    res.type('text/markdown').send(content)
  }),
)

// 导出全部
app.get(
  '/api/backups/export',
  asyncHandler(async (_req, res) => {
    const { filename, content } = await exportAll()
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    )
    res.type('application/json').send(content)
  }),
)

// 导入技能
app.post(
  '/api/backups/import',
  asyncHandler(async (req, res) => {
    const { id, content } = req.body || {}
    if (!content) {
      res.status(400).json({ error: '缺少 content' })
      return
    }
    const result = await importSkill(id, content)
    res.status(201).json(result)
  }),
)

// ================ 定时任务 ================
app.get(
  '/api/jobs',
  asyncHandler(async (_req, res) => {
    res.json(await jobsStore.list())
  }),
)
app.post(
  '/api/jobs',
  asyncHandler(async (req, res) => {
    const body = req.body || {}
    if (!body.name || !body.schedule) {
      res.status(400).json({ error: '缺少 name 或 schedule' })
      return
    }
    res.status(201).json(
      await jobsStore.create({
        name: body.name,
        prompt: body.description || body.prompt || '',
        schedule: body.schedule,
        skillId: body.skillId,
        deliver: body.deliver,
      }),
    )
  }),
)
app.get(
  '/api/jobs/:id',
  asyncHandler(async (req, res) => {
    const job = await jobsStore.get(String(req.params.id))
    if (!job) {
      res.status(404).json({ error: '任务不存在' })
      return
    }
    res.json(job)
  }),
)
app.put(
  '/api/jobs/:id',
  asyncHandler(async (req, res) => {
    const job = await jobsStore.update(String(req.params.id), req.body || {})
    if (!job) {
      res.status(404).json({ error: '任务不存在' })
      return
    }
    res.json(job)
  }),
)
app.delete(
  '/api/jobs/:id',
  asyncHandler(async (req, res) => {
    try {
      await jobsStore.remove(String(req.params.id))
      res.json({ ok: true })
    } catch (e) {
      res.status(404).json({ error: e instanceof Error ? e.message : '任务不存在' })
    }
  }),
)
app.post(
  '/api/jobs/:id/toggle',
  asyncHandler(async (req, res) => {
    const job = await jobsStore.toggle(String(req.params.id))
    if (!job) {
      res.status(404).json({ error: '任务不存在' })
      return
    }
    res.json(job)
  }),
)
app.post(
  '/api/jobs/:id/run',
  asyncHandler(async (req, res) => {
    const result = await jobsStore.run(String(req.params.id))
    res.json(result)
  }),
)

// ================ 模型管理 ================
app.get(
  '/api/models',
  asyncHandler(async (_req, res) => {
    res.json(await modelsStore.list())
  }),
)
app.post(
  '/api/models',
  asyncHandler(async (req, res) => {
    const body = req.body || {}
    if (!body.name || !body.baseUrl) {
      res.status(400).json({ error: '缺少 name 或 baseUrl' })
      return
    }
    res.status(201).json(
      await modelsStore.create({
        name: body.name,
        type: body.type || 'custom',
        baseUrl: body.baseUrl,
        apiKey: body.apiKey || '',
      }),
    )
  }),
)
app.get(
  '/api/models/:id',
  asyncHandler(async (req, res) => {
    const m = await modelsStore.get(String(req.params.id))
    if (!m) {
      res.status(404).json({ error: '提供商不存在' })
      return
    }
    res.json(m)
  }),
)
app.put(
  '/api/models/:id',
  asyncHandler(async (req, res) => {
    const body = req.body || {}
    const m = await modelsStore.update(String(req.params.id), {
      name: body.name,
      type: body.type || 'custom',
      baseUrl: body.baseUrl,
      apiKey: body.apiKey || '',
    })
    if (!m) {
      res.status(404).json({ error: '提供商不存在' })
      return
    }
    res.json(m)
  }),
)
app.delete(
  '/api/models/:id',
  asyncHandler(async (req, res) => {
    const ok = await modelsStore.remove(String(req.params.id))
    if (!ok) {
      res.status(404).json({ error: '提供商不存在' })
      return
    }
    res.json({ ok: true })
  }),
)
app.post(
  '/api/models/:id/test',
  asyncHandler(async (req, res) => {
    res.json(await testModelProvider(String(req.params.id)))
  }),
)

// ================ 通知渠道 ================
app.get(
  '/api/channels',
  asyncHandler(async (_req, res) => {
    res.json(await channelsStore.list())
  }),
)
app.post(
  '/api/channels',
  asyncHandler(async (_req, res) => {
    res.status(400).json({ error: '通知渠道由 hermes-agent 内置,请通过编辑更新凭据' })
  }),
)
app.get(
  '/api/channels/:id',
  asyncHandler(async (req, res) => {
    const c = await channelsStore.get(String(req.params.id))
    if (!c) {
      res.status(404).json({ error: '渠道不存在' })
      return
    }
    res.json(c)
  }),
)
app.put(
  '/api/channels/:id',
  asyncHandler(async (req, res) => {
    const body = req.body || {}
    try {
      const c = await channelsStore.update(String(req.params.id), {
        config: body.config || {},
      })
      if (!c) {
        res.status(404).json({ error: '渠道不存在' })
        return
      }
      res.json(c)
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : '更新失败' })
    }
  }),
)
app.delete(
  '/api/channels/:id',
  asyncHandler(async (_req, res) => {
    res.status(400).json({ error: '内置渠道不可删除' })
  }),
)
app.post(
  '/api/channels/:id/test',
  asyncHandler(async (req, res) => {
    res.json(await testChannel(String(req.params.id)))
  }),
)

// ================ 网关管理 ================
app.get(
  '/api/gateways',
  asyncHandler(async (_req, res) => {
    res.json(await gatewaysStore.list())
  }),
)
app.post(
  '/api/gateways/start',
  asyncHandler(async (_req, res) => {
    res.json(await gatewaysStore.start())
  }),
)
app.post(
  '/api/gateways/install',
  asyncHandler(async (_req, res) => {
    res.json(await gatewaysStore.install())
  }),
)
app.post(
  '/api/gateways/stop',
  asyncHandler(async (_req, res) => {
    res.json(await gatewaysStore.stop())
  }),
)
app.get(
  '/api/gateways/status',
  asyncHandler(async (_req, res) => {
    res.json(await gatewaysStore.getStatus())
  }),
)
app.post(
  '/api/gateways/ping',
  asyncHandler(async (_req, res) => {
    res.json(await gatewaysStore.ping())
  }),
)

async function start() {
  await ensureSeed()
  await ensureConfigSeed()
  app.listen(PORT, () => {
    console.log(`\n[Hermes] 技能服务已启动 -> http://localhost:${PORT}`)
    console.log(`[Hermes] 技能根目录: ${getRoot()}`)
    console.log(`[Hermes] hermes-agent: ${getHermesHome()}\n`)
  })
}

start()
