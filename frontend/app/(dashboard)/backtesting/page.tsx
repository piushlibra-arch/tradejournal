"use client"

import React, { useState } from "react"
import { backtestApi, BacktestSummary } from "@/lib/api/backtest"
import { formatPnL, pnlColor, formatCurrency, cn } from "@/lib/utils"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  FlaskConical,
  Play,
  TrendingUp,
  Percent,
  Activity,
  Layers,
  ShieldAlert,
  Award,
  Sparkles,
  RotateCcw,
} from "lucide-react"

export default function BacktestingPage() {
  const [strategyName, setStrategyName] = useState("Opening Range Breakout 5m")
  const [symbol, setSymbol] = useState("NQ")
  const [timeframe, setTimeframe] = useState("5m")
  const [startDate, setStartDate] = useState("2024-01-01")
  const [endDate, setEndDate] = useState("2024-03-31")
  const [initialCapital, setInitialCapital] = useState("50000")
  const [riskPct, setRiskPct] = useState("1.0")
  const [targetRr, setTargetRr] = useState("2.0")

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestSummary | null>(null)

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const summary = await backtestApi.run({
        strategy_name: strategyName,
        symbol,
        timeframe,
        start_date: startDate,
        end_date: endDate,
        initial_capital: parseFloat(initialCapital),
        risk_per_trade_pct: parseFloat(riskPct),
        target_rr: parseFloat(targetRr),
      })
      setResult(summary)
    } catch (err) {
      console.error(err)
      alert("Failed to run backtest simulation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Backtesting Engine</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> Statistical Simulation
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simulate mechanical trading strategies against historical tick data with slippage and commission friction
          </p>
        </div>
      </div>

      {/* Simulation Configuration Form */}
      <div className="rounded-lg border border-[#202634] bg-[#11141a] p-5 shadow-sm">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-indigo-400" /> Simulation Parameters
        </h2>

        <form onSubmit={handleRun} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-foreground font-medium mb-1">Strategy Model</label>
              <input
                type="text"
                required
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-foreground font-medium mb-1">Symbol / Asset</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none font-mono cursor-pointer"
              >
                <option value="NQ">NQ (E-mini Nasdaq)</option>
                <option value="ES">ES (E-mini S&P 500)</option>
                <option value="EURUSD">EURUSD (Forex)</option>
                <option value="XAUUSD">XAUUSD (Spot Gold)</option>
              </select>
            </div>

            <div>
              <label className="block text-foreground font-medium mb-1">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none font-mono cursor-pointer"
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
              </select>
            </div>

            <div>
              <label className="block text-foreground font-medium mb-1">Initial Capital ($)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-foreground font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none font-mono cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-foreground font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none font-mono cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-foreground font-medium mb-1">Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-foreground font-medium mb-1">Target R:R</label>
              <input
                type="number"
                step="0.1"
                value={targetRr}
                onChange={(e) => setTargetRr(e.target.value)}
                className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#202634]">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {loading ? "Simulating Execution..." : "Run Backtest Simulation"}
            </button>
          </div>
        </form>
      </div>

      {/* Simulation Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5">
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
              <span className="text-[10px] uppercase font-mono text-muted-foreground block">Net Profit</span>
              <p className={cn("text-lg font-mono font-bold mt-1", pnlColor(parseFloat(result.net_profit)))}>
                {formatPnL(parseFloat(result.net_profit))}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">
                {result.return_pct > 0 ? `+${result.return_pct}%` : `${result.return_pct}%`}
              </span>
            </div>

            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
              <span className="text-[10px] uppercase font-mono text-muted-foreground block">Win Rate</span>
              <p className="text-lg font-mono font-bold text-white mt-1">
                {result.win_rate.toFixed(1)}%
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">
                {result.winning_trades}W / {result.losing_trades}L
              </span>
            </div>

            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
              <span className="text-[10px] uppercase font-mono text-muted-foreground block">Profit Factor</span>
              <p className="text-lg font-mono font-bold text-white mt-1">
                {result.profit_factor.toFixed(2)}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">Gross W / Gross L</span>
            </div>

            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
              <span className="text-[10px] uppercase font-mono text-muted-foreground block">Max Drawdown</span>
              <p className="text-lg font-mono font-bold text-rose-400 mt-1">
                -{result.max_drawdown_pct.toFixed(2)}%
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">Peak to trough</span>
            </div>

            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
              <span className="text-[10px] uppercase font-mono text-muted-foreground block">Sharpe Ratio</span>
              <p className="text-lg font-mono font-bold text-white mt-1">
                {result.sharpe_ratio.toFixed(2)}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">Annualized risk-adj</span>
            </div>

            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
              <span className="text-[10px] uppercase font-mono text-muted-foreground block">Total Trades</span>
              <p className="text-lg font-mono font-bold text-white mt-1">
                {result.total_trades}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">
                {result.total_bars_evaluated.toLocaleString()} bars
              </span>
            </div>
          </div>

          {/* Equity Curve Chart */}
          <div className="rounded-lg border border-[#202634] bg-[#11141a] p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Simulated Capital Growth Curve
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.equity_curve} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="backtestEquityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#202634" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis
                    stroke="#64748b"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0e1117",
                      borderColor: "#202634",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    formatter={(val: any) => [`$${parseFloat(val).toLocaleString()}`, "Capital"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#backtestEquityGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Simulated Trades Table */}
          <div className="rounded-lg border border-[#202634] bg-[#11141a] p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Trade-by-Trade Execution Audit Log ({result.trades.length} positions)
            </h3>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#141821] text-muted-foreground uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Entry Date</th>
                    <th className="px-3 py-2">Symbol</th>
                    <th className="px-3 py-2">Dir</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Entry Price</th>
                    <th className="px-3 py-2">Exit Price</th>
                    <th className="px-3 py-2">R:R</th>
                    <th className="px-3 py-2 text-right">Net P&L</th>
                    <th className="px-3 py-2 text-right">Equity Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202634]">
                  {result.trades.map((t) => (
                    <tr key={t.trade_num} className="hover:bg-[#151a24] transition-colors">
                      <td className="px-3 py-2 text-muted-foreground">{t.trade_num}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {t.entry_time.slice(0, 10)}
                      </td>
                      <td className="px-3 py-2 font-bold text-white">{t.symbol}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded text-[9px] font-sans font-medium uppercase",
                            t.direction.toLowerCase() === "long"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          )}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2">{t.quantity}</td>
                      <td className="px-3 py-2">{t.entry_price}</td>
                      <td className="px-3 py-2">{t.exit_price}</td>
                      <td className="px-3 py-2">{t.r_multiple}R</td>
                      <td className={cn("px-3 py-2 text-right font-bold", pnlColor(parseFloat(t.pnl)))}>
                        {formatPnL(parseFloat(t.pnl))}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-white">
                        ${parseFloat(t.cumulative_equity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
