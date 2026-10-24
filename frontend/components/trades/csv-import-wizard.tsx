"use client"

import React, { useState } from "react"
import { importsApi, ImportPreviewResponse, ImportValidateResponse, ImportConfirmResponse } from "@/lib/api/imports"
import { Account } from "@/lib/api/accounts"
import { formatCurrency, formatPnL, pnlColor, cn } from "@/lib/utils"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Loader2,
  Building,
  Check,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react"

interface Props {
  accounts: Account[]
  selectedAccountId?: string
  onClose: () => void
  onImportSuccess: () => void
}

const BROKER_OPTIONS = [
  { id: "generic", name: "Generic CSV", desc: "Standard CSV with custom or mapped column headers" },
  { id: "tradovate", name: "Tradovate", desc: "Futures orders and position execution exports" },
  { id: "interactive_brokers", name: "Interactive Brokers (IBKR)", desc: "Flex Queries and Activity Statement CSV" },
  { id: "thinkorswim", name: "ThinkorSwim (Schwab/TDA)", desc: "Account Statement trade history CSV" },
  { id: "metatrader", name: "MetaTrader 4 / 5", desc: "Closed trade history HTML/CSV exports" },
]

export function CSVImportWizard({ accounts, selectedAccountId, onClose, onImportSuccess }: Props) {
  const [step, setStep] = useState<number>(1)
  const [accountId, setAccountId] = useState<string>(selectedAccountId || accounts[0]?.id || "")
  const [brokerSource, setBrokerSource] = useState<string>("generic")

  // File state
  const [fileName, setFileName] = useState<string>("")
  const [csvContent, setCsvContent] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Step 3 & 4: Preview and Mapping
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  // Step 5 & 6: Validation
  const [validationResult, setValidationResult] = useState<ImportValidateResponse | null>(null)

  // Step 7 & 8: Confirmation & Summary
  const [confirmResult, setConfirmResult] = useState<ImportConfirmResponse | null>(null)

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvContent(content)
      setErrorMsg(null)
    }
    reader.readAsText(file)
  }

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvContent(content)
      setErrorMsg(null)
    }
    reader.readAsText(file)
  }

  // Step 1 -> Step 2
  const goToBrokerSelection = () => {
    if (!csvContent.trim()) {
      setErrorMsg("Please select or drop a valid CSV file first.")
      return
    }
    setErrorMsg(null)
    setStep(2)
  }

  // Step 2 -> Step 3 (Preview)
  const generatePreview = async () => {
    if (!accountId) {
      setErrorMsg("Please select a target trading account.")
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await importsApi.preview({
        account_id: accountId,
        csv_content: csvContent,
        broker_source: brokerSource,
      })
      setPreviewData(res)

      // Initialize mapping with suggested aliases
      const initialMap: Record<string, string> = {}
      for (const [k, v] of Object.entries(res.suggested_mapping)) {
        if (v) initialMap[k] = v
      }
      setColumnMapping(initialMap)
      setStep(3)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Failed to parse CSV file.")
    } finally {
      setLoading(false)
    }
  }

  // Step 4 -> Step 5 & 6 (Validate)
  const validateRows = async () => {
    // Validate required fields mapped
    if (!columnMapping["symbol"] || !columnMapping["direction"] || !columnMapping["entry_time"] || !columnMapping["entry_price"] || !columnMapping["quantity"]) {
      setErrorMsg("Please map all mandatory fields: Symbol, Direction, Entry Time, Entry Price, and Quantity.")
      return
    }

    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await importsApi.validate({
        account_id: accountId,
        csv_content: csvContent,
        column_mapping: columnMapping,
        broker_source: brokerSource,
      })
      setValidationResult(res)
      setStep(5)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Validation failed.")
    } finally {
      setLoading(false)
    }
  }

  // Step 7: Confirm Import
  const confirmImport = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await importsApi.confirm({
        account_id: accountId,
        csv_content: csvContent,
        column_mapping: columnMapping,
        broker_source: brokerSource,
        filename: fileName || "trades.csv",
        skip_duplicates: true,
      })
      setConfirmResult(res)
      setStep(8)
      onImportSuccess()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Failed to commit import.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-xl border border-[#202634] bg-[#0c0e14] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#202634] px-6 py-4 bg-[#11141a]">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">CSV Trade Import Wizard</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {step} of 8: {
                step === 1 ? "Select CSV File" :
                step === 2 ? "Select Broker Source" :
                step === 3 ? "Preview Source Data" :
                step === 4 ? "Map Columns to Canonical Fields" :
                step === 5 ? "Row Validation & Analysis" :
                step === 6 ? "Review Duplicates & Discrepancies" :
                step === 7 ? "Confirm Transactional Import" :
                "Import Summary & Metrics"
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-[#1a202c] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="w-full bg-[#141821] h-1 flex">
          <div
            className="bg-indigo-600 h-full transition-all duration-300"
            style={{ width: `${(step / 8) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: SELECT FILE */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-[#202634] hover:border-indigo-500/60 rounded-xl p-10 text-center bg-[#11141a] transition-colors cursor-pointer"
                onClick={() => document.getElementById("csvFileInput")?.click()}
              >
                <Upload className="h-10 w-10 text-indigo-400/60 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white">Drag and drop your trade CSV file here</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Supports comma, semicolon, tab, and pipe delimited trade history files.
                </p>
                <input
                  id="csvFileInput"
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="mt-4 rounded-md border border-[#202634] bg-[#141821] px-4 py-2 text-xs font-semibold text-foreground hover:bg-[#1c222e]"
                >
                  Browse Files
                </button>
              </div>

              {fileName && (
                <div className="flex items-center justify-between rounded-lg bg-[#11141a] border border-[#202634] p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-white">{fileName}</span>
                    <span className="text-muted-foreground font-mono">({(csvContent.length / 1024).toFixed(1)} KB)</span>
                  </div>
                  <span className="text-emerald-400 font-medium">Ready to parse</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => importsApi.downloadTemplate()}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:underline cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Download Canonical CSV Example
                </button>
                <button
                  type="button"
                  onClick={goToBrokerSelection}
                  disabled={!csvContent}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
                >
                  Continue to Broker Selection <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT BROKER & ACCOUNT */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-foreground font-semibold mb-2">1. Select Target Trading Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="h-10 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-xs text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency}) — {a.broker_name || a.account_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-2">2. Select Broker or Export Format</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BROKER_OPTIONS.map((broker) => (
                    <div
                      key={broker.id}
                      onClick={() => setBrokerSource(broker.id)}
                      className={cn(
                        "rounded-lg border p-4 cursor-pointer transition-all flex flex-col justify-between",
                        brokerSource === broker.id
                          ? "border-indigo-500 bg-indigo-600/10 shadow-sm"
                          : "border-[#202634] bg-[#11141a] hover:border-[#2b3548]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white text-xs">{broker.name}</span>
                        {brokerSource === broker.id && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{broker.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#202634] text-muted-foreground hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={generatePreview}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Preview File & Columns <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW FILE */}
          {step === 3 && previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Source CSV Preview</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Detected delimiter: <span className="font-mono text-indigo-400">"{previewData.delimiter}"</span> | Columns detected: <span className="font-mono text-white">{previewData.headers.length}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[#202634] bg-[#11141a] overflow-x-auto max-h-60">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#141821] text-muted-foreground font-mono border-b border-[#202634]">
                    <tr>
                      {previewData.headers.map((h, i) => (
                        <th key={i} className="py-2 px-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202634]">
                    {previewData.sample_rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#141821]/40 font-mono">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-1.5 px-3 whitespace-nowrap text-muted-foreground">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#202634] text-muted-foreground hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer"
                >
                  Proceed to Column Mapping <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: COLUMN MAPPING */}
          {step === 4 && previewData && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">Map Source Headers to Canonical Fields</h3>
                <p className="text-[11px] text-muted-foreground">
                  Our adapter auto-detected best-guess mappings. Confirm or adjust the column assignments below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {Object.entries(previewData.canonical_fields).map(([fieldKey, fieldMeta]) => {
                  return (
                    <div key={fieldKey} className="rounded-lg border border-[#202634] bg-[#11141a] p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          {fieldMeta.label}
                          {fieldMeta.required && <span className="text-rose-400 font-bold">*</span>}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">{fieldMeta.type}</span>
                      </div>
                      <select
                        value={columnMapping[fieldKey] || ""}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [fieldKey]: e.target.value })}
                        className="h-8 rounded border border-[#202634] bg-[#141821] px-2 text-xs text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Ignore / Not in CSV --</option>
                        {previewData.headers.map((h, i) => (
                          <option key={i} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between pt-4 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#202634] text-muted-foreground hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={validateRows}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Validate Rows <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 & 6: VALIDATION & REVIEW ERRORS/DUPLICATES */}
          {step === 5 && validationResult && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-white">Validation Results</h3>
                <p className="text-[11px] text-muted-foreground">
                  Processed {validationResult.total_rows} rows from your CSV export.
                </p>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                  <span className="text-[10px] text-emerald-400 font-mono uppercase font-semibold">Valid Positions</span>
                  <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{validationResult.valid_rows_count}</p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-center">
                  <span className="text-[10px] text-amber-400 font-mono uppercase font-semibold">Duplicate Trades</span>
                  <p className="text-xl font-bold font-mono text-amber-400 mt-1">{validationResult.duplicate_rows_count}</p>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-center">
                  <span className="text-[10px] text-rose-400 font-mono uppercase font-semibold">Malformed Rows</span>
                  <p className="text-xl font-bold font-mono text-rose-400 mt-1">{validationResult.error_rows_count}</p>
                </div>
              </div>

              {/* Duplicates and Errors Details */}
              {validationResult.errors.length > 0 && (
                <div className="rounded-lg border border-rose-500/30 bg-[#11141a] p-4 space-y-2">
                  <h4 className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" /> Row Errors to be Skipped ({validationResult.errors.length})
                  </h4>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono">
                    {validationResult.errors.map((err, i) => (
                      <div key={i} className="text-muted-foreground bg-[#141821] p-1.5 rounded flex justify-between">
                        <span className="text-rose-300 font-semibold">Row {err.row_number}:</span>
                        <span>{err.error_message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.duplicates.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-[#11141a] p-4 space-y-2">
                  <h4 className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Existing Duplicate Trades to be Skipped ({validationResult.duplicates.length})
                  </h4>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono">
                    {validationResult.duplicates.map((dup, i) => (
                      <div key={i} className="text-muted-foreground bg-[#141821] p-1.5 rounded flex justify-between">
                        <span>Row {dup.row_number}: {dup.symbol} (ID: {dup.external_id || "Matched"})</span>
                        <span className="text-amber-400 font-semibold">Skipped</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-[#202634]">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#202634] text-muted-foreground hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Edit Mapping
                </button>
                <button
                  type="button"
                  onClick={confirmImport}
                  disabled={loading || validationResult.valid_rows_count === 0}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Commit & Import {validationResult.valid_rows_count} Trades <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: IMPORT SUMMARY & SUCCESS METRICS */}
          {step === 8 && confirmResult && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Import Successfully Completed</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {confirmResult.message}
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2 font-mono">
                <div className="p-3 rounded bg-[#11141a] border border-[#202634]">
                  <span className="text-[10px] text-muted-foreground uppercase">Imported</span>
                  <p className="text-lg font-bold text-emerald-400">{confirmResult.imported_rows}</p>
                </div>
                <div className="p-3 rounded bg-[#11141a] border border-[#202634]">
                  <span className="text-[10px] text-muted-foreground uppercase">Skipped</span>
                  <p className="text-lg font-bold text-amber-400">{confirmResult.skipped_rows}</p>
                </div>
                <div className="p-3 rounded bg-[#11141a] border border-[#202634]">
                  <span className="text-[10px] text-muted-foreground uppercase">Errors</span>
                  <p className="text-lg font-bold text-rose-400">{confirmResult.error_rows}</p>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer"
                >
                  Done & View Journal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
