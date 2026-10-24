import apiClient from "./client"

export interface Strategy {
  id: string
  user_id: string
  name: string
  description: string | null
  asset_class: string | null
  status: string
  entry_rules: Record<string, any> | null
  exit_rules: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface StrategyPerformance {
  strategy_id: string
  strategy_name: string
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  net_pnl: string
  profit_factor: number
  avg_trade_pnl: string
}

export interface StrategyCreatePayload {
  name: string
  description?: string | null
  asset_class?: string | null
  status?: string
  entry_rules?: Record<string, any> | null
  exit_rules?: Record<string, any> | null
}

export interface StrategyListResponse {
  items: Strategy[]
  total: number
}

export const strategiesApi = {
  list: async (status?: string): Promise<StrategyListResponse> => {
    const params: Record<string, string> = {}
    if (status) params.status = status
    const res = await apiClient.get<StrategyListResponse>("/strategies", { params })
    return res.data
  },

  get: async (id: string): Promise<Strategy> => {
    const res = await apiClient.get<Strategy>(`/strategies/${id}`)
    return res.data
  },

  create: async (payload: StrategyCreatePayload): Promise<Strategy> => {
    const res = await apiClient.post<Strategy>("/strategies", payload)
    return res.data
  },

  update: async (id: string, payload: Partial<StrategyCreatePayload>): Promise<Strategy> => {
    const res = await apiClient.patch<Strategy>(`/strategies/${id}`, payload)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/strategies/${id}`)
  },

  getPerformance: async (id: string): Promise<StrategyPerformance> => {
    const res = await apiClient.get<StrategyPerformance>(`/strategies/${id}/performance`)
    return res.data
  },
}
