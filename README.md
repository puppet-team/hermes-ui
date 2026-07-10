# Hermes · AI Agent 技能管理后台

**直接对接本地 hermes-agent**(`~/.hermes/`),通过 hermes CLI + 文件读写真实管理:技能(`~/.hermes/skills`)、定时任务(`hermes cron`)、模型提供商(`config.yaml`)、通知渠道(`.env` 凭据)、网关服务(`hermes gateway`)。所有操作直接生效于真实 agent,不维护任何平行假数据。

## 技术栈

- **前端**:React 19 + TypeScript + Vite + Tailwind CSS 3
- **编辑器**:@uiw/react-codemirror(Markdown 高亮 + 实时预览)
- **后端**:Express 5(调用 hermes CLI + 读写 `~/.hermes/` 真实文件)
- **路由**:React Router v6

## 前提

需本地安装 hermes-agent(Nous Research,默认安装在 `~/.hermes/`):
```bash
hermes --version   # 确认可用
```
若安装路径非默认,用环境变量指定:
```bash
HERMES_HOME=/path/to/.hermes      # hermes-agent 主目录
HERMES_BIN=/path/to/hermes        # hermes CLI 可执行文件
HERMES_API_PORT=8642              # gateway API 端口
```

## 功能模块(对接真实 hermes-agent)

| 模块 | 路径 | 数据源 | 说明 |
|------|------|--------|------|
| 技能列表 | `/` | `~/.hermes/skills/` | SKILL.md 读写、版本发布、备份导入导出 |
| 备份中心 | `/backups` | `.versions/` | 版本快照管理 |
| 定时任务 | `/jobs` | `hermes cron` | 创建/删除走 CLI,真实调度;读写 `cron/jobs.json` |
| 模型管理 | `/models` | `config.yaml` providers + `.env` | 自定义提供商、连通性测试 |
| 通知渠道 | `/channels` | `~/.hermes/.env` | telegram/discord/slack/email 等凭据配置 |
| 网关管理 | `/gateways` | `hermes gateway` | 启动/停止/安装服务,探活 8642 API |
| 设置 | `/settings` | - | 主题、路径、关于 |

## 目录结构

```
hermes-ui/
├── server/              # 本地 Express 服务(读写本机技能/配置目录)
│   ├── index.ts         # REST 接口
│   ├── skillsStore.ts   # 技能文件/版本/备份(根目录 ~/.hermes/skills)
│   ├── hermesAgent.ts   # hermes-agent 桥接:CLI 封装 + config.yaml/.env/cron 读写
│   ├── configStore.ts   # 代理层:委托给 hermesAgent
│   └── frontmatter.ts   # SKILL.md frontmatter 解析
└── src/
    ├── api/                 # /api 封装(skills/jobs/models/channels/gateways)
    ├── components/          # UI 组件(layout/ui/skill)
    ├── context/             # 主题
    ├── lib/                 # frontmatter 解析 + markdown 渲染
    ├── pages/               # 10 个页面
    └── types/               # 共享类型
```

## 数据流(真实 hermes-agent)

```
UI  ──HTTP──>  Express(:8787)  ──CLI/文件──>  hermes-agent(~/.hermes/)
                                    │
                  skills  ──>  ~/.hermes/skills/<name>/SKILL.md
                  cron    ──>  hermes cron create/delete  ──>  cron/jobs.json
                  models  ──>  config.yaml 的 providers + .env API keys
                  channels──>  ~/.hermes/.env(telegram/discord/slack 凭据)
                  gateway ──>  hermes gateway run/stop/status  +  探活 :8642
```

## 技能文件格式

每个技能是根目录下的一个文件夹:

```
~/.hermes/skills/
├── my-skill/
│   ├── SKILL.md            # 元数据(frontmatter)+ 正文
│   └── .versions/          # 历史版本快照(发布时自动生成)
└── ...
```

`SKILL.md` frontmatter:

```markdown
---
name: code-review
description: 审查代码并给出改进建议
version: 1.2.0
category: 开发
status: active          # active | draft | deprecated
updatedAt: 2026-07-09
---

# 技能正文(markdown)
```

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 http://localhost:5173 。后端服务会自动在 8787 端口启动,首次运行会在 `~/hermes-skills/` 写入两个示例技能。

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 同时启动前端(Vite 5173)与后端(Express 8787) |
| `pnpm dev:fe` | 仅启动前端 |
| `pnpm dev:server` | 仅启动后端(支持 watch 热重载) |
| `pnpm build` | 类型检查 + 生产构建 |
| `pnpm lint` | 代码检查(oxlint) |

## 环境变量(对接 hermes-agent)

```bash
HERMES_HOME=/path/to/.hermes      # hermes-agent 主目录(默认 ~/.hermes)
HERMES_BIN=/path/to/hermes        # hermes CLI(默认 ~/.hermes/bin/hermes)
HERMES_API_PORT=8642              # gateway API 端口
```

## 功能一览(对接真实 hermes-agent)

- **技能列表**:读写 `~/.hermes/skills/`,卡片/表格视图、搜索、分类筛选
- **编写编辑**:CodeMirror 编辑器 + 实时 Markdown 预览,分屏切换
- **版本发布**:发布新版本时自动创建快照,支持版本号建议、回滚
- **备份中心**:导出全部技能(JSON)/ 单个技能(md);导入 .md 或 .json
- **定时任务**:通过 `hermes cron create/edit/delete` 真实创建调度任务,读写 `cron/jobs.json`,启用切换
- **模型管理**:读写 `config.yaml` 的 providers + `.env` API keys,连通性测试,密钥安全显示
- **通知渠道**:管理 `~/.hermes/.env` 中的 telegram/discord/slack/email 等凭据,按平台显示状态
- **网关管理**:`hermes gateway` 启动/停止/安装服务,探活 8642 OpenAI 兼容 API
- **暗色 / 亮色主题**:一键切换,自动跟随系统偏好并记忆

## 验证对接

```bash
pnpm dev
# 在 UI 创建一个 cron 任务后,CLI 能看到:
hermes cron list
```
