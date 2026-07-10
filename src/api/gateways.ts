import { request } from './client'
import type { AgentGateway, GatewayStatus } from '../types'

export interface GatewayActionResponse {
  message: string
}
export interface GatewayStatusInfo {
  status: GatewayStatus
  detail: string
}
export interface GatewayPingResult {
  status: GatewayStatus
  latency?: number
  error?: string
}

export const gatewaysApi = {
  list: () => request<AgentGateway[]>('/gateways'),
  status: () => request<GatewayStatusInfo>('/gateways/status'),
  ping: () => request<GatewayPingResult>('/gateways/ping', { method: 'POST' }),
  start: () => request<GatewayActionResponse>('/gateways/start', { method: 'POST' }),
  stop: () => request<GatewayActionResponse>('/gateways/stop', { method: 'POST' }),
  install: () => request<GatewayActionResponse>('/gateways/install', { method: 'POST' }),
}
