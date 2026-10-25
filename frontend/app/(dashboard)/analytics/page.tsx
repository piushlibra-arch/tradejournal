"use client"

import React, { useState, useEffect } from "react"
import { tradesApi, Trade } from "@/lib/api/trades"
import { formatCurrency, formatPnL, formatPercent, pnlColor, cn } from "@/lib/utils"
import { useAccount } from "@/lib/context/account-context"
import { resolveTradeCurrency } from "@/lib/currency"
import { BarChart3, TrendingUp, DollarSign, Target, PieChart, Activity } from "lucide-react"

export default function AnalyticsPage() {
  const { selectedAccountId, accountCurrency } = useAccount()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTrades() {
      try {
        setLoading(true)
        const res = await tradesApi.list({
          page_size: 500,
          account_id: selectedAccountId !== "all" ? selectedAccountId : undefined,
        })
        setTrades(res.trades)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadTrades()
  }, [selectedAccountId])

  // Aggregate by Symbol
  const symbolStats: Record<string, { count: number; netPnl: number; wins: number; currency: string }> = {}
  trades.forEach((t) => {
    const net = parseFloat(t.net_pnl || "0")
    const curr = resolveTradeCurrency(t.currency, t.symbol, accountCurrency)
    if (!symbolStats[t.symbol]) {
      symbolStats[t.symbol] = { count: 0, netPnl: 0, wins: 0, currency: curr }
    }
    symbolStats[t.symbol].count += 1
    symbolStats[t.symbol].netPnl += net
    if (net > 0) symbolStats[t.symbol].wins += 1
  })

  // Aggregate by Direction
  const longTrades = trades.filter((t) => t.direction.toLowerCase() === "long")
  const shortTrades = trades.filter((t) => t.direction.toLowerCase() === "short")
  const longPnl = longTrades.reduce((acc, t) => acc + parseFloat(t.net_pnl || "0"), 0)
  const shortPnl = shortTrades.reduce((acc, t) => acc + parseFloat(t.net_pnl || "0"), 0)

  return (
    <div className="space-y-6">
      <div className="border-b border-[#202634] pb-5">
        <h1 className="text-xl font-bold text-white tracking-tight">Trading Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Detailed metrics segmented by symbol, direction, setups, and duration
        </p>
      </div>

      {/* Direction Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-400 font-mono uppercase">Long Positions</span>
            <span className="text-xs text-muted-foreground font-mono">{longTrades.length} trades</span>
          </div>
          <p className={cn("text-2xl font-bold font-mono tracking-tight", pnlColor(longPnl))}>
            {formatPnL(longPnl, accountCurrency)}
          </p>
        </div>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-rose-400 font-mono uppercase">Short Positions</span>
            <span className="text-xs text-muted-foreground font-mono">{shortTrades.length} trades</span>
          </div>
          <p className={cn("text-2xl font-bold font-mono tracking-tight", pnlColor(shortPnl))}>
            {formatPnL(shortPnl, accountCurrency)}
          </p>
        </div>
      </div>

      {/* Symbol Breakdown */}
      <div className="rounded-lg border border-[#202634] bg-[#11141a] overflow-hidden">
        <div className="p-4 border-b border-[#202634]">
          <h3 className="text-sm font-semibold text-white">Performance by Symbol</h3>
          <p className="text-[11px] text-muted-foreground">Aggregated profitability across traded instruments</p>
        </div>

        {Object.keys(symbolStats).length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No trade data available yet. Record trades to see analytics by instrument.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141821] text-muted-foreground font-mono text-[11px] border-b border-[#202634]">
                <tr>
                  <th className="py-2.5 px-4">Symbol</th>
                  <th className="py-2.5 px-4">Positions</th>
                  <th className="py-2.5 px-4">Win Rate</th>
                  <th className="py-2.5 px-4 text-right">Net Realized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202634]">
                {Object.entries(symbolStats).map(([sym, stat]) => {
                  const wr = stat.count > 0 ? (stat.wins / stat.count) * 100 : 0
                  return (
                    <tr key={sym} className="hover:bg-[#141821]/50">
                      <td className="py-2.5 px-4 font-bold text-white font-mono flex items-center gap-1.5">
                        {sym}
                        {stat.currency === "INR" && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans">INR</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono">{stat.count}</td>
                      <td className="py-2.5 px-4 font-mono">{formatPercent(wr)}</td>
                      <td className={cn("py-2.5 px-4 text-right font-mono font-bold", pnlColor(stat.netPnl))}>
                        {formatPnL(stat.netPnl, stat.currency)}
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
