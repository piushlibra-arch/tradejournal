"use client"

import React, { useState, useEffect } from "react"
import { tradesApi, Trade, CreateTradePayload } from "@/lib/api/trades"
import { accountsApi, Account } from "@/lib/api/accounts"
import { formatCurrency, formatPnL, pnlColor, cn } from "@/lib/utils"
import { CSVImportWizard } from "@/components/trades/csv-import-wizard"
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react"

export default function TradeJournalPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filters
  const [symbolFilter, setSymbolFilter] = useState("")
  const [directionFilter, setDirectionFilter] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState("")

  // Modal states
  const [showNewModal, setShowNewModal] = useState(false)
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState<CreateTradePayload>({
    account_id: "",
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

  const loadTrades = async () => {
    setLoading(true)
    try {
      const res = await tradesApi.list({
        page,
        page_size: 25,
        symbol: symbolFilter || undefined,
        direction: directionFilter || undefined,
        account_id: selectedAccountId || undefined,
      })
      setTrades(res.trades)
      setTotal(res.total)
    } catch (err) {
      console.error("Failed to load trades", err)
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const data = await accountsApi.list()
      setAccounts(data)
      if (data.length > 0 && !formData.account_id) {
        setFormData((prev) => ({ ...prev, account_id: data[0].id }))
      }
    } catch (err) {
      console.error("Failed to load accounts", err)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    loadTrades()
  }, [page, symbolFilter, directionFilter, selectedAccountId])

  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.account_id) {
      setFormError("Please select a trading account. Create one in Accounts if needed.")
      return
    }
    if (!formData.symbol.trim()) {
      setFormError("Symbol is required (e.g. AAPL, EURUSD, NQ).")
      return
    }
    if (!formData.entry_price || parseFloat(formData.entry_price) <= 0) {
      setFormError("Valid entry price is required.")
      return
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      setFormError("Valid quantity is required.")
      return
    }

    setSubmitting(true)
    try {
      await tradesApi.create({
        ...formData,
        entry_time: new Date(formData.entry_time).toISOString(),
        exit_time: formData.exit_time ? new Date(formData.exit_time).toISOString() : undefined,
      })
      setShowNewModal(false)
      loadTrades()
      // Reset form
      setFormData({
        account_id: accounts[0]?.id || "",
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
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Failed to create trade.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTrade = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trade?")) return
    try {
      await tradesApi.delete(id)
      if (selectedTrade?.id === id) setSelectedTrade(null)
      loadTrades()
    } catch (err) {
      alert("Failed to delete trade.")
    }
  }

  const exportCSV = () => {
    if (trades.length === 0) return
    const headers = ["ID", "Symbol", "Direction", "Entry Time", "Exit Time", "Entry Price", "Exit Price", "Quantity", "Net P&L", "Status"]
    const rows = trades.map((t) => [
      t.id,
      t.symbol,
      t.direction,
      t.entry_time,
      t.exit_time || "",
      t.entry_price,
      t.exit_price || "",
      t.quantity,
      t.net_pnl || "",
      t.status,
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `trades_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Trade Journal</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log, filter, inspect executions, and analyze every position in detail
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowImportWizard(true)}
            className="flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-600/15 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-600/25 cursor-pointer transition-colors"
          >
            <Upload className="h-3.5 w-3.5" /> Import Broker CSV
          </button>
          <button
            onClick={exportCSV}
            disabled={trades.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-[#202634] bg-[#141821] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[#1a202c] disabled:opacity-40 cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export CSV
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Trade
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#11141a] p-3 rounded-lg border border-[#202634]">
        {/* Symbol Search */}
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter symbol (e.g. AAPL)"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="h-8 w-full rounded-md border border-[#202634] bg-[#141821] pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Direction Filter */}
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className="h-8 rounded-md border border-[#202634] bg-[#141821] px-3 text-xs text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
        >
          <option value="">All Directions</option>
          <option value="long">Long Only</option>
          <option value="short">Short Only</option>
        </select>

        {/* Account Filter */}
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="h-8 rounded-md border border-[#202634] bg-[#141821] px-3 text-xs text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
        >
          <option value="">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>

        {(symbolFilter || directionFilter || selectedAccountId) && (
          <button
            onClick={() => {
              setSymbolFilter("")
              setDirectionFilter("")
              setSelectedAccountId("")
            }}
            className="text-xs text-indigo-400 hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto text-xs text-muted-foreground font-mono">
          Total trades: <span className="text-foreground font-semibold">{total}</span>
        </div>
      </div>

      {/* Trades Table */}
      <div className="rounded-lg border border-[#202634] bg-[#11141a] overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : trades.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No trades found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No trade records matched your criteria. Adjust your filters or log a new trade position.
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Log Trade
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141821] text-muted-foreground font-mono text-[11px] border-b border-[#202634]">
                <tr>
                  <th className="py-2.5 px-4">Entry Date</th>
                  <th className="py-2.5 px-4">Symbol</th>
                  <th className="py-2.5 px-4">Side</th>
                  <th className="py-2.5 px-4">Entry Price</th>
                  <th className="py-2.5 px-4">Exit Price</th>
                  <th className="py-2.5 px-4">Quantity</th>
                  <th className="py-2.5 px-4">Gross P&L</th>
                  <th className="py-2.5 px-4">Comm/Fees</th>
                  <th className="py-2.5 px-4">Net Realized</th>
                  <th className="py-2.5 px-4">Setup</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202634]">
                {trades.map((t) => {
                  const net = t.net_pnl !== null ? parseFloat(t.net_pnl) : null
                  const gross = t.gross_pnl !== null ? parseFloat(t.gross_pnl) : null
                  const comm = parseFloat(t.commission || "0") + parseFloat(t.fees || "0")
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrade(t)}
                      className="hover:bg-[#141821]/60 cursor-pointer transition-colors"
                    >
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
                      <td className="py-2.5 px-4 font-mono">${t.entry_price}</td>
                      <td className="py-2.5 px-4 font-mono">{t.exit_price ? `$${t.exit_price}` : "—"}</td>
                      <td className="py-2.5 px-4 font-mono">{t.quantity}</td>
                      <td className="py-2.5 px-4 font-mono">{formatCurrency(gross)}</td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">-${comm.toFixed(2)}</td>
                      <td className={cn("py-2.5 px-4 font-mono font-bold", pnlColor(net))}>
                        {formatPnL(net)}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground truncate max-w-[120px]">
                        {t.setup_name || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteTrade(t.id)}
                          className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete trade"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 25 && (
          <div className="flex items-center justify-between border-t border-[#202634] p-3 text-xs text-muted-foreground">
            <span>
              Showing {trades.length} of {total} trades
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 rounded border border-[#202634] hover:bg-[#141821] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono">Page {page}</span>
              <button
                disabled={trades.length < 25}
                onClick={() => setPage(page + 1)}
                className="p-1 rounded border border-[#202634] hover:bg-[#141821] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trade Detail Drawer */}
      {selectedTrade && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] border-l border-[#202634] bg-[#0c0e14] shadow-2xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[#202634] pb-4 mb-5">
            <div>
              <span className="text-[10px] text-muted-foreground font-mono uppercase">Trade Detail</span>
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                {selectedTrade.symbol}
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-mono uppercase",
                    selectedTrade.direction === "long" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  )}
                >
                  {selectedTrade.direction}
                </span>
              </h2>
            </div>
            <button
              onClick={() => setSelectedTrade(null)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* PnL Highlights */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#11141a] border border-[#202634]">
              <div>
                <span className="text-[10px] text-muted-foreground font-mono uppercase">Net Realized P&L</span>
                <p className={cn("text-base font-bold font-mono mt-0.5", pnlColor(selectedTrade.net_pnl))}>
                  {formatPnL(selectedTrade.net_pnl)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-mono uppercase">Gross P&L</span>
                <p className="text-base font-bold font-mono text-white mt-0.5">
                  {formatCurrency(selectedTrade.gross_pnl)}
                </p>
              </div>
            </div>

            {/* Execution Stats */}
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 space-y-2.5">
              <h3 className="text-xs font-semibold text-white border-b border-[#202634] pb-1.5">Execution Details</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Entry Price:</span>
                  <span className="font-mono text-white ml-1.5">${selectedTrade.entry_price}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Exit Price:</span>
                  <span className="font-mono text-white ml-1.5">{selectedTrade.exit_price ? `$${selectedTrade.exit_price}` : "Open"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-mono text-white ml-1.5">{selectedTrade.quantity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Contract Size:</span>
                  <span className="font-mono text-white ml-1.5">{selectedTrade.contract_size}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Commission:</span>
                  <span className="font-mono text-white ml-1.5">${selectedTrade.commission}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fees:</span>
                  <span className="font-mono text-white ml-1.5">${selectedTrade.fees}</span>
                </div>
              </div>
            </div>

            {/* Risk Levels */}
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 space-y-2.5">
              <h3 className="text-xs font-semibold text-white border-b border-[#202634] pb-1.5">Risk & Strategy</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Stop Loss:</span>
                  <span className="font-mono text-rose-400 ml-1.5">{selectedTrade.stop_loss_price ? `$${selectedTrade.stop_loss_price}` : "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Take Profit:</span>
                  <span className="font-mono text-emerald-400 ml-1.5">{selectedTrade.take_profit_price ? `$${selectedTrade.take_profit_price}` : "Not set"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Setup:</span>
                  <span className="text-white ml-1.5">{selectedTrade.setup_name || "Discretionary"}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedTrade.notes && (
              <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 space-y-1.5">
                <h3 className="text-xs font-semibold text-white">Trader Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedTrade.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-[#202634] flex justify-end">
              <button
                onClick={() => handleDeleteTrade(selectedTrade.id)}
                className="flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 cursor-pointer font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Trade Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-[#202634] bg-[#11141a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#202634] pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Log Trade Position</h2>
                <p className="text-xs text-muted-foreground">Record trade details for performance journaling</p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTrade} className="space-y-4 text-xs">
              {/* Account Selection */}
              <div>
                <label className="block text-foreground font-medium mb-1.5">Trading Account</label>
                <select
                  required
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
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

              {/* Instrument & Side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Symbol / Instrument</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AAPL, EURUSD, NQ"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Direction</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#141821] p-1 rounded-md border border-[#202634]">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: "long" })}
                      className={cn(
                        "py-1 rounded font-semibold text-center cursor-pointer transition-colors",
                        formData.direction === "long" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-white"
                      )}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: "short" })}
                      className={cn(
                        "py-1 rounded font-semibold text-center cursor-pointer transition-colors",
                        formData.direction === "short" ? "bg-rose-600 text-white" : "text-muted-foreground hover:text-white"
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
                    value={formData.entry_price}
                    onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Exit Price</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00 (or leave open)"
                    value={formData.exit_price}
                    onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Quantity / Size</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
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
                    value={formData.entry_time}
                    onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Exit Time</label>
                  <input
                    type="datetime-local"
                    value={formData.exit_time}
                    onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fees and SL/TP */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">Commission ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">Fees ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.fees}
                    onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">Stop Loss ($)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional"
                    value={formData.stop_loss_price}
                    onChange={(e) => setFormData({ ...formData, stop_loss_price: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">Take Profit ($)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional"
                    value={formData.take_profit_price}
                    onChange={(e) => setFormData({ ...formData, take_profit_price: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
              </div>

              {/* Setup and Notes */}
              <div>
                <label className="block text-foreground font-medium mb-1.5">Strategy / Setup Name</label>
                <input
                  type="text"
                  placeholder="e.g. Fair Value Gap, ORB 15m, Break & Retest"
                  value={formData.setup_name}
                  onChange={(e) => setFormData({ ...formData, setup_name: e.target.value })}
                  className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1.5">Journal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Why did you take this trade? Was your plan followed?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-md border border-[#202634] bg-[#141821] p-3 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-md border border-[#202634] bg-transparent text-foreground hover:bg-[#141821] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-indigo-600 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Trade Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CSV Import Wizard Modal */}
      {showImportWizard && (
        <CSVImportWizard
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onClose={() => setShowImportWizard(false)}
          onImportSuccess={() => {
            loadTrades()
          }}
        />
      )}
    </div>
  )
}
