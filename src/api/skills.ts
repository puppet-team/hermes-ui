import type {
  SkillSummary,
  SkillDetail,
  SkillVersion,
  BackupItem,
} from '../types'

const BASE = '/api'

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `请求失败 (${res.status})`
    try {
      const body = await res.json()
      message = body.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const skillsApi = {
  list: () => request<SkillSummary[]>('/skills'),

  get: (id: string) => request<SkillDetail>(`/skills/${encodeURIComponent(id)}`),

  create: (content: string) =>
    request<{ id: string; created: boolean }>('/skills', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  save: (id: string, content: string) =>
    request<{ id: string; created: boolean }>(`/skills/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  remove: (id: string) =>
    request<{ ok: boolean }>(`/skills/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listVersions: (id: string) =>
    request<SkillVersion[]>(`/skills/${encodeURIComponent(id)}/versions`),

  publishVersion: (id: string, version: string, content: string, snapshot = true) =>
    request<SkillVersion | null>(`/skills/${encodeURIComponent(id)}/versions`, {
      method: 'POST',
      body: JSON.stringify({ version, content, snapshot }),
    }),

  rollback: (id: string, filename: string) =>
    request<{ ok: boolean }>(`/skills/${encodeURIComponent(id)}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ filename }),
    }),

  deleteVersion: (id: string, filename: string) =>
    request<{ ok: boolean }>(
      `/skills/${encodeURIComponent(id)}/versions/${encodeURIComponent(filename)}`,
      { method: 'DELETE' },
    ),

  getVersionContent: async (id: string, filename: string): Promise<string> => {
    const res = await fetch(
      `${BASE}/skills/${encodeURIComponent(id)}/versions/${encodeURIComponent(filename)}`,
    )
    if (!res.ok) throw new Error('读取版本内容失败')
    return res.text()
  },

  exportUrl: (id: string) => `${BASE}/skills/${encodeURIComponent(id)}/export`,
  exportAllUrl: () => `${BASE}/backups/export`,

  importSkill: (id: string, content: string) =>
    request<{ id: string; created: boolean }>('/backups/import', {
      method: 'POST',
      body: JSON.stringify({ id, content }),
    }),
}

export const backupsApi = {
  list: () => request<BackupItem[]>('/backups'),
  exportAllUrl: () => `${BASE}/backups/export`,
  importSkill: skillsApi.importSkill,
}
