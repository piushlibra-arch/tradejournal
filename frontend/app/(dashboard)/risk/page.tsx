"use client"

import React, { useState, useEffect } from "react"
import { riskApi, RiskRule, RiskStatusReport } from "@/lib/api/risk"
import { accountsApi, Account } from "@/lib/api/accounts"
import { formatCurrency, cn } from "@/lib/utils"
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Lock,
  Zap,
  TrendingDown,
  Activity,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react"

export default function RiskManagerPage() {
  const [report, setReport] = useState<RiskStatusReport | null>(null)
  const [rules, setRules] = useState<RiskRule[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Form state
  const [ruleType, setRuleType] = useState("max_daily_loss")
  const [threshold, setThreshold] = useState("1000")
  const [action, setAction] = useState("warn")
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [saving, setSaving] = useState(false)

  const loadRiskData = async () => {
    setLoading(true)
    try {
      const [statusRes, rulesRes, accountsRes] = await Promise.all([
        riskApi.getStatus(),
        riskApi.listRules(),
        accountsApi.list(),
      ])
      setReport(statusRes)
      setRules(rulesRes.items)
      setAccounts(accountsRes)
    } catch (err) {
      console.error("Failed to load risk data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRiskData()
  }, [])

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!threshold || parseFloat(threshold) <= 0) return
    setSaving(true)
    try {
      await riskApi.createRule({
        rule_type: ruleType,
        threshold: parseFloat(threshold),
        action,
        account_id: selectedAccountId || null,
        is_active: true,
      })
      setModalOpen(false)
      setThreshold("1000")
      await loadRiskData()
    } catch (err) {
      alert("Failed to create risk rule")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to remove this risk rule?")) return
    try {
      await riskApi.deleteRule(id)
      await loadRiskData()
    } catch (err) {
      alert("Failed to delete risk rule")
    }
  }

  const ruleTypeNames: Record<string, string> = {
    max_daily_loss: "Max Daily Loss ($)",
    max_trades_per_day: "Max Trades Per Day",
    max_loss_per_trade: "Max Loss Per Trade ($)",
    max_position_size: "Max Position Size (Contracts/Shares)",
    max_drawdown: "Max Drawdown Limit ($)",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Risk Manager & Prop Guard</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> Real-Time Evaluator
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatic intraday loss limiter, max trade counter, and prop-firm drawdown preservation
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 cursor-pointer transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Risk Rule
        </button>
      </div>

      {/* Overall Health Banner */}
      {report && (
        <div>
          {report.overall_status === "breached" ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-200">RISK LIMIT BREACH DETECTED</h3>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  You have breached {report.breaches_count} risk {report.breaches_count === 1 ? "rule" : "rules"}. Step away from the screens immediately to protect your trading account and prevent emotional drawdown.
                </p>
              </div>
            </div>
          ) : report.overall_status === "warning" ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-200">RISK WARNING: 80% THRESHOLD APPROACHED</h3>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  You are approaching your daily risk parameters. Exercise caution and consider reducing size or wrapping up the session.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-200">ALL RISK PARAMETERS HEALTHY</h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  All {report.rules_checked} configured risk guards are active and within safe operational limits.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evaluated Rules Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
          Active Risk Rules & Live Intraday Status
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-lg border border-[#202634] bg-[#11141a] animate-pulse" />
            ))}
          </div>
        ) : !report || report.evaluations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#202634] p-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <h3 className="text-sm font-semibold text-white">No risk rules configured</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              Set up hard daily loss limits, maximum trades per day, or drawdown safeguards to preserve your discipline.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 cursor-pointer"
            >
              Configure First Rule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.evaluations.map((item) => {
              const current = parseFloat(item.current_value)
              const limit = parseFloat(item.threshold)
              const pct = limit > 0 ? Math.min(Math.round((current / limit) * 100), 100) : 0
              const isBreached = item.status === "breached"
              const isWarning = item.status === "warning"

              return (
                <div
                  key={item.rule_id}
                  className={cn(
                    "rounded-lg border bg-[#11141a] p-4 flex flex-col justify-between transition-all",
                    isBreached
                      ? "border-rose-500/40 bg-rose-950/10"
                      : isWarning
                      ? "border-amber-500/40 bg-amber-950/10"
                      : "border-[#202634]"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                          {ruleTypeNames[item.rule_type] || item.rule_type}
                        </h4>
                        <span
                          className={cn(
                            "inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border uppercase",
                            isBreached
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                              : isWarning
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          )}
                        >
                          {item.status}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteRule(item.rule_id)}
                        className="p-1 rounded text-muted-foreground hover:bg-[#141821] hover:text-rose-400 cursor-pointer transition-colors"
                        title="Remove rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-foreground/80 mt-2 font-sans">{item.message}</p>

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5 font-mono">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Observed: {current.toLocaleString()}</span>
                        <span className="font-semibold text-white">Threshold: {limit.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#141821] overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            isBreached ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-indigo-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-right text-[10px] text-muted-foreground">
                        {pct}% consumed
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-[#202634] bg-[#0e1117] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202634] pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400" /> New Risk Guard Rule
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-foreground font-medium mb-1">Rule Type</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value)}
                  className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="max_daily_loss">Max Daily Loss ($)</option>
                  <option value="max_trades_per_day">Max Trades Per Day</option>
                  <option value="max_loss_per_trade">Max Single Trade Loss ($)</option>
                  <option value="max_position_size">Max Position Size</option>
                  <option value="max_drawdown">Max Drawdown Limit ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Threshold Limit</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="e.g. 500"
                  className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Target Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Global (All Trading Accounts)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Enforcement Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="warn">UI Notification & Warning Banner</option>
                  <option value="lockout">Account Lockout & Trade Prohibition</option>
                </select>
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
                  {saving ? "Saving..." : "Activate Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
