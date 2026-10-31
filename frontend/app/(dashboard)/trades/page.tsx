"use client"

import React, { useState, useEffect } from "react"
import { tradesApi, Trade, CreateTradePayload } from "@/lib/api/trades"
import { useAccount } from "@/lib/context/account-context"
import { formatCurrency, formatPnL, pnlColor, cn, getCurrencySymbol, resolveTradeCurrency } from "@/lib/utils"
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
  const { accounts, selectedAccountId, selectedAccount, accountCurrency, setSelectedAccountId } = useAccount()
  const [trades, setTrades] = useState<Trade[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filters
  const [symbolFilter, setSymbolFilter] = useState("")
  const [directionFilter, setDirectionFilter] = useState("")

  // Modal states
  const [showNewModal, setShowNewModal] = useState(false)
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [editFormData, setEditFormData] = useState<CreateTradePayload>({
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
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editFormError, setEditFormError] = useState<string | null>(null)

  const handleOpenEdit = (trade: Trade) => {
    setEditingTrade(trade)
    setEditFormError(null)
    setEditFormData({
      account_id: trade.account_id,
      currency: trade.currency || "USD",
      symbol: trade.symbol,
      direction: trade.direction,
      entry_time: trade.entry_time ? trade.entry_time.slice(0, 16) : new Date().toISOString().slice(0, 16),
      exit_time: trade.exit_time ? trade.exit_time.slice(0, 16) : "",
      entry_price: String(trade.entry_price || ""),
      exit_price: trade.exit_price !== null && trade.exit_price !== undefined ? String(trade.exit_price) : "",
      quantity: String(trade.quantity || "1"),
      contract_size: String(trade.contract_size || "1"),
      commission: String(trade.commission || "0"),
      fees: String(trade.fees || "0"),
      stop_loss_price: trade.stop_loss_price ? String(trade.stop_loss_price) : "",
      take_profit_price: trade.take_profit_price ? String(trade.take_profit_price) : "",
      setup_name: trade.setup_name || "",
      notes: trade.notes || "",
      status: trade.status || "closed",
    })
    setShowEditModal(true)
  }

  const handleUpdateTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTrade) return
    setEditFormError(null)

    if (!editFormData.symbol.trim()) {
      setEditFormError("Symbol is required.")
      return
    }
    if (!editFormData.entry_price || parseFloat(editFormData.entry_price) <= 0) {
      setEditFormError("Valid entry price is required.")
      return
    }
    if (!editFormData.quantity || parseFloat(editFormData.quantity) <= 0) {
      setEditFormError("Valid quantity is required.")
      return
    }

    setEditSubmitting(true)
    try {
      const updated = await tradesApi.update(editingTrade.id, {
        ...editFormData,
        entry_time: new Date(editFormData.entry_time).toISOString(),
        exit_time: editFormData.exit_time ? new Date(editFormData.exit_time).toISOString() : undefined,
      })
      if (selectedTrade?.id === editingTrade.id) {
        setSelectedTrade(updated)
      }
      setShowEditModal(false)
      setEditingTrade(null)
      loadTrades()
    } catch (err: any) {
      setEditFormError(err?.response?.data?.detail || "Failed to update trade.")
    } finally {
      setEditSubmitting(false)
    }
  }

  // Form State
  const [formData, setFormData] = useState<CreateTradePayload>({
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

  // Set default account when accounts change
  useEffect(() => {
    if (accounts.length > 0) {
      const activeId = selectedAccountId !== "all" && accounts.some((a) => a.id === selectedAccountId)
        ? selectedAccountId
        : accounts[0].id
      const acc = accounts.find((a) => a.id === activeId)
      setFormData((prev) => ({
        ...prev,
        account_id: activeId,
        currency: acc?.currency || prev.currency || "USD",
      }))
    }
  }, [accounts, selectedAccountId])

  const loadTrades = async () => {
    setLoading(true)
    const effectiveAccId = !selectedAccountId || selectedAccountId === "all" ? undefined : selectedAccountId
    try {
      const res = await tradesApi.list({
        page,
        page_size: 25,
        symbol: symbolFilter || undefined,
        direction: directionFilter || undefined,
        account_id: effectiveAccId,
      })
      setTrades(res.trades)
      setTotal(res.total)
    } catch (err) {
      console.error("Failed to load trades", err)
    } finally {
      setLoading(false)
    }
  }

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
          <option value="all">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>

        {(symbolFilter || directionFilter || (selectedAccountId && selectedAccountId !== "all")) && (
          <button
            onClick={() => {
              setSymbolFilter("")
              setDirectionFilter("")
              setSelectedAccountId("all")
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
                  const tradeCurrency = resolveTradeCurrency(t, accountCurrency)
                  const sym = getCurrencySymbol(tradeCurrency)
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrade(t)}
                      className="hover:bg-[#141821]/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">
                        {new Date(t.entry_time).toLocaleDateString()} {new Date(t.entry_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white font-mono flex items-center gap-1.5">
                        {t.symbol}
                        {tradeCurrency === "INR" && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans">INR</span>
                        )}
                      </td>
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
                      <td className="py-2.5 px-4 font-mono">{formatCurrency(gross, tradeCurrency)}</td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">-{formatCurrency(comm, tradeCurrency)}</td>
                      <td className={cn("py-2.5 px-4 font-mono font-bold", pnlColor(net))}>
                        {formatPnL(net, tradeCurrency)}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground truncate max-w-[120px]">
                        {t.setup_name || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1 rounded text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            title="Edit trade"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTrade(t.id)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete trade"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
            {(() => {
              const drawerCurrency = resolveTradeCurrency(selectedTrade, accountCurrency)
              const drawerSym = getCurrencySymbol(drawerCurrency)
              return (
                <>
                  {/* PnL Highlights */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#11141a] border border-[#202634]">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">Net Realized P&L</span>
                      <p className={cn("text-base font-bold font-mono mt-0.5", pnlColor(selectedTrade.net_pnl))}>
                        {formatPnL(selectedTrade.net_pnl, drawerCurrency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">Gross P&L</span>
                      <p className="text-base font-bold font-mono text-white mt-0.5">
                        {formatCurrency(selectedTrade.gross_pnl, drawerCurrency)}
                      </p>
                    </div>
                  </div>

                  {/* Execution Stats */}
                  <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 space-y-2.5">
                    <h3 className="text-xs font-semibold text-white border-b border-[#202634] pb-1.5 flex items-center justify-between">
                      <span>Execution Details</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c222e] text-indigo-400 font-mono font-medium">{drawerCurrency}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Entry Price:</span>
                        <span className="font-mono text-white ml-1.5">{drawerSym}{selectedTrade.entry_price}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Exit Price:</span>
                        <span className="font-mono text-white ml-1.5">{selectedTrade.exit_price ? `${drawerSym}${selectedTrade.exit_price}` : "Open"}</span>
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
                        <span className="font-mono text-white ml-1.5">{formatCurrency(selectedTrade.commission, drawerCurrency)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fees:</span>
                        <span className="font-mono text-white ml-1.5">{formatCurrency(selectedTrade.fees, drawerCurrency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Charges & Taxes */}
                  {selectedTrade.charges_breakdown && (
                    <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#202634] pb-1.5">
                        <h3 className="text-xs font-semibold text-white">Itemized Broker Charges & Taxes</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                          {selectedTrade.charges_breakdown.provenance || "broker_reported"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                        <div>
                          <span className="text-muted-foreground">Brokerage:</span>
                          <span className="text-white ml-1.5 font-semibold">₹{(selectedTrade.charges_breakdown.brokerage || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">STT / CTT:</span>
                          <span className="text-white ml-1.5 font-semibold">₹{(selectedTrade.charges_breakdown.stt || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Exchange Turnover:</span>
                          <span className="text-white ml-1.5 font-semibold">₹{(selectedTrade.charges_breakdown.exchange_turnover || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">GST (18%):</span>
                          <span className="text-white ml-1.5 font-semibold">₹{(selectedTrade.charges_breakdown.gst || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stamp Duty:</span>
                          <span className="text-white ml-1.5 font-semibold">₹{(selectedTrade.charges_breakdown.stamp_duty || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SEBI Turnover:</span>
                          <span className="text-white ml-1.5 font-semibold">₹{(selectedTrade.charges_breakdown.sebi_turnover || 0).toFixed(2)}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-[#1e2330] flex justify-between font-bold text-xs">
                          <span className="text-muted-foreground">Total Deducted Charges:</span>
                          <span className="text-rose-400">
                            -₹{(selectedTrade.charges_breakdown.total_charges || (parseFloat(selectedTrade.commission) + parseFloat(selectedTrade.fees))).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk Levels */}
                  <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 space-y-2.5">
                    <h3 className="text-xs font-semibold text-white border-b border-[#202634] pb-1.5">Risk & Strategy</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Stop Loss:</span>
                        <span className="font-mono text-rose-400 ml-1.5">{selectedTrade.stop_loss_price ? `${drawerSym}${selectedTrade.stop_loss_price}` : "Not set"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Take Profit:</span>
                        <span className="font-mono text-emerald-400 ml-1.5">{selectedTrade.take_profit_price ? `${drawerSym}${selectedTrade.take_profit_price}` : "Not set"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Setup:</span>
                        <span className="text-white ml-1.5">{selectedTrade.setup_name || "Discretionary"}</span>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Notes */}
            {selectedTrade.notes && (
              <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 space-y-1.5">
                <h3 className="text-xs font-semibold text-white">Trader Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedTrade.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-[#202634] flex items-center justify-end gap-2">
              <button
                onClick={() => handleOpenEdit(selectedTrade)}
                className="flex items-center gap-1.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/20 cursor-pointer font-medium"
              >
                <Edit className="h-3.5 w-3.5" /> Edit Position
              </button>
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
              {/* Account & Currency Selection */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-foreground font-medium mb-1.5">Trading Account</label>
                  <select
                    required
                    value={formData.account_id}
                    onChange={(e) => {
                      const accId = e.target.value
                      const acc = accounts.find((a) => a.id === accId)
                      setFormData({
                        ...formData,
                        account_id: accId,
                        currency: acc?.currency || formData.currency || "USD",
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
                    value={formData.currency || "USD"}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
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
                  <label className="block text-muted-foreground text-[11px] mb-1">Commission ({getCurrencySymbol(formData.currency || "USD")})</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">Fees ({getCurrencySymbol(formData.currency || "USD")})</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.fees}
                    onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">Stop Loss ({getCurrencySymbol(formData.currency || "USD")})</label>
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
                  <label className="block text-muted-foreground text-[11px] mb-1">Take Profit ({getCurrencySymbol(formData.currency || "USD")})</label>
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
      {/* Edit Trade Modal */}
      {showEditModal && editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-[#202634] bg-[#11141a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#202634] pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit className="h-4 w-4 text-indigo-400" />
                  Edit Trade Position — {editingTrade.symbol}
                </h2>
                <p className="text-xs text-muted-foreground">Modify execution, risk levels, and journal notes</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingTrade(null)
                }}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editFormError && (
              <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                {editFormError}
              </div>
            )}

            <form onSubmit={handleUpdateTrade} className="space-y-4 text-xs">
              {/* Account & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-foreground font-medium mb-1.5">Trading Account</label>
                  <select
                    required
                    value={editFormData.account_id}
                    onChange={(e) => {
                      const accId = e.target.value
                      const acc = accounts.find((a) => a.id === accId)
                      setEditFormData({
                        ...editFormData,
                        account_id: accId,
                        currency: acc?.currency || editFormData.currency || "USD",
                      })
                    }}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
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
                    value={editFormData.currency || "USD"}
                    onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              {/* Symbol & Direction */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-foreground font-medium mb-1.5">Symbol / Ticker</label>
                  <input
                    type="text"
                    required
                    value={editFormData.symbol}
                    onChange={(e) => setEditFormData({ ...editFormData, symbol: e.target.value.toUpperCase() })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Direction</label>
                  <select
                    value={editFormData.direction}
                    onChange={(e) => setEditFormData({ ...editFormData, direction: e.target.value as "long" | "short" })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="long">LONG (Buy)</option>
                    <option value="short">SHORT (Sell)</option>
                  </select>
                </div>
              </div>

              {/* Entry / Exit Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Entry Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={editFormData.entry_time}
                    onChange={(e) => setEditFormData({ ...editFormData, entry_time: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Exit Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editFormData.exit_time}
                    onChange={(e) => setEditFormData({ ...editFormData, exit_time: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Price & Quantity Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1.5">
                    Entry Price ({getCurrencySymbol(editFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editFormData.entry_price}
                    onChange={(e) => setEditFormData({ ...editFormData, entry_price: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">
                    Exit Price ({getCurrencySymbol(editFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.exit_price}
                    onChange={(e) => setEditFormData({ ...editFormData, exit_price: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Quantity / Lots</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Multiplier</label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.contract_size}
                    onChange={(e) => setEditFormData({ ...editFormData, contract_size: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Commission, Fees, SL, TP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0a0c10] p-3 rounded-lg border border-[#202634]">
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">
                    Commission ({getCurrencySymbol(editFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.commission}
                    onChange={(e) => setEditFormData({ ...editFormData, commission: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">
                    Fees ({getCurrencySymbol(editFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.fees}
                    onChange={(e) => setEditFormData({ ...editFormData, fees: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">
                    Stop Loss ({getCurrencySymbol(editFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.stop_loss_price}
                    onChange={(e) => setEditFormData({ ...editFormData, stop_loss_price: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-[11px] mb-1">
                    Take Profit ({getCurrencySymbol(editFormData.currency || "USD")})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editFormData.take_profit_price}
                    onChange={(e) => setEditFormData({ ...editFormData, take_profit_price: e.target.value })}
                    className="h-8 w-full rounded border border-[#202634] bg-[#141821] px-2 font-mono text-foreground"
                  />
                </div>
              </div>

              {/* Status and Setup */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Position Status</label>
                  <select
                    value={editFormData.status || "closed"}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
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
                    value={editFormData.setup_name}
                    onChange={(e) => setEditFormData({ ...editFormData, setup_name: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1.5">Execution Notes / Debrief</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full rounded-md border border-[#202634] bg-[#141821] p-3 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingTrade(null)
                  }}
                  className="px-4 py-2 rounded-md border border-[#202634] bg-transparent text-foreground hover:bg-[#141821] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-md bg-indigo-600 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {editSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Changes
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
