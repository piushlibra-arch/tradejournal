import apiClient from "./client"

export interface BacktestRequestPayload {
  strategy_name: string
  symbol?: string
  timeframe?: string
  start_date?: string
  end_date?: string
  initial_capital?: number | string
  risk_per_trade_pct?: number | string
  target_rr?: number | string
  win_rate_assumed?: number | null
}

export interface BacktestTradeItem {
  trade_num: number
  entry_time: string
  exit_time: string
  symbol: string
  direction: string
  entry_price: string
  exit_price: string
  quantity: string
  pnl: string
  r_multiple: string
  cumulative_equity: string
}

export interface BacktestSummary {
  strategy_name: string
  symbol: string
  timeframe: string
  total_bars_evaluated: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  initial_capital: string
  ending_capital: string
  net_profit: string
  return_pct: number
  profit_factor: number
  max_drawdown_pct: number
  sharpe_ratio: number
  trades: BacktestTradeItem[]
  equity_curve: { date: string; equity: number }[]
}

export const backtestApi = {
  run: async (payload: BacktestRequestPayload): Promise<BacktestSummary> => {
    const res = await apiClient.post<BacktestSummary>("/backtest/run", payload)
    return res.data
  },
}
