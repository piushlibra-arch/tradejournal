"use client"

import React, { useState, useEffect } from "react"
import {
  brokersApi,
  BrokerConnection,
  BrokerSyncResult,
} from "@/lib/api/brokers"
import {
  RefreshCw,
  Link2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building,
  KeyRound,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react"

export function DhanBrokerCard({ onSyncSuccess }: { onSyncSuccess?: () => void }) {
  const [connections, setConnections] = useState<BrokerConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<BrokerSyncResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form State
  const [clientId, setClientId] = useState("")
  const [accessToken, setAccessToken] = useState("")

  const loadConnections = async () => {
    setLoading(true)
    try {
      const conns = await brokersApi.getConnections()
      setConnections(conns)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConnections()
  }, [])

  const dhanConn = connections.find((c) => c.broker_id === "dhan" && c.is_active)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!clientId.trim() || !accessToken.trim()) {
      setErrorMessage("Both Client ID and Access Token are required.")
      return
    }

    setIsSubmitting(true)
    try {
      await brokersApi.connect({
        broker_id: "dhan",
        client_id: clientId.trim(),
        access_token: accessToken.trim(),
      })
      setShowConnectModal(false)
      setClientId("")
      setAccessToken("")
      await loadConnections()
      if (onSyncSuccess) onSyncSuccess()
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.detail || "Failed to validate Dhan credentials. Check Client ID and Token validity."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    setErrorMessage(null)
    try {
      const res = await brokersApi.sync("dhan")
      setSyncResult(res)
      await loadConnections()
      if (onSyncSuccess) onSyncSuccess()
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || "Dhan synchronization failed.")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!dhanConn) return
    if (!confirm("Are you sure you want to disconnect your Dhan account? Historical journal trades will remain intact.")) return
    try {
      await brokersApi.disconnect(dhanConn.id)
      await loadConnections()
    } catch {
      alert("Failed to disconnect broker.")
    }
  }

  return (
    <div className="rounded-xl border border-[#2a2e39] bg-[#131722] p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#202634]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">DhanHQ API v2 Integration</h3>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                Official API
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Read-only trade history synchronization directly from your personal Dhan trading account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dhanConn ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Dhan Trades"}
              </button>
              <button
                onClick={handleDisconnect}
                className="p-1.5 rounded-lg border border-[#2a2e39] bg-[#1a202c] hover:bg-rose-500/20 hover:text-rose-400 text-muted-foreground transition-colors cursor-pointer"
                title="Disconnect Dhan"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Link2 className="h-3.5 w-3.5" /> Connect Dhan Account
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> Checking connection status...
          </div>
        ) : dhanConn ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#171b26] border border-[#202634]">
                <span className="text-[10px] text-muted-foreground uppercase block">Client ID</span>
                <span className="font-bold text-white mt-0.5 block">{dhanConn.client_id}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#171b26] border border-[#202634]">
                <span className="text-[10px] text-muted-foreground uppercase block">Sync Status</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ready & Connected
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#171b26] border border-[#202634]">
                <span className="text-[10px] text-muted-foreground uppercase block">Last Sync</span>
                <span className="text-[#9db2c8] mt-0.5 block">
                  {dhanConn.last_sync_at ? new Date(dhanConn.last_sync_at).toLocaleString() : "Never"}
                </span>
              </div>
            </div>

            {/* Sync Results Feedback */}
            {syncResult && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Sync complete: {syncResult.new_executions} new executions imported ({syncResult.skipped_duplicates} existing trades skipped).
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#171b26] border border-[#202634] text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Zero-knowledge token encryption. Tokens are stored using AES-256 and never exposed in browser code.</span>
            </div>
            <a
              href="https://web.dhan.co"
              target="_blank"
              rel="noreferrer"
              className="text-[#2962ff] hover:underline flex items-center gap-1 shrink-0 font-medium"
            >
              Get Dhan Access Token <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2a2e39] bg-[#141821] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202634] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Connect Personal Dhan Account</h3>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-muted-foreground hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Dhan Client ID (e.g. 1000000001)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your 10-digit Dhan Client ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full h-8 rounded-lg border border-[#2a2e39] bg-[#1a202c] px-3 text-white placeholder:text-muted-foreground focus:border-[#2962ff] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Dhan Access Token (JWT)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Paste your 30-day Dhan API access token from web.dhan.co"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full rounded-lg border border-[#2a2e39] bg-[#1a202c] p-3 text-white placeholder:text-muted-foreground focus:border-[#2962ff] focus:outline-none font-mono text-[11px]"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Generate on web.dhan.co &gt; Profile &gt; DhanHQ Trading APIs &gt; Access Token.
                </p>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[11px]">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#2a2e39] text-muted-foreground hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e53e5] text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Save & Connect"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
