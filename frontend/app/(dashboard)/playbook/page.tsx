"use client"

import React, { useState } from "react"
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  Target,
  ShieldAlert,
  Clock,
  TrendingUp,
  X,
  FileCheck,
} from "lucide-react"

interface PlaybookModel {
  id: string
  name: string
  tier: "A+" | "A" | "B"
  assetClass: string
  preferredSession: string
  minRiskReward: string
  description: string
  entryChecklist: string[]
  invalidation: string
  exitStrategy: string
}

const DEFAULT_PLAYBOOKS: PlaybookModel[] = [
  {
    id: "1",
    name: "Opening Range Breakout (ORB)",
    tier: "A+",
    assetClass: "Futures (NQ/ES)",
    preferredSession: "NY Open (9:30 AM - 10:15 AM EST)",
    minRiskReward: "1:2.0",
    description: "Capture explosive momentum when price breaks and closes outside the initial 5-minute or 15-minute range on high volume.",
    entryChecklist: [
      "Mark high and low of the first 5-minute candle after 9:30 AM EST",
      "Confirm volume expansion on break of range boundary",
      "Wait for 5m candle close outside range (no front-running)",
      "Target next major daily pivot or 2R minimum",
    ],
    invalidation: "Candle closes back inside the middle 50% of the opening range.",
    exitStrategy: "Scale 50% at 1.5R, move stop to breakeven, trail runner using 5m swing lows.",
  },
  {
    id: "2",
    name: "Liquidity Sweep & Market Structure Shift (MSS)",
    tier: "A+",
    assetClass: "Forex & Gold (XAUUSD, EURUSD)",
    preferredSession: "London Open & NY Session",
    minRiskReward: "1:3.0",
    description: "Institutional sweep of previous day's high/low or session liquidity followed by aggressive displacement in the opposite direction.",
    entryChecklist: [
      "Identify key liquidity pool (Previous Day High/Low, Asian range sweep)",
      "Wait for wick sweep beyond the level and rapid price rejection",
      "Check for 1m/5m displacement creating a Fair Value Gap (FVG)",
      "Enter on limit retest into the FVG with stop beyond the sweep wick",
    ],
    invalidation: "Price accepts and closes beyond the sweep wick high/low.",
    exitStrategy: "Target opposing internal liquidity pool (opposing swing low/high).",
  },
  {
    id: "3",
    name: "VWAP Pullback & Trend Continuation",
    tier: "A",
    assetClass: "Equities & Indices",
    preferredSession: "Mid-Day (10:30 AM - 1:30 PM EST)",
    minRiskReward: "1:2.0",
    description: "Trend confirmation pullback into Volume Weighted Average Price (VWAP) during established trend days.",
    entryChecklist: [
      "Ensure overall daily bias aligns with higher timeframe trend",
      "Stock/Index is holding above rising VWAP (for longs)",
      "Pullback to VWAP occurs on declining volume",
      "Bullish confirmation candle off the VWAP line",
    ],
    invalidation: "Consecutive 5m closes below VWAP with expanding sell volume.",
    exitStrategy: "Target prior high-of-day retest, leave 25% runner to end-of-day close.",
  },
]

export default function PlaybookPage() {
  const [playbooks, setPlaybooks] = useState<PlaybookModel[]>(DEFAULT_PLAYBOOKS)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "A+" | "A">("all")

  // Form state
  const [name, setName] = useState("")
  const [tier, setTier] = useState<"A+" | "A" | "B">("A+")
  const [assetClass, setAssetClass] = useState("Futures (NQ/ES)")
  const [session, setSession] = useState("NY Open")
  const [rr, setRr] = useState("1:2.5")
  const [description, setDescription] = useState("")
  const [checklistRaw, setChecklistRaw] = useState("")
  const [invalidation, setInvalidation] = useState("")
  const [exitStrategy, setExitStrategy] = useState("")

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const newPlay: PlaybookModel = {
      id: Date.now().toString(),
      name: name.trim(),
      tier,
      assetClass,
      preferredSession: session,
      minRiskReward: rr,
      description: description.trim(),
      entryChecklist: checklistRaw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      invalidation: invalidation.trim() || "Stop loss triggered.",
      exitStrategy: exitStrategy.trim() || "Take profit hit.",
    }

    setPlaybooks([newPlay, ...playbooks])
    setModalOpen(false)
    setName("")
    setDescription("")
    setChecklistRaw("")
    setInvalidation("")
    setExitStrategy("")
  }

  const filteredPlays = playbooks.filter((p) => {
    if (activeTab === "all") return true
    return p.tier === activeTab
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Trading Playbook</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> A+ Execution Models
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your personal catalog of textbook setups, mechanical entry checklists, and strict invalidation criteria
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Filter Pills */}
          <div className="flex rounded-md border border-[#202634] bg-[#11141a] p-1 text-xs">
            {(["all", "A+", "A"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {tab === "all" ? "All Setups" : `${tab} Setups`}
              </button>
            ))}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Play
          </button>
        </div>
      </div>

      {/* Playbook Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredPlays.map((play) => (
          <div
            key={play.id}
            className="rounded-lg border border-[#202634] bg-[#11141a] p-5 flex flex-col justify-between hover:border-[#2f384c] transition-all shadow-sm"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">{play.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        play.tier === "A+"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {play.tier} Setup
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    {play.assetClass} • {play.preferredSession}
                  </p>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[10px] uppercase text-muted-foreground block">Min Target</span>
                  <span className="text-xs font-bold text-indigo-400">{play.minRiskReward} R:R</span>
                </div>
              </div>

              <p className="text-xs text-foreground/90 font-sans leading-relaxed mt-2 mb-4">
                {play.description}
              </p>

              {/* Checklist Section */}
              <div className="rounded-md border border-[#202634] bg-[#141821] p-3.5 space-y-2 mb-3.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <FileCheck className="h-3.5 w-3.5 text-indigo-400" /> Mechanical Entry Criteria
                </span>
                <ul className="space-y-1.5 text-xs text-foreground">
                  {play.entryChecklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Invalidation and Exit Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-rose-500/20 bg-rose-950/10 p-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1 font-semibold mb-1">
                    <ShieldAlert className="h-3 w-3" /> Invalidation Thesis
                  </span>
                  <p className="text-[11px] text-rose-200/80 leading-snug">{play.invalidation}</p>
                </div>

                <div className="rounded-md border border-emerald-500/20 bg-emerald-950/10 p-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1 font-semibold mb-1">
                    <Target className="h-3 w-3" /> Profit Taking Rule
                  </span>
                  <p className="text-[11px] text-emerald-200/80 leading-snug">{play.exitStrategy}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Playbook Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-[#202634] bg-[#0e1117] p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#202634] pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" /> Add Playbook Execution Model
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1">Setup Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. London Session Sweep"
                    className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1">Setup Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as any)}
                    className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="A+">A+ (Highest Conviction)</option>
                    <option value="A">A (Standard)</option>
                    <option value="B">B (Lower Size)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1">Asset Class</label>
                  <input
                    type="text"
                    value={assetClass}
                    onChange={(e) => setAssetClass(e.target.value)}
                    placeholder="e.g. Futures, Forex, Gold"
                    className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1">Min Target R:R</label>
                  <input
                    type="text"
                    value={rr}
                    onChange={(e) => setRr(e.target.value)}
                    placeholder="e.g. 1:2.0"
                    className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this setup works and the market structure behind it..."
                  className="w-full rounded-md border border-[#202634] bg-[#141821] p-2.5 text-foreground focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">
                  Entry Criteria Checklist (One item per line)
                </label>
                <textarea
                  rows={3}
                  value={checklistRaw}
                  onChange={(e) => setChecklistRaw(e.target.value)}
                  placeholder="Sweep of Asian High&#10;Displacement candle close&#10;Limit order at FVG"
                  className="w-full rounded-md border border-[#202634] bg-[#141821] p-2.5 text-foreground focus:border-indigo-500 focus:outline-none resize-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1">Invalidation Point</label>
                  <input
                    type="text"
                    value={invalidation}
                    onChange={(e) => setInvalidation(e.target.value)}
                    placeholder="e.g. Candle close below swing low"
                    className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1">Exit Strategy</label>
                  <input
                    type="text"
                    value={exitStrategy}
                    onChange={(e) => setExitStrategy(e.target.value)}
                    placeholder="e.g. Scale 50% at 2R, BE stop"
                    className="h-8.5 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
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
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-white font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Save Play
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
