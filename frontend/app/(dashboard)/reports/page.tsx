"use client"

import React, { useState, useEffect } from "react"
import { assistantApi, AssistantResponse } from "@/lib/api/assistant"
import { tradesApi } from "@/lib/api/trades"
import { formatCurrency, formatPnL, pnlColor, cn } from "@/lib/utils"
import {
  FileText,
  Download,
  Bot,
  Sparkles,
  Send,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Award,
  Layers,
  CheckCircle2,
  Printer,
} from "lucide-react"

export default function ReportsPage() {
  const [assistantData, setAssistantData] = useState<AssistantResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [queryInput, setQueryInput] = useState("")
  const [querying, setQuerying] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const data = await assistantApi.getInsights()
        setAssistantData(data)
      } catch (err) {
        console.error("Failed to load assistant insights:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!queryInput.trim()) return
    setQuerying(true)
    try {
      const res = await assistantApi.query(queryInput.trim())
      setAssistantData(res)
      setQueryInput("")
    } catch (err) {
      alert("Failed to analyze trading data")
    } finally {
      setQuerying(false)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const res = await tradesApi.list({ page_size: 1000 })
      const headers = [
        "Trade ID",
        "Symbol",
        "Direction",
        "Entry Time",
        "Exit Time",
        "Entry Price",
        "Exit Price",
        "Quantity",
        "Gross P&L",
        "Commission",
        "Net P&L",
        "Status",
        "Mistake",
      ]
      const rows = res.trades.map((t) => [
        t.id,
        t.symbol,
        t.direction,
        t.entry_time,
        t.exit_time || "",
        t.entry_price,
        t.exit_price || "",
        t.quantity,
        t.gross_pnl || "",
        t.commission || "0",
        t.net_pnl || "",
        t.status,
        t.mistake_classification || "",
      ])

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `MyTradeJournal_Performance_Export_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      alert("Failed to export trades CSV")
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Performance Reports & AI Diagnostics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Formal execution audit statements, empirical leak detection, and tax/prop-firm exports
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-md border border-[#202634] bg-[#141821] px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-[#1a202c] cursor-pointer transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" /> Print Statement
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> {exporting ? "Exporting..." : "Export Full CSV"}
          </button>
        </div>
      </div>

      {/* AI Assistant Diagnostic Panel */}
      <div className="rounded-lg border border-indigo-500/30 bg-[#11141a] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-indigo-600 flex items-center justify-center text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                MyTradeJournal AI Copilot
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Grounded quantitative insights calculated directly from your executions
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-3 w-3" /> Factual Engine
          </span>
        </div>

        {/* Query Input */}
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask about your trading performance, leaks, win rate, or mistakes..."
            className="flex-1 rounded-md border border-[#202634] bg-[#141821] px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={querying || !queryInput.trim()}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            <Send className="h-3.5 w-3.5" /> {querying ? "Thinking..." : "Analyze"}
          </button>
        </form>

        {/* Diagnostic Output */}
        {loading ? (
          <div className="h-28 rounded bg-[#141821] animate-pulse" />
        ) : assistantData ? (
          <div className="space-y-3 pt-2">
            <div className="rounded-md border border-[#202634] bg-[#141821] p-3.5">
              <p className="text-xs font-semibold text-white mb-2">{assistantData.summary}</p>

              <ul className="space-y-1.5 text-xs text-foreground/90">
                {assistantData.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Grounding Disclaimer */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 italic font-mono">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{assistantData.disclaimer}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Available Formal Performance Statements */}
      <div>
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
          Available Financial & Audit Statements
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Monthly Realized Statement",
              desc: "Complete accounting summary of monthly gross realized P&L, commissions, financing fees, and derived net equity.",
              type: "Accounting & Tax",
            },
            {
              title: "Execution Fill & Slippage Audit",
              desc: "Granular fill-by-fill reconciliation between raw broker executions and consolidated trade position outcomes.",
              type: "Execution Quality",
            },
            {
              title: "Strategy Efficacy & R-Multiple Report",
              desc: "Comparative win rate, profit factor, average R-return, and expectancy breakdown across active playbooks.",
              type: "Strategy Science",
            },
            {
              title: "Prop-Firm Trailing Drawdown Verification",
              desc: "Audited report verifying compliance with daily loss rules, maximum trailing drawdown, and trade frequency ceilings.",
              type: "Risk & Compliance",
            },
          ].map((report, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between space-y-3 hover:border-[#2b3345] transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-400" /> {report.title}
                  </h3>
                  <span className="rounded bg-[#141821] px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-[#202634]">
                    {report.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{report.desc}</p>
              </div>

              <div className="pt-3 border-t border-[#202634] flex justify-end">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download Statement CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
