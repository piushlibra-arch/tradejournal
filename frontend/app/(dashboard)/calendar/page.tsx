"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { tradesApi, Trade, CreateTradePayload } from "@/lib/api/trades"
import { journalApi, JournalEntry } from "@/lib/api/journal"
import { accountsApi, Account } from "@/lib/api/accounts"
import { formatPnL, pnlColor, formatCurrency, cn } from "@/lib/utils"
import { useAccount } from "@/lib/context/account-context"
import { resolveTradeCurrency, formatPrice, getCurrencySymbol } from "@/lib/currency"
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
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react"

export default function CalendarPage() {
  const router = useRouter()
  const { selectedAccountId, accountCurrency } = useAccount()
  const [trades, setTrades] = useState<Trade[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Add / Edit Trade Modal State
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [tradeFormSubmitting, setTradeFormSubmitting] = useState(false)
  const [tradeFormError, setTradeFormError] = useState<string | null>(null)

  const [tradeFormData, setTradeFormData] = useState<CreateTradePayload>({
    account_id: "",
    currency: "USD",
    symbol: "",
    direction: "long",
    entry_time: new Date().toISOString().slice(0, 16),
    exit_time: new Date().toISOString().slice(0, 16),
    entry_price: "",
    exit_price: "",
    quantity: "1",
    contract_size: "1",
    commission: "0",
    fees: "0",
    stop_loss_price: "",
    take_profit_price: "",
    setup_name: "",
    notes: "",
    status: "closed",
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  // Load user accounts once
  useEffect(() => {
    accountsApi.list().then((res) => {
      setAccounts(res)
      if (res.length > 0) {
        setTradeFormData((prev) => ({
          ...prev,
          account_id: prev.account_id || res[0].id,
          currency: res[0].currency || "USD",
        }))
      }
    }).catch(() => {})
  }, [])

  // Robust paginated month trades loader with buffer for timezone boundary protection
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const padStart = new Date(year, month, 1 - 2)
      const padEnd = new Date(year, month + 1, 2)
      const padStartStr = `${padStart.getFullYear()}-${String(padStart.getMonth() + 1).padStart(2, "0")}-${String(padStart.getDate()).padStart(2, "0")}`
      const padEndStr = `${padEnd.getFullYear()}-${String(padEnd.getMonth() + 1).padStart(2, "0")}-${String(padEnd.getDate()).padStart(2, "0")}`

      const startMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`
      const endMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`

      // Fetch all trades within buffered date range across pages
      const fetchTrades = async (): Promise<Trade[]> => {
        let all: Trade[] = []
        let p = 1
        let maxPages = 1
        do {
          const res = await tradesApi.list({
            start_date: `${padStartStr}T00:00:00`,
            end_date: `${padEndStr}T23:59:59`,
            page: p,
            page_size: 200, // universally accepted page_size (le=200/le=1000)
            account_id: selectedAccountId !== "all" ? selectedAccountId : undefined,
          })
          all = all.concat(res.trades || [])
          maxPages = res.total_pages || 1
          p++
        } while (p <= maxPages && p <= 5)
        return all
      }

      const [tradesResult, journalResult] = await Promise.allSettled([
        fetchTrades(),
        journalApi.list(padStartStr, padEndStr),
      ])

      if (tradesResult.status === "fulfilled") {
        setTrades(tradesResult.value)
      } else {
        console.error("Failed to load calendar trades:", tradesResult.reason)
        setTrades([])
      }

      if (journalResult.status === "fulfilled") {
        setJournalEntries(journalResult.value.items || [])
      } else {
        console.error("Failed to load calendar journal entries:", journalResult.reason)
        setJournalEntries([])
      }
    } catch (err) {
      console.error("Unexpected error in calendar loadData:", err)
    } finally {
      setLoading(false)
    }
  }, [year, month, daysInMonth, selectedAccountId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open modal for a new trade on a specific calendar date
  const handleOpenAddTrade = (defaultDateKey?: string) => {
    setEditingTrade(null)
    setTradeFormError(null)
    const baseDate = defaultDateKey ? `${defaultDateKey}T10:00` : new Date().toISOString().slice(0, 16)
    const activeAccId = selectedAccountId !== "all" && accounts.some((a) => a.id === selectedAccountId)
      ? selectedAccountId
      : (accounts[0]?.id || "")
    const activeAcc = accounts.find((a) => a.id === activeAccId)

    setTradeFormData({
      account_id: activeAccId,
      currency: activeAcc?.currency || "USD",
      symbol: "",
      direction: "long",
      entry_time: baseDate,
      exit_time: baseDate,
      entry_price: "",
      exit_price: "",
      quantity: "1",
      contract_size: "1",
      commission: "0",
      fees: "0",
      stop_loss_price: "",
      take_profit_price: "",
      setup_name: "",
      notes: "",
      status: "closed",
    })
    setShowTradeModal(true)
  }

  // Open modal to edit an existing trade
  const handleOpenEditTrade = (t: Trade) => {
    setEditingTrade(t)
    setTradeFormError(null)
    setTradeFormData({
      account_id: t.account_id,
      currency: t.currency || "USD",
      symbol: t.symbol,
      direction: t.direction,
      entry_time: t.entry_time ? t.entry_time.slice(0, 16) : new Date().toISOString().slice(0, 16),
      exit_time: t.exit_time ? t.exit_time.slice(0, 16) : "",
      entry_price: t.entry_price,
      exit_price: t.exit_price || "",
      quantity: t.quantity,
      contract_size: t.contract_size || "1",
      commission: t.commission || "0",
      fees: t.fees || "0",
      stop_loss_price: t.stop_loss_price || "",
      take_profit_price: t.take_profit_price || "",
      setup_name: t.setup_name || "",
      notes: t.notes || "",
      status: t.status || "closed",
    })
    setShowTradeModal(true)
  }

  // Handle Save / Update Trade
  const handleSaveTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setTradeFormError(null)
    if (!tradeFormData.account_id) {
      setTradeFormError("Please select an account.")
      return
    }
    if (!tradeFormData.symbol.trim()) {
      setTradeFormError("Symbol is required.")
      return
    }
    if (!tradeFormData.entry_price || parseFloat(tradeFormData.entry_price) <= 0) {
      setTradeFormError("Valid entry price is required.")
      return
    }
    if (!tradeFormData.quantity || parseFloat(tradeFormData.quantity) <= 0) {
      setTradeFormError("Valid quantity is required.")
      return
    }

    setTradeFormSubmitting(true)
    try {
      const payload = {
        ...tradeFormData,
        entry_time: new Date(tradeFormData.entry_time).toISOString(),
        exit_time: tradeFormData.exit_time ? new Date(tradeFormData.exit_time).toISOString() : undefined,
      }

      if (editingTrade) {
        await tradesApi.update(editingTrade.id, payload)
      } else {
        await tradesApi.create(payload)
      }
      setShowTradeModal(false)
      await loadData()
    } catch (err: any) {
      setTradeFormError(err?.response?.data?.detail || "Failed to save trade record.")
    } finally {
      setTradeFormSubmitting(false)
    }
  }

  // Map trades by local calendar day: "YYYY-MM-DD"
  const dailyPnLMap: Record<string, { count: number; netPnl: number; openCount: number; trades: Trade[] }> = {}
  trades.forEach((t) => {
    if (!t.entry_time) return

    // Convert timestamp to local YYYY-MM-DD
    let dStr = t.entry_time.slice(0, 10)
    try {
      const parsed = new Date(t.entry_time)
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear()
        const m = String(parsed.getMonth() + 1).padStart(2, "0")
        const d = String(parsed.getDate()).padStart(2, "0")
        dStr = `${y}-${m}-${d}`
      }
    } catch {}

    if (!dailyPnLMap[dStr]) {
      dailyPnLMap[dStr] = { count: 0, netPnl: 0, openCount: 0, trades: [] }
    }
    dailyPnLMap[dStr].count += 1
    if (t.status === "open" || !t.exit_price) {
      dailyPnLMap[dStr].openCount += 1
    }
    const pnl = t.net_pnl !== null && t.net_pnl !== undefined ? parseFloat(t.net_pnl) : 0
    dailyPnLMap[dStr].netPnl += isNaN(pnl) ? 0 : pnl
    dailyPnLMap[dStr].trades.push(t)
  })

  // Set of dates having journal entries
  const journalDateSet = new Set(journalEntries.map((j) => j.date))

  // Monthly summary metrics (filtered to current month days)
  let monthNetPnl = 0
  let tradingDays = 0
  let winningDays = 0
  let losingDays = 0
  let monthTotalTrades = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const dKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    const dayData = dailyPnLMap[dKey]
    if (dayData && dayData.count > 0) {
      tradingDays += 1
      monthNetPnl += dayData.netPnl
      monthTotalTrades += dayData.count
      if (dayData.netPnl > 0) winningDays += 1
      else if (dayData.netPnl < 0) losingDays += 1
    }
  }

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
          <button
            onClick={() => handleOpenAddTrade()}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Log Trade
          </button>

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
            {formatPnL(monthNetPnl, accountCurrency)}
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
                        {data.openCount > 0 && <span className="ml-1 text-amber-400">({data.openCount} open)</span>}
                      </span>
                    )}
                  </div>
                </div>

                {data ? (
                  <div className="my-auto text-right w-full">
                    <p className={cn("text-xs font-bold font-mono tracking-tight", pnlColor(data.netPnl))}>
                      {formatPnL(data.netPnl, accountCurrency)}
                    </p>
                  </div>
                ) : (
                  <div className="my-auto text-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-muted-foreground">+ Log trades</span>
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
                    {formatPnL(selectedDayData?.netPnl ?? 0, accountCurrency)}
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
                    onClick={() => router.push(`/journal?date=${selectedDayKey}`)}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    Open Daily Journal <ExternalLink className="h-3 w-3" />
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
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      No journal entry logged for this day yet.
                    </p>
                    <button
                      onClick={() => router.push(`/journal?date=${selectedDayKey}`)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer shrink-0 ml-2 hover:underline"
                    >
                      Write Debrief →
                    </button>
                  </div>
                )}
              </div>

              {/* Day Trades List & Quick Add */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" /> Executions ({selectedDayData?.trades.length ?? 0})
                  </h3>
                  <button
                    onClick={() => handleOpenAddTrade(selectedDayKey)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Log Execution
                  </button>
                </div>

                {!selectedDayData || selectedDayData.trades.length === 0 ? (
                  <div className="p-5 rounded-lg border border-dashed border-[#202634] bg-[#11141a] text-center space-y-2">
                    <p className="text-xs text-muted-foreground">No executions recorded on {selectedDayKey}.</p>
                    <button
                      onClick={() => handleOpenAddTrade(selectedDayKey)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Trade for this Day
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayData.trades.map((t) => {
                      const tradeCurr = resolveTradeCurrency(t.currency, t.symbol, accountCurrency)
                      return (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg border border-[#202634] bg-[#11141a] flex items-center justify-between text-xs font-mono hover:border-[#2b3548] transition-colors"
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
                            {tradeCurr === "INR" && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans">
                                INR
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {t.quantity} @ {formatPrice(t.entry_price, tradeCurr)} → {t.exit_price ? formatPrice(t.exit_price, tradeCurr) : "open"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="text-right">
                            <p className={cn("font-bold", pnlColor(t.net_pnl))}>{formatPnL(t.net_pnl, tradeCurr)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {t.entry_time ? new Date(t.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                            </p>
                          </div>
                          <button
                            onClick={() => handleOpenEditTrade(t)}
                            className="p-1 rounded text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer transition-colors"
                            title="Edit Trade"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#202634] bg-[#141821] flex items-center gap-2">
              <button
                onClick={() => handleOpenAddTrade(selectedDayKey)}
                className="flex-1 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                + Log Trade for {selectedDayKey}
              </button>
              <button
                onClick={() => setSelectedDayKey(null)}
                className="px-4 py-2 rounded-md bg-[#202634] hover:bg-[#2b3345] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-[#202634] bg-[#11141a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#202634] pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  {editingTrade ? `Edit Trade #${editingTrade.symbol}` : "Log Trade Position"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {editingTrade ? "Update execution details and recalculate net P&L" : "Record trade details for performance journaling"}
                </p>
              </div>
              <button
                onClick={() => setShowTradeModal(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-[#1a202c] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {tradeFormError && (
              <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                {tradeFormError}
              </div>
            )}

            <form onSubmit={handleSaveTrade} className="space-y-4 text-xs">
              {/* Account & Currency Selection */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-foreground font-medium mb-1.5">Trading Account</label>
                  <select
                    required
                    value={tradeFormData.account_id}
                    onChange={(e) => {
                      const accId = e.target.value
                      const acc = accounts.find((a) => a.id === accId)
                      setTradeFormData({
                        ...tradeFormData,
                        account_id: accId,
                        currency: acc?.currency || tradeFormData.currency || "USD",
                      })
                    }}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency}) - {a.account_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Currency</label>
                  <select
                    value={tradeFormData.currency || "USD"}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, currency: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Instrument & Side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Symbol / Instrument</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AAPL, EURUSD, NQ, NIFTY"
                    value={tradeFormData.symbol}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, symbol: e.target.value.toUpperCase() })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Direction</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#141821] p-1 rounded-md border border-[#202634]">
                    <button
                      type="button"
                      onClick={() => setTradeFormData({ ...tradeFormData, direction: "long" })}
                      className={cn(
                        "py-1 rounded font-semibold text-center cursor-pointer transition-colors",
                        tradeFormData.direction === "long" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-white"
                      )}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeFormData({ ...tradeFormData, direction: "short" })}
                      className={cn(
                        "py-1 rounded font-semibold text-center cursor-pointer transition-colors",
                        tradeFormData.direction === "short" ? "bg-rose-600 text-white" : "text-muted-foreground hover:text-white"
                      )}
                    >
                      SHORT
                    </button>
                  </div>
                </div>
              </div>

              {/* Pricing & Sizing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={tradeFormData.entry_price}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, entry_price: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Exit Price</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00 (or leave blank if open)"
                    value={tradeFormData.exit_price}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, exit_price: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Quantity / Size</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={tradeFormData.quantity}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, quantity: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Entry Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={tradeFormData.entry_time}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, entry_time: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Exit Time</label>
                  <input
                    type="datetime-local"
                    value={tradeFormData.exit_time}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, exit_time: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fees and SL/TP */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">
                    Commission ({getCurrencySymbol(tradeFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={tradeFormData.commission}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, commission: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">
                    Fees ({getCurrencySymbol(tradeFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={tradeFormData.fees}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, fees: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">
                    Stop Loss ({getCurrencySymbol(tradeFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional"
                    value={tradeFormData.stop_loss_price}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, stop_loss_price: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">
                    Take Profit ({getCurrencySymbol(tradeFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional"
                    value={tradeFormData.take_profit_price}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, take_profit_price: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
              </div>

              {/* Status and Setup */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Position Status</label>
                  <select
                    value={tradeFormData.status || "closed"}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, status: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="closed">Closed Position</option>
                    <option value="open">Open Position</option>
                  </select>
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Strategy / Setup Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Breakout, Pullback, Mean Reversion"
                    value={tradeFormData.setup_name}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, setup_name: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Journal Notes */}
              <div>
                <label className="block text-foreground font-medium mb-1.5">Execution Notes / Debrief</label>
                <textarea
                  rows={2}
                  placeholder="Why did you take this trade? Was your plan followed?"
                  value={tradeFormData.notes}
                  onChange={(e) => setTradeFormData({ ...tradeFormData, notes: e.target.value })}
                  className="w-full rounded-md border border-[#202634] bg-[#141821] p-3 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => setShowTradeModal(false)}
                  className="px-4 py-2 rounded-md border border-[#202634] bg-transparent text-foreground hover:bg-[#141821] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tradeFormSubmitting}
                  className="px-4 py-2 rounded-md bg-indigo-600 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {tradeFormSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingTrade ? "Update Trade Record" : "Save Trade Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
