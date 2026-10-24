"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { tradesApi, Trade } from "@/lib/api/trades"
import { journalApi, JournalEntry } from "@/lib/api/journal"
import { formatPnL, pnlColor, formatCurrency, cn } from "@/lib/utils"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BookOpen,
  X,
  ExternalLink,
  Activity,
  Award,
} from "lucide-react"

export default function CalendarPage() {
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const startMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`
        const endMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`

        // Fetch trades
        const tradesRes = await tradesApi.list({
          start_date: `${startMonthStr}T00:00:00`,
          end_date: `${endMonthStr}T23:59:59`,
          page_size: 500,
        })
        setTrades(tradesRes.trades)

        // Fetch journal entries
        try {
          const journalRes = await journalApi.list(startMonthStr, endMonthStr)
          setJournalEntries(journalRes.items)
        } catch (jErr) {
          setJournalEntries([])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [year, month, daysInMonth])

  // Map trades by calendar day: "YYYY-MM-DD"
  const dailyPnLMap: Record<string, { count: number; netPnl: number; trades: Trade[] }> = {}
  trades.forEach((t) => {
    if (!t.entry_time || t.net_pnl === null) return
    const dStr = t.entry_time.slice(0, 10)
    if (!dailyPnLMap[dStr]) {
      dailyPnLMap[dStr] = { count: 0, netPnl: 0, trades: [] }
    }
    dailyPnLMap[dStr].count += 1
    dailyPnLMap[dStr].netPnl += parseFloat(t.net_pnl)
    dailyPnLMap[dStr].trades.push(t)
  })

  // Set of dates having journal entries
  const journalDateSet = new Set(journalEntries.map((j) => j.date))

  // Monthly summary metrics
  const monthNetPnl = Object.values(dailyPnLMap).reduce((acc, d) => acc + d.netPnl, 0)
  const tradingDays = Object.keys(dailyPnLMap).length
  const winningDays = Object.values(dailyPnLMap).filter((d) => d.netPnl > 0).length
  const losingDays = Object.values(dailyPnLMap).filter((d) => d.netPnl < 0).length
  const monthTotalTrades = Object.values(dailyPnLMap).reduce((acc, d) => acc + d.count, 0)
  const dayWinRate = tradingDays > 0 ? (winningDays / tradingDays) * 100 : 0

  const monthName = currentDate.toLocaleString("default", { month: "long" })

  // Data for selected day
  const selectedDayData = selectedDayKey ? dailyPnLMap[selectedDayKey] : null
  const selectedDayJournal = selectedDayKey ? journalEntries.find((j) => j.date === selectedDayKey) : null

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Trading Calendar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualize your daily net P&L, trading session consistency, and daily journal debriefs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-[#202634] bg-[#11141a] p-1">
            <button
              onClick={prevMonth}
              className="p-1 rounded text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-white font-mono">
              {monthName} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Month Net P&L</p>
          <p className={cn("mt-1 text-lg font-mono font-bold", pnlColor(monthNetPnl))}>
            {formatPnL(monthNetPnl)}
          </p>
        </div>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Trading Days</p>
          <p className="mt-1 text-lg font-mono font-bold text-white">{tradingDays} days</p>
        </div>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Day Win Rate</p>
          <p className="mt-1 text-lg font-mono font-bold text-white">
            {tradingDays > 0 ? `${dayWinRate.toFixed(1)}%` : "—"}
          </p>
        </div>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Win / Loss Days</p>
          <p className="mt-1 text-lg font-mono font-bold text-white">
            <span className="text-emerald-400">{winningDays}W</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-rose-400">{losingDays}L</span>
          </p>
        </div>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5 col-span-2 sm:col-span-1">
          <p className="text-[11px] font-medium text-muted-foreground">Month Executions</p>
          <p className="mt-1 text-lg font-mono font-bold text-white">{monthTotalTrades} trades</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border border-[#202634] bg-[#11141a] overflow-hidden shadow-sm">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-[#202634] bg-[#141821] text-center text-[11px] font-mono font-medium text-muted-foreground py-2.5">
          <span>SUN</span>
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
        </div>

        {/* Days matrix */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#202634] min-h-[520px]">
          {/* Empty pre-padding */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`pre-${idx}`} className="bg-[#0e1017]/40 min-h-[96px] p-2" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1
            const monthPad = String(month + 1).padStart(2, "0")
            const dayPad = String(day).padStart(2, "0")
            const dateKey = `${year}-${monthPad}-${dayPad}`
            const data = dailyPnLMap[dateKey]
            const hasJournal = journalDateSet.has(dateKey)
            const isSelected = selectedDayKey === dateKey

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDayKey(dateKey)}
                className={cn(
                  "min-h-[96px] p-2.5 flex flex-col justify-between text-left transition-all cursor-pointer relative",
                  data
                    ? data.netPnl > 0
                      ? "bg-emerald-950/15 hover:bg-emerald-950/25"
                      : data.netPnl < 0
                      ? "bg-rose-950/15 hover:bg-rose-950/25"
                      : "bg-[#141821]/40 hover:bg-[#141821]/60"
                    : "hover:bg-[#141821]/20",
                  isSelected && "ring-2 ring-indigo-500 z-10"
                )}
              >
                <div className="flex justify-between items-center text-[11px] font-mono w-full">
                  <span className={cn("font-semibold", data ? "text-white" : "text-muted-foreground")}>
                    {day}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {hasJournal && (
                      <span title="Daily Journal Entry Logged">
                        <BookOpen className="h-3 w-3 text-indigo-400" />
                      </span>
                    )}
                    {data && (
                      <span className="text-[10px] text-muted-foreground">
                        {data.count} {data.count === 1 ? "trd" : "trds"}
                      </span>
                    )}
                  </div>
                </div>

                {data ? (
                  <div className="my-auto text-right w-full">
                    <p className={cn("text-xs font-bold font-mono tracking-tight", pnlColor(data.netPnl))}>
                      {formatPnL(data.netPnl)}
                    </p>
                  </div>
                ) : (
                  <div className="my-auto text-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-muted-foreground">Log trades</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Slide-over Day Detail Drawer */}
      {selectedDayKey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-[#0e1117] border-l border-[#202634] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#202634]">
              <div>
                <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-indigo-400" /> {selectedDayKey} Session Details
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Detailed execution breakdown and psychological debrief
                </p>
              </div>
              <button
                onClick={() => setSelectedDayKey(null)}
                className="p-1 rounded text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 space-y-5 overflow-y-auto flex-1">
              {/* Day Metrics Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Net Realized P&L</span>
                  <p className={cn("text-lg font-mono font-bold mt-1", pnlColor(selectedDayData?.netPnl ?? 0))}>
                    {formatPnL(selectedDayData?.netPnl ?? 0)}
                  </p>
                </div>

                <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Total Trades</span>
                  <p className="text-lg font-mono font-bold text-white mt-1">
                    {selectedDayData?.count ?? 0}
                  </p>
                </div>
              </div>

              {/* Journal Entry Preview / Link */}
              <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-400" /> Daily Journal Entry
                  </span>
                  <button
                    onClick={() => router.push(`/journal`)}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    Open Full Journal <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                {selectedDayJournal ? (
                  <div className="space-y-2 text-xs">
                    {selectedDayJournal.market_bias && (
                      <p className="text-muted-foreground">
                        Bias: <span className="font-semibold text-white">{selectedDayJournal.market_bias}</span> | Discipline: <span className="font-semibold text-indigo-400">{selectedDayJournal.discipline_score ?? "—"}/10</span>
                      </p>
                    )}
                    {selectedDayJournal.pre_market_plan && (
                      <div>
                        <p className="text-[10px] uppercase font-mono text-muted-foreground">Pre-Market Plan</p>
                        <p className="text-foreground mt-0.5 line-clamp-2">{selectedDayJournal.pre_market_plan}</p>
                      </div>
                    )}
                    {selectedDayJournal.post_market_review && (
                      <div>
                        <p className="text-[10px] uppercase font-mono text-muted-foreground">Post-Market Review</p>
                        <p className="text-foreground mt-0.5 line-clamp-2">{selectedDayJournal.post_market_review}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No journal entry logged for this day yet. You can document pre-market plans and lessons learned.
                  </p>
                )}
              </div>

              {/* Day Trades List */}
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" /> Executions ({selectedDayData?.trades.length ?? 0})
                </h3>

                {!selectedDayData || selectedDayData.trades.length === 0 ? (
                  <div className="p-4 rounded-lg border border-[#202634] bg-[#11141a] text-center text-xs text-muted-foreground">
                    No executions recorded on {selectedDayKey}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayData.trades.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg border border-[#202634] bg-[#11141a] flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{t.symbol}</span>
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded text-[9px] font-sans font-medium uppercase",
                                t.direction.toLowerCase() === "long"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              )}
                            >
                              {t.direction}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {t.quantity} @ {t.entry_price} → {t.exit_price ?? "open"}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={cn("font-bold", pnlColor(t.net_pnl))}>{formatPnL(t.net_pnl)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t.entry_time ? new Date(t.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#202634] bg-[#141821]">
              <button
                onClick={() => setSelectedDayKey(null)}
                className="w-full py-2 rounded-md bg-[#202634] hover:bg-[#2b3345] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
