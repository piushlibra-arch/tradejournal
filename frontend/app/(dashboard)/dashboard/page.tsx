"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"
import { useAccount } from "@/lib/context/account-context"
import { tradesApi, Trade } from "@/lib/api/trades"
import { analyticsApi, DashboardSummary, EquityCurvePoint, DailyPnLPoint } from "@/lib/api/analytics"
import { formatCurrency, formatPnL, formatPercent, pnlColor, cn, getCurrencySymbol, resolveTradeCurrency } from "@/lib/utils"
import { EquityChart } from "@/components/dashboard/equity-chart"
import { DailyPnLChart } from "@/components/dashboard/daily-pnl-chart"
import {
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Upload,
  BookOpen,
  Wallet,
  ArrowRight,
  Loader2,
} from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()
  const { accounts, selectedAccountId, selectedAccount, accountCurrency, setSelectedAccountId } = useAccount()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [equityCurve, setEquityCurve] = useState<EquityCurvePoint[]>([])
  const [dailyPnL, setDailyPnL] = useState<DailyPnLPoint[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async (accId?: string) => {
    setLoading(true)
    const effectiveAccId = !accId || accId === "all" ? undefined : accId
    try {
      const [sumRes, curveRes, dailyRes, tradesRes] = await Promise.all([
        analyticsApi.getSummary({ account_id: effectiveAccId }),
        analyticsApi.getEquityCurve({ account_id: effectiveAccId }),
        analyticsApi.getDailyPnL({ account_id: effectiveAccId }),
        tradesApi.list({ account_id: effectiveAccId, page_size: 10 }),
      ])
      setSummary(sumRes)
      setEquityCurve(curveRes)
      setDailyPnL(dailyRes)
      setTrades(tradesRes.trades)
    } catch (err) {
      console.error("Dashboard data load error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedAccountId)
  }, [selectedAccountId])

  const netPnlNum = summary ? parseFloat(summary.net_realized_pnl) : 0
  const grossPnlNum = summary ? parseFloat(summary.gross_realized_pnl) : 0
  const expectancyNum = summary ? parseFloat(summary.expectancy) : 0
  const maxDdNum = summary ? parseFloat(summary.max_drawdown_amount) : 0
  const bestTradeNum = summary ? parseFloat(summary.best_trade) : 0
  const worstTradeNum = summary ? parseFloat(summary.worst_trade) : 0

  const kpis = [
    {
      label: "Net Realized P&L",
      value: formatPnL(netPnlNum, accountCurrency),
      subtext: `Gross: ${formatCurrency(grossPnlNum, accountCurrency)}`,
      icon: DollarSign,
      color: pnlColor(netPnlNum),
    },
    {
      label: "Win Rate",
      value: formatPercent(summary?.win_rate ?? 0),
      subtext: `${summary?.winning_trades ?? 0}W / ${summary?.losing_trades ?? 0}L (${summary?.breakeven_trades ?? 0}BE)`,
      icon: Target,
      color: (summary?.win_rate ?? 0) >= 50 ? "text-emerald-400" : "text-foreground",
    },
    {
      label: "Profit Factor",
      value: summary?.profit_factor ? (summary.profit_factor >= 999 ? "∞" : summary.profit_factor.toFixed(2)) : "0.00",
      subtext: `Win/Loss: ${summary?.win_loss_ratio ? summary.win_loss_ratio.toFixed(2) : "0.00"}`,
      icon: BarChart3,
      color: (summary?.profit_factor ?? 0) >= 1.5 ? "text-emerald-400" : "text-foreground",
    },
    {
      label: "Total Trades",
      value: (summary?.total_trades ?? 0).toString(),
      subtext: selectedAccount ? `${selectedAccount.name} (${selectedAccount.currency})` : `All Accounts (${accounts.length})`,
      icon: Activity,
      color: "text-foreground",
    },
    {
      label: "Expectancy / Trade",
      value: formatPnL(expectancyNum, accountCurrency),
      subtext: (summary?.total_trades ?? 0) > 0 ? "Statistical return" : "No trades",
      icon: TrendingUp,
      color: pnlColor(expectancyNum),
    },
    {
      label: "Max Drawdown",
      value: formatCurrency(maxDdNum, accountCurrency),
      subtext: `${summary?.max_drawdown_percent ?? 0}% peak-to-trough`,
      icon: AlertTriangle,
      color: maxDdNum > 0 ? "text-rose-400" : "text-muted-foreground",
    },
    {
      label: "Best Trade",
      value: formatPnL(bestTradeNum, accountCurrency),
      subtext: "Largest winning fill",
      icon: ArrowUpRight,
      color: "text-emerald-400",
    },
    {
      label: "Worst Trade",
      value: formatPnL(worstTradeNum, accountCurrency),
      subtext: "Largest loss position",
      icon: ArrowDownRight,
      color: worstTradeNum < 0 ? "text-rose-400" : "text-muted-foreground",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Trading Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Welcome back, <span className="text-foreground font-medium">{user?.first_name}</span>. Real-time metrics computed directly from database execution records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Account Filter */}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="h-8 rounded-md border border-[#202634] bg-[#141821] px-2.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Accounts Combined</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>

          <Link
            href="/trades?action=new"
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Log Trade
          </Link>
          <Link
            href="/trades"
            className="flex items-center gap-1.5 rounded-md border border-[#202634] bg-[#141821] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[#1c222e] transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" /> Import CSV
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div
              key={idx}
              className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between hover:border-[#2a3346] transition-colors"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{kpi.label}</span>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="my-2">
                <span className={cn("text-xl font-bold tracking-tight font-mono", kpi.color)}>
                  {loading ? "..." : kpi.value}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono truncate">{kpi.subtext}</span>
            </div>
          )
        })}
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cumulative Equity Curve */}
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-5 flex flex-col justify-between min-h-[340px]">
          <div className="flex items-center justify-between border-b border-[#202634] pb-3 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Cumulative Realized Equity Curve</h3>
              <p className="text-[11px] text-muted-foreground">Chronological equity progression across executions</p>
            </div>
            <span className="text-xs font-mono font-medium text-muted-foreground">Recharts</span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {equityCurve.length <= 1 ? (
              <div className="text-center p-6 space-y-2">
                <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-xs font-medium text-foreground">No equity curve data</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Import trades or add closed positions to display your cumulative growth trajectory.
                </p>
              </div>
            ) : (
              <EquityChart data={equityCurve} />
            )}
          </div>
        </div>

        {/* Daily P&L Breakdown */}
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-5 flex flex-col justify-between min-h-[340px]">
          <div className="flex items-center justify-between border-b border-[#202634] pb-3 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Daily Net Realized P&L</h3>
              <p className="text-[11px] text-muted-foreground">Daily performance bars (Green = Profit, Red = Loss)</p>
            </div>
            <span className="text-xs font-mono font-medium text-muted-foreground">Daily</span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {dailyPnL.length === 0 ? (
              <div className="text-center p-6 space-y-2">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-xs font-medium text-foreground">No daily P&L recorded</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Your daily performance bar chart will appear here once trades are recorded.
                </p>
              </div>
            ) : (
              <DailyPnLChart data={dailyPnL} />
            )}
          </div>
        </div>
      </div>

      {/* Recent Trades Table */}
      <div className="rounded-lg border border-[#202634] bg-[#11141a] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#202634] p-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Trade Executions</h3>
            <p className="text-[11px] text-muted-foreground">Latest closed and open positions</p>
          </div>
          <Link
            href="/trades"
            className="text-xs text-indigo-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            View All Trades <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {trades.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <h4 className="text-xs font-semibold text-foreground">No trade entries recorded</h4>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Your trade journal is currently empty. Record your first trade manually or import historical broker fills.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Link
                href="/trades?action=new"
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" /> Log First Trade
              </Link>
              <Link
                href="/accounts"
                className="inline-flex items-center gap-1.5 rounded-md border border-[#202634] bg-[#141821] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[#1a202c]"
              >
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" /> Add Trading Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141821] text-muted-foreground font-mono text-[11px] border-b border-[#202634]">
                <tr>
                  <th className="py-2.5 px-4">Date / Time</th>
                  <th className="py-2.5 px-4">Symbol</th>
                  <th className="py-2.5 px-4">Direction</th>
                  <th className="py-2.5 px-4">Entry</th>
                  <th className="py-2.5 px-4">Exit</th>
                  <th className="py-2.5 px-4">Quantity</th>
                  <th className="py-2.5 px-4">Net P&L</th>
                  <th className="py-2.5 px-4">Setup</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202634]">
                {trades.map((t) => {
                  const net = t.net_pnl !== null ? parseFloat(t.net_pnl) : null
                  const tradeCurrency = resolveTradeCurrency(t, accountCurrency)
                  const sym = getCurrencySymbol(tradeCurrency)
                  return (
                    <tr key={t.id} className="hover:bg-[#141821]/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">
                        {new Date(t.entry_time).toLocaleDateString()} {new Date(t.entry_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white font-mono">{t.symbol}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase font-mono",
                            t.direction.toLowerCase() === "long"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          )}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono">{sym}{t.entry_price}</td>
                      <td className="py-2.5 px-4 font-mono">{t.exit_price ? `${sym}${t.exit_price}` : "—"}</td>
                      <td className="py-2.5 px-4 font-mono">{t.quantity}</td>
                      <td className={cn("py-2.5 px-4 font-mono font-bold", pnlColor(net))}>
                        {formatPnL(net, tradeCurrency)}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground truncate max-w-[120px]">
                        {t.setup_name || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-[#1c222e] text-muted-foreground font-mono">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
