"use client"

import React, { useState, useEffect } from "react"
import { accountsApi, Account, CreateAccountPayload } from "@/lib/api/accounts"
import { formatCurrency, cn } from "@/lib/utils"
import { DhanBrokerCard } from "@/components/brokers/dhan-broker-card"
import {
  Wallet,
  Plus,
  Trash2,
  X,
  Loader2,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  Archive,
} from "lucide-react"

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateAccountPayload>({
    name: "",
    broker_name: "",
    account_type: "personal",
    currency: "USD",
    initial_balance: "10000.00",
  })

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const data = await accountsApi.list()
      setAccounts(data)
    } catch (err) {
      console.error("Failed to load accounts", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!formData.name.trim()) {
      setError("Account name is required.")
      return
    }

    setSubmitting(true)
    try {
      await accountsApi.create(formData)
      setShowModal(false)
      loadAccounts()
      setFormData({
        name: "",
        broker_name: "",
        account_type: "personal",
        currency: "USD",
        initial_balance: "10000.00",
      })
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create trading account.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this account? Historical trades will remain preserved.")) return
    try {
      await accountsApi.delete(id)
      loadAccounts()
    } catch {
      alert("Failed to archive account.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Trading Accounts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage multiple broker, prop-firm, evaluation, and paper accounts
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 cursor-pointer transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Trading Account
        </button>
      </div>

      {/* Direct Broker Integrations (DhanHQ API v2) */}
      <DhanBrokerCard onSyncSuccess={loadAccounts} />

      {/* Account Cards Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-[#202634] bg-[#11141a] py-16 text-center space-y-3">
          <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No trading accounts yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Create an account to start assigning trades, tracking equity growth, and monitoring prop-firm rules.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Create First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={cn(
                "rounded-lg border border-[#202634] bg-[#11141a] p-5 flex flex-col justify-between hover:border-[#2b3548] transition-colors",
                acc.status === "archived" && "opacity-60"
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-white">{acc.name}</h3>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" /> {acc.broker_name || "Self-Managed / Direct"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase px-2 py-0.5 rounded font-mono",
                      acc.account_type === "funded"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : acc.account_type === "evaluation"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    )}
                  >
                    {acc.account_type}
                  </span>
                </div>

                <div className="space-y-1.5 py-3 border-y border-[#202634] my-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Currency:</span>
                    <span className="font-mono text-white font-semibold uppercase">{acc.currency}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Initial Balance:</span>
                    <span className="font-mono text-white font-semibold">
                      {formatCurrency(acc.initial_balance, acc.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="capitalize font-mono text-[11px] text-foreground">{acc.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Created {new Date(acc.created_at).toLocaleDateString()}
                </span>
                {acc.status !== "archived" && (
                  <button
                    onClick={() => handleArchive(acc.id)}
                    className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 p-1 cursor-pointer font-medium"
                    title="Archive account"
                  >
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#202634] bg-[#11141a] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202634] pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Add Trading Account</h2>
                <p className="text-xs text-muted-foreground">Configure broker, prop firm, or paper account</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-[#141821] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-foreground font-medium mb-1.5">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex 50k Funded #1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1.5">Broker / Prop Firm</label>
                <input
                  type="text"
                  placeholder="e.g. Interactive Brokers, Apex, FTMO, Tradovate"
                  value={formData.broker_name || ""}
                  onChange={(e) => setFormData({ ...formData, broker_name: e.target.value })}
                  className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1.5">Account Type</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="personal">Personal</option>
                    <option value="funded">Funded</option>
                    <option value="evaluation">Evaluation</option>
                    <option value="demo">Demo</option>
                    <option value="backtesting">Backtesting</option>
                    <option value="paper">Paper Trading</option>
                  </select>
                </div>

                <div>
                  <label className="block text-foreground font-medium mb-1.5">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1.5">Initial Starting Balance</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="10000.00"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                  className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
