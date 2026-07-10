import { request } from './client'
import type { ModelProvider, ProviderType, ModelTestResult } from '../types'

export interface ProviderInput {
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
}

export const modelsApi = {
  list: () => request<ModelProvider[]>('/models'),
  get: (id: string) => request<ModelProvider>(`/models/${encodeURIComponent(id)}`),
  create: (data: ProviderInput) =>
    request<ModelProvider>('/models', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: ProviderInput) =>
    request<ModelProvider>(`/models/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/models/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  test: (id: string) =>
    request<ModelTestResult>(`/models/${encodeURIComponent(id)}/test`, { method: 'POST' }),
}
