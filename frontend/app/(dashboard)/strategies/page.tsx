"use client"

import React, { useState, useEffect } from "react"
import { strategiesApi, Strategy, StrategyPerformance } from "@/lib/api/strategies"
import { formatCurrency, formatPnL, pnlColor, cn } from "@/lib/utils"
import {
  Layers,
  Plus,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Activity,
  Award,
  Zap,
  Target,
  FileText,
  X,
} from "lucide-react"

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [performances, setPerformances] = useState<Record<string, StrategyPerformance>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // New Strategy Form state
  const [name, setName] = useState("")
  const [assetClass, setAssetClass] = useState("Futures")
  const [description, setDescription] = useState("")
  const [entryTrigger, setEntryTrigger] = useState("")
  const [exitRule, setExitRule] = useState("")
  const [saving, setSaving] = useState(false)

  const loadStrategies = async () => {
    setLoading(true)
    try {
      const res = await strategiesApi.list()
      setStrategies(res.items)

      // Fetch performances for each strategy
      const perfMap: Record<string, StrategyPerformance> = {}
      for (const s of res.items) {
        try {
          const perf = await strategiesApi.getPerformance(s.id)
          perfMap[s.id] = perf
        } catch (pErr) {
          // No trades or new strategy
        }
      }
      setPerformances(perfMap)
    } catch (err) {
      console.error("Failed to load strategies:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStrategies()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await strategiesApi.create({
        name: name.trim(),
        asset_class: assetClass,
        description: description.trim() || null,
        entry_rules: entryTrigger ? { trigger: entryTrigger } : null,
        exit_rules: exitRule ? { rule: exitRule } : null,
        status: "active",
      })
      setModalOpen(false)
      setName("")
      setDescription("")
      setEntryTrigger("")
      setExitRule("")
      await loadStrategies()
    } catch (err) {
      alert("Failed to create strategy")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, sName: string) => {
    if (!confirm(`Are you sure you want to delete strategy "${sName}"?`)) return
    try {
      await strategiesApi.delete(id)
      await loadStrategies()
    } catch (err) {
      alert("Failed to delete strategy")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Strategies & Setups</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Systematic trading playbooks, entry & exit mechanics, and verified out-of-sample edge
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 cursor-pointer transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Strategy
        </button>
      </div>

      {/* Strategies Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-lg border border-[#202634] bg-[#11141a] animate-pulse" />
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#202634] p-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
          <h3 className="text-sm font-semibold text-white">No strategies defined yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Create your core trading setups (e.g. Opening Range Breakout, Fair Value Gap, Liquidity Sweep) to track your edge.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 cursor-pointer"
          >
            Create First Strategy
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((strat) => {
            const perf = performances[strat.id]
            const winRate = perf ? perf.win_rate : 0
            const totalTrades = perf ? perf.total_trades : 0
            const netPnl = perf ? parseFloat(perf.net_pnl) : 0
            const pf = perf ? perf.profit_factor : 0

            return (
              <div
                key={strat.id}
                className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between hover:border-[#2b3345] transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{strat.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20 font-mono">
                          {strat.asset_class || "All Assets"}
                        </span>
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20 uppercase font-mono">
                          {strat.status}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(strat.id, strat.name)}
                      className="p-1 rounded text-muted-foreground hover:bg-[#141821] hover:text-rose-400 cursor-pointer transition-colors"
                      title="Delete strategy"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {strat.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2 font-sans leading-relaxed">
                      {strat.description}
                    </p>
                  )}

                  {/* Rules snippet */}
                  <div className="mt-3 space-y-1.5 text-[11px] font-mono bg-[#141821] p-2.5 rounded border border-[#202634]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Target className="h-3 w-3 text-emerald-400" />
                      <span className="truncate">
                        Trigger: {strat.entry_rules?.trigger || "Systematic checklist"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Zap className="h-3 w-3 text-amber-400" />
                      <span className="truncate">
                        Exit: {strat.exit_rules?.rule || "Planned Stop / Target"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="mt-4 pt-3 border-t border-[#202634] grid grid-cols-3 gap-2 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">Win Rate</span>
                    <p className="text-xs font-bold text-white mt-0.5">
                      {totalTrades > 0 ? `${winRate.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">Profit Fac</span>
                    <p className="text-xs font-bold text-white mt-0.5">
                      {totalTrades > 0 ? pf.toFixed(2) : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">Net P&L</span>
                    <p className={cn("text-xs font-bold mt-0.5", pnlColor(netPnl))}>
                      {totalTrades > 0 ? formatPnL(netPnl) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Strategy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-[#202634] bg-[#0e1117] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202634] pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" /> New Trading Strategy
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-foreground font-medium mb-1">Strategy Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 5m Opening Range Breakout"
                  className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Asset Class</label>
                <select
                  value={assetClass}
                  onChange={(e) => setAssetClass(e.target.value)}
                  className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="Futures">Futures (NQ, ES, CL, GC)</option>
                  <option value="Forex">Forex (EURUSD, GBPUSD, XAUUSD)</option>
                  <option value="Equities">Equities / Stocks</option>
                  <option value="Crypto">Crypto (BTC, ETH)</option>
                  <option value="Options">Options</option>
                </select>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Strategy Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Core premise, ideal market condition (trending/range), session timing..."
                  className="w-full rounded-md border border-[#202634] bg-[#141821] p-2.5 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Entry Trigger / Criteria</label>
                <input
                  type="text"
                  value={entryTrigger}
                  onChange={(e) => setEntryTrigger(e.target.value)}
                  placeholder="e.g. Sweep of Asian session high + 1m displacement candle"
                  className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Exit Rule / Risk Management</label>
                <input
                  type="text"
                  value={exitRule}
                  onChange={(e) => setExitRule(e.target.value)}
                  placeholder="e.g. 2R static target, stop below swing low, move to BE at 1R"
                  className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-[#202634] bg-[#141821] px-3 py-1.5 text-muted-foreground hover:bg-[#1a202c] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-white font-medium hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create Strategy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
