import apiClient from "./client"

export interface AssistantMetrics {
  total_trades: number
  net_pnl: number
  win_rate: number
  profit_factor: number
  max_drawdown: number
  avg_win: number
  avg_loss: number
  expectancy: number
}

export interface AssistantResponse {
  summary: string
  insights: string[]
  metrics: AssistantMetrics
  disclaimer: string
}

export const assistantApi = {
  getInsights: async (): Promise<AssistantResponse> => {
    const res = await apiClient.get<AssistantResponse>("/assistant/insights")
    return res.data
  },

  query: async (queryText: string): Promise<AssistantResponse> => {
    const res = await apiClient.post<AssistantResponse>("/assistant/query", { query: queryText })
    return res.data
  },
}
