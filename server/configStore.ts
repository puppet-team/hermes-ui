// 配置模块代理层:委托给 hermesAgent 桥接真实 hermes-agent
// 不再维护独立的 ~/hermes-config/ JSON 文件,所有数据来自真实 hermes-agent
import {
  hermesCron,
  hermesModels,
  hermesChannels,
  hermesGateway,
  ensureHermesDirs,
  getHermesHome,
} from './hermesAgent.ts'

export {
  hermesCron as jobsStore,
  hermesModels as modelsStore,
  hermesChannels as channelsStore,
  hermesGateway as gatewaysStore,
  ensureHermesDirs as ensureConfigSeed,
  getHermesHome,
}

// 模型连通性测试
export async function testModelProvider(
  id: string,
): Promise<{ ok: boolean; message: string; latency?: number }> {
  return hermesModels.test(id)
}

// 通知渠道测试发送
export async function testChannel(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  return hermesChannels.test(id)
}
