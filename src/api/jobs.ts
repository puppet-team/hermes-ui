import { request } from './client'
import type { ScheduledJob } from '../types'

export interface JobCreateInput {
  name: string
  description: string
  schedule: string
  type?: string
  skillId?: string
}

export const jobsApi = {
  list: () => request<ScheduledJob[]>('/jobs'),
  get: (id: string) => request<ScheduledJob>(`/jobs/${encodeURIComponent(id)}`),
  create: (data: JobCreateInput) =>
    request<ScheduledJob>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ScheduledJob>) =>
    request<ScheduledJob>(`/jobs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  toggle: (id: string) =>
    request<ScheduledJob>(`/jobs/${encodeURIComponent(id)}/toggle`, { method: 'POST' }),
  run: (id: string) =>
    request<{ message: string }>(`/jobs/${encodeURIComponent(id)}/run`, { method: 'POST' }),
}
