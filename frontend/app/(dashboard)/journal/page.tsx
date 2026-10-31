"use client"

import React, { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { journalApi } from "@/lib/api/journal"
import { tradesApi, Trade } from "@/lib/api/trades"
import { formatPnL, pnlColor, cn } from "@/lib/utils"
import { useAccount } from "@/lib/context/account-context"
import { resolveTradeCurrency, formatPrice, getCurrencySymbol } from "@/lib/currency"
import {
  Calendar,
  Save,
  Award,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Loader2,
} from "lucide-react"

function JournalContent() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")
  const [date, setDate] = useState(dateParam || new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const { selectedAccountId, accountCurrency } = useAccount()

  // Update date if URL query param changes
  useEffect(() => {
    if (dateParam && dateParam !== date) {
      setDate(dateParam)
    }
  }, [dateParam])

  // Journal form state
  const [preMarketPlan, setPreMarketPlan] = useState("")
  const [postMarketReview, setPostMarketReview] = useState("")
  const [lessonsLearned, setLessonsLearned] = useState("")
  const [disciplineScore, setDisciplineScore] = useState<number>(8)
  const [emotionalState, setEmotionalState] = useState("Calm & Focused")
  const [marketBias, setMarketBias] = useState("Bullish")

  // Associated trades on this date
  const [dayTrades, setDayTrades] = useState<Trade[]>([])

  const loadDataForDate = useCallback(async (selectedDate: string) => {
    try {
      // Load Journal entry
      try {
        const entry = await journalApi.get(selectedDate)
        setPreMarketPlan(entry.pre_market_plan || "")
        setPostMarketReview(entry.post_market_review || "")
        setLessonsLearned(entry.lessons_learned || "")
        setDisciplineScore(entry.discipline_score ?? 8)
        setEmotionalState(entry.emotional_state || "Calm & Focused")
        setMarketBias(entry.market_bias || "Bullish")
      } catch (err: any) {
        // If 404, reset to blank fields for new entry
        setPreMarketPlan("")
        setPostMarketReview("")
        setLessonsLearned("")
        setDisciplineScore(8)
        setEmotionalState("Calm & Focused")
        setMarketBias("Bullish")
      }

      // Load trades for that calendar date with 1-day buffer for timezone offset safety
      try {
        const dObj = new Date(selectedDate)
        const dayBefore = new Date(dObj)
        dayBefore.setDate(dayBefore.getDate() - 1)
        const dayAfter = new Date(dObj)
        dayAfter.setDate(dayAfter.getDate() + 1)

        const startBuffer = `${dayBefore.getFullYear()}-${String(dayBefore.getMonth() + 1).padStart(2, "0")}-${String(dayBefore.getDate()).padStart(2, "0")}T00:00:00`
        const endBuffer = `${dayAfter.getFullYear()}-${String(dayAfter.getMonth() + 1).padStart(2, "0")}-${String(dayAfter.getDate()).padStart(2, "0")}T23:59:59`

        const effectiveAccId = !selectedAccountId || selectedAccountId === "all" ? undefined : selectedAccountId
        const res = await tradesApi.list({
          start_date: startBuffer,
          end_date: endBuffer,
          page_size: 100,
          account_id: effectiveAccId,
        })

        // Filter to only trades whose local date matches the selectedDate
        const matchingTrades = (res.trades || []).filter((t) => {
          if (!t.entry_time) return false
          const tDate = new Date(t.entry_time)
          const localStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, "0")}-${String(tDate.getDate()).padStart(2, "0")}`
          return localStr === selectedDate
        })

        setDayTrades(matchingTrades)
      } catch (tErr) {
        setDayTrades([])
      }
    } finally {
      // Finished loading
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadDataForDate(date)
  }, [date, selectedAccountId, loadDataForDate])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await journalApi.save({
        date,
        pre_market_plan: preMarketPlan,
        post_market_review: postMarketReview,
        lessons_learned: lessonsLearned,
        discipline_score: disciplineScore,
        emotional_state: emotionalState,
        market_bias: marketBias,
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.error("Failed to save daily journal entry:", err)
      alert("Failed to save journal entry. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Calculate day metrics
  const dayNetPnl = dayTrades.reduce((acc, t) => acc + (t.net_pnl ? parseFloat(t.net_pnl) : 0), 0)
  const winningTrades = dayTrades.filter((t) => t.net_pnl && parseFloat(t.net_pnl) > 0)
  const winRate = dayTrades.length > 0 ? (winningTrades.length / dayTrades.length) * 100 : 0

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Daily Journal & Psychology</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> Live Synced
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Document pre-market execution plans, psychological debrief, and review executions taken on this day
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#141821] border border-[#202634] rounded-md px-2.5 py-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent font-mono text-xs text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Saved!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Entry"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Day Performance Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Session P&L</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={cn("text-lg font-mono font-bold", pnlColor(dayNetPnl))}>
              {formatPnL(dayNetPnl, accountCurrency)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Trades Executed</p>
          <p className="mt-1 text-lg font-mono font-bold text-white">{dayTrades.length}</p>
        </div>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Win Rate</p>
          <p className="mt-1 text-lg font-mono font-bold text-white">
            {dayTrades.length > 0 ? `${winRate.toFixed(1)}%` : "—"}
          </p>
        </div>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Discipline Rating</p>
          <p className="mt-1 text-lg font-mono font-bold text-indigo-400">
            {disciplineScore} / 10
          </p>
        </div>
      </div>

      {/* Psychology, Emotion & Market Bias Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-[#202634] bg-[#11141a] p-4 text-xs">
        <div>
          <label className="block text-foreground font-medium mb-1.5">Pre-Market Bias</label>
          <div className="flex gap-2">
            {["Bullish", "Neutral", "Bearish"].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setMarketBias(b)}
                className={cn(
                  "flex-1 py-1.5 rounded text-center font-medium border text-[11px] transition-colors cursor-pointer",
                  marketBias === b
                    ? b === "Bullish"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : b === "Bearish"
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                      : "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "bg-[#141821] border-[#202634] text-muted-foreground hover:bg-[#1a202c]"
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-foreground font-medium mb-1.5">Mental & Emotional State</label>
          <select
            value={emotionalState}
            onChange={(e) => setEmotionalState(e.target.value)}
            className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-xs text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="Calm & Focused">Calm & Focused</option>
            <option value="Confident & Prepared">Confident & Prepared</option>
            <option value="Patient & Waiting for Setups">Patient & Waiting for Setups</option>
            <option value="Anxious / Hesitant">Anxious / Hesitant</option>
            <option value="FOMO / Over-excited">FOMO / Over-excited</option>
            <option value="Frustrated / Revenge Mentality">Frustrated / Revenge Mentality</option>
            <option value="Fatigued / Low Energy">Fatigued / Low Energy</option>
          </select>
        </div>

        <div>
          <label className="block text-foreground font-medium mb-1.5">
            Discipline Score: <span className="font-bold text-indigo-400">{disciplineScore}</span> / 10
          </label>
          <div className="flex items-center gap-1 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setDisciplineScore(score)}
                className={cn(
                  "flex-1 h-7 rounded text-[11px] font-mono font-medium border transition-colors cursor-pointer",
                  disciplineScore === score
                    ? "bg-indigo-600 border-indigo-500 text-white font-bold"
                    : "bg-[#141821] border-[#202634] text-muted-foreground hover:bg-[#1c2230]"
                )}
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pre-Market Plan */}
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-indigo-400" /> Pre-Market Game Plan
            </h3>
            <span className="text-[10px] text-muted-foreground">Before Session Open</span>
          </div>
          <textarea
            rows={7}
            value={preMarketPlan}
            onChange={(e) => setPreMarketPlan(e.target.value)}
            placeholder="Key levels to watch, economic news releases, setups to look for, maximum risk limit for the day..."
            className="w-full rounded-md border border-[#202634] bg-[#141821] p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none resize-none flex-1 font-sans leading-relaxed"
          />
        </div>

        {/* Post-Market Review */}
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-emerald-400" /> Post-Session Debrief
            </h3>
            <span className="text-[10px] text-muted-foreground">After Session Close</span>
          </div>
          <textarea
            rows={7}
            value={postMarketReview}
            onChange={(e) => setPostMarketReview(e.target.value)}
            placeholder="How did execution match the plan? Did you chase price? Did you respect stop losses and profit targets?..."
            className="w-full rounded-md border border-[#202634] bg-[#141821] p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none resize-none flex-1 font-sans leading-relaxed"
          />
        </div>
      </div>

      {/* Lessons Learned */}
      <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-amber-400" /> Key Takeaways & Rules For Tomorrow
          </h3>
        </div>
        <textarea
          rows={3}
          value={lessonsLearned}
          onChange={(e) => setLessonsLearned(e.target.value)}
          placeholder="What is the single most important adjustment to take into the next trading session?..."
          className="w-full rounded-md border border-[#202634] bg-[#141821] p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none resize-none font-sans leading-relaxed"
        />
      </div>

      {/* Trades Executed On This Day */}
      <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4">
        <div className="flex items-center justify-between mb-3 border-b border-[#202634] pb-2.5">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-indigo-400" /> Trades Logged for {date}
          </h3>
          <span className="text-xs text-muted-foreground">
            {dayTrades.length} {dayTrades.length === 1 ? "trade" : "trades"}
          </span>
        </div>

        {dayTrades.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No trades recorded for this date. You can add trades manually in the Trade Journal or import a broker CSV.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141821] text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Symbol</th>
                  <th className="px-3 py-2">Direction</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Entry</th>
                  <th className="px-3 py-2">Exit</th>
                  <th className="px-3 py-2 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202634]">
                {dayTrades.map((t) => {
                  const tradeCur = resolveTradeCurrency(t, accountCurrency)
                  const curSym = getCurrencySymbol(tradeCur)
                  return (
                    <tr key={t.id} className="hover:bg-[#151a24] transition-colors font-mono">
                      <td className="px-3 py-2 text-muted-foreground">
                        {t.entry_time ? new Date(t.entry_time).toLocaleTimeString() : "—"}
                      </td>
                      <td className="px-3 py-2 font-bold text-white">{t.symbol}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-sans font-medium uppercase",
                            t.direction.toLowerCase() === "long"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          )}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2">{t.quantity}</td>
                      <td className="px-3 py-2">{curSym}{t.entry_price}</td>
                      <td className="px-3 py-2">{t.exit_price ? `${curSym}${t.exit_price}` : "—"}</td>
                      <td className={cn("px-3 py-2 text-right font-bold", pnlColor(t.net_pnl))}>
                        {formatPnL(t.net_pnl, tradeCur)}
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

export default function DailyJournalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      }
    >
      <JournalContent />
    </Suspense>
  )
}
