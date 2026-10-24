import apiClient from "./client"

export interface DashboardSummary {
  total_trades: number
  net_realized_pnl: string
  gross_realized_pnl: string
  total_commission: string
  total_fees: string
  win_rate: number
  winning_trades: number
  losing_trades: number
  breakeven_trades: number
  profit_factor: number | null
  average_win: string
  average_loss: string
  win_loss_ratio: number | null
  expectancy: string
  max_drawdown_amount: string
  max_drawdown_percent: number
  average_r_multiple: number | null
  best_trade: string
  worst_trade: string
  current_equity: string
}

export interface EquityCurvePoint {
  trade_id?: string
  symbol?: string
  timestamp: string
  trade_pnl: string
  cumulative_pnl: string
  equity: string
  drawdown: string
}

export interface DailyPnLPoint {
  date: string
  net_pnl: string
  gross_pnl: string
  trades_count: number
  win_rate: number
}

export interface SymbolBreakdownItem {
  symbol: string
  trades_count: number
  win_rate: number
  net_pnl: string
  profit_factor: number | null
}

export const analyticsApi = {
  getSummary: async (params?: { account_id?: string; start_date?: string; end_date?: string }): Promise<DashboardSummary> => {
    const res = await apiClient.get<DashboardSummary>("/dashboard/summary", { params })
    return res.data
  },

  getEquityCurve: async (params?: { account_id?: string; start_date?: string; end_date?: string }): Promise<EquityCurvePoint[]> => {
    const res = await apiClient.get<EquityCurvePoint[]>("/dashboard/equity-curve", { params })
    return res.data
  },

  getDailyPnL: async (params?: { account_id?: string; start_date?: string; end_date?: string }): Promise<DailyPnLPoint[]> => {
    const res = await apiClient.get<DailyPnLPoint[]>("/dashboard/daily-pnl", { params })
    return res.data
  },

  getBySymbol: async (params?: { account_id?: string; start_date?: string; end_date?: string }): Promise<SymbolBreakdownItem[]> => {
    const res = await apiClient.get<SymbolBreakdownItem[]>("/analytics/by-symbol", { params })
    return res.data
  },
}
