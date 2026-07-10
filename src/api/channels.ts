import { request } from './client'
import type { NotifyChannel, ChannelTestResult } from '../types'

export const channelsApi = {
  list: () => request<NotifyChannel[]>('/channels'),
  get: (id: string) => request<NotifyChannel>(`/channels/${encodeURIComponent(id)}`),
  /** 更新渠道凭据(写入 ~/.hermes/.env) */
  update: (id: string, config: Record<string, string>) =>
    request<NotifyChannel>(`/channels/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ config }),
    }),
  test: (id: string) =>
    request<ChannelTestResult>(`/channels/${encodeURIComponent(id)}/test`, { method: 'POST' }),
}
