"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { formatPnL, pnlColor, cn } from "@/lib/utils"
import { marketDataApi, BackendCandle } from "@/lib/api/market-data"
import { accountsApi, Account } from "@/lib/api/accounts"
import { tradesApi } from "@/lib/api/trades"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  LineChart,
  History,
  Search,
  CheckCircle2,
  BookmarkPlus,
  TrendingUp,
  TrendingDown,
  Layers,
} from "lucide-react"

// Dynamically import TradingView Advanced Real-Time Chart
const TradingViewAdvancedChart = dynamic(
  () => import("@/components/replay/tradingview-advanced-chart"),
  { ssr: false }
)

// Dynamically import Lightweight Charts for bar-by-bar canvas
const LightweightCandlestickChart = dynamic(
  () => import("@/components/replay/lightweight-candlestick-chart"),
  { ssr: false }
)

export interface InstrumentConfig {
  id: string
  name: string
  tvSymbol: string
  category: "Commodities" | "Futures" | "Forex" | "Crypto" | "Equities"
  basePrice: number
  tickSize: number
  multiplier: number
}

const POPULAR_INSTRUMENTS: InstrumentConfig[] = [
  { id: "XAUUSD", name: "Gold Spot (XAU/USD)", tvSymbol: "OANDA:XAUUSD", category: "Commodities", basePrice: 2720.50, tickSize: 0.1, multiplier: 100 },
  { id: "BTCUSDT", name: "Bitcoin / Tether", tvSymbol: "BINANCE:BTCUSDT", category: "Crypto", basePrice: 80500.0, tickSize: 1.0, multiplier: 1 },
  { id: "ETHUSDT", name: "Ethereum / Tether", tvSymbol: "BINANCE:ETHUSDT", category: "Crypto", basePrice: 2850.0, tickSize: 0.5, multiplier: 1 },
  { id: "NQ", name: "E-mini Nasdaq 100", tvSymbol: "CME_MINI:NQ1!", category: "Futures", basePrice: 20450.0, tickSize: 0.25, multiplier: 20 },
  { id: "ES", name: "E-mini S&P 500", tvSymbol: "CME_MINI:ES1!", category: "Futures", basePrice: 5820.0, tickSize: 0.25, multiplier: 50 },
  { id: "EURUSD", name: "Euro / US Dollar", tvSymbol: "FX:EURUSD", category: "Forex", basePrice: 1.0850, tickSize: 0.0001, multiplier: 100000 },
  { id: "AAPL", name: "Apple Inc.", tvSymbol: "NASDAQ:AAPL", category: "Equities", basePrice: 232.0, tickSize: 0.01, multiplier: 1 },
  { id: "NVDA", name: "Nvidia Corp.", tvSymbol: "NASDAQ:NVDA", category: "Equities", basePrice: 141.50, tickSize: 0.01, multiplier: 1 },
]

// Generate realistic deterministic session candles with integer Unix timestamps (seconds)
function generateHistoricalSession(symbolId: string, timeframe: string = "5m", count: number = 100) {
  const inst = POPULAR_INSTRUMENTS.find((i) => i.id === symbolId) || POPULAR_INSTRUMENTS[0]
  const base = inst.basePrice
  const volatility = symbolId === "BTCUSDT" ? 120 : symbolId === "ETHUSDT" ? 12 : symbolId === "NQ" ? 18 : symbolId === "ES" ? 3.5 : symbolId === "EURUSD" ? 0.0006 : 2.5
  const isForex = symbolId === "EURUSD"
  const candles = []

  let current = base
  // Start from recent timestamp (e.g. 100 bars ago)
  const stepSeconds = timeframe === "1m" ? 60 : timeframe === "5m" ? 300 : timeframe === "15m" ? 900 : timeframe === "60m" || timeframe === "1h" ? 3600 : 300
  const startSec = Math.floor(Date.now() / 1000) - (count * stepSeconds)

  for (let i = 0; i < count; i++) {
    const candleTimeSec = startSec + i * stepSeconds
    const change = (Math.sin(i / 5.5) * 1.6 + (Math.random() - 0.48) * 2.2) * volatility
    const open = current
    const close = +(open + change).toFixed(isForex ? 4 : 2)
    const high = +(Math.max(open, close) + Math.random() * volatility * 0.8).toFixed(isForex ? 4 : 2)
    const low = +(Math.min(open, close) - Math.random() * volatility * 0.8).toFixed(isForex ? 4 : 2)
    const volume = Math.round(Math.abs(change) * 1000 + 150 + Math.random() * 500)
    current = close

    candles.push({
      time: candleTimeSec, // Integer Unix timestamp in seconds
      open,
      high,
      low,
      close,
      volume,
    })
  }
  return candles
}

interface SimulatedTrade {
  id: string
  direction: "long" | "short"
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  time: string
  savedToJournal?: boolean
}

export default function TradeReplayPage() {
  const [activeTab, setActiveTab] = useState<"live-chart" | "bar-replay">("live-chart")
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentConfig>(POPULAR_INSTRUMENTS[0])
  const [customSymbol, setCustomSymbol] = useState("")
  const [timeframe, setTimeframe] = useState("15")

  // Replay Simulator State
  const [speed, setSpeed] = useState("1x")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(35)
  const [lotSize, setLotSize] = useState(1.0)
  const [userAccounts, setUserAccounts] = useState<Account[]>([])
  const [notification, setNotification] = useState<string | null>(null)

  const [activePosition, setActivePosition] = useState<{
    direction: "long" | "short"
    entryPrice: number
    quantity: number
    entryTimeSec: number
  } | null>(null)
  const [completedTrades, setCompletedTrades] = useState<SimulatedTrade[]>([])

  // Backend Candlestick Data Cache
  const [backendCandles, setBackendCandles] = useState<BackendCandle[]>([])

  // Fetch accounts on load for direct journal saving
  useEffect(() => {
    accountsApi.list().then((accs) => setUserAccounts(accs)).catch(() => {})
  }, [])

  // Fetch real candles from backend when symbol or timeframe changes
  useEffect(() => {
    let isMounted = true
    const cleanSym = selectedInstrument.id
    const tfParam = timeframe === "1" ? "1m" : timeframe === "5" ? "5m" : timeframe === "15" ? "15m" : timeframe === "60" ? "1h" : "15m"
    marketDataApi.getCandles(cleanSym, tfParam, 120).then((candles) => {
      if (isMounted && candles && candles.length > 0) {
        setBackendCandles(candles)
      }
    }).catch(() => {})

    return () => {
      isMounted = false
    }
  }, [selectedInstrument.id, timeframe])

  // Full candles for simulator: prioritize backend candles or use deterministic session
  const fullCandles = useMemo(() => {
    if (backendCandles.length >= 20) {
      return backendCandles.map((c) => ({
        time: c.timestamp, // Unix timestamp in seconds
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }))
    }
    return generateHistoricalSession(selectedInstrument.id, timeframe === "5" ? "5m" : "15m", 100)
  }, [backendCandles, selectedInstrument.id, timeframe])

  const visibleCandles = useMemo(() => {
    return fullCandles.slice(0, Math.min(currentIndex, fullCandles.length))
  }, [fullCandles, currentIndex])

  const currentCandle = visibleCandles[visibleCandles.length - 1]
  const currentPrice = currentCandle ? currentCandle.close : selectedInstrument.basePrice

  // Precision formatting
  const precision = selectedInstrument.category === "Forex" ? 4 : 2

  // Active TV Symbol
  const activeTvSymbol = customSymbol.trim() ? customSymbol.trim().toUpperCase() : selectedInstrument.tvSymbol

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return

    const speedMs =
      speed === "0.5x" ? 2000 : speed === "1x" ? 1000 : speed === "2x" ? 500 : speed === "3x" ? 330 : speed === "5x" ? 200 : 100

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= fullCandles.length) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, speedMs)

    return () => clearInterval(timer)
  }, [isPlaying, speed, fullCandles.length])

  // Open Paper Trade
  const handleOpenTrade = (direction: "long" | "short") => {
    if (!currentPrice || activePosition) return
    setActivePosition({
      direction,
      entryPrice: currentPrice,
      quantity: lotSize,
      entryTimeSec: currentCandle ? currentCandle.time : Math.floor(Date.now() / 1000),
    })
  }

  // Close Paper Trade
  const handleCloseTrade = () => {
    if (!activePosition || !currentPrice) return
    const multiplier = selectedInstrument.multiplier
    const diff =
      activePosition.direction === "long"
        ? currentPrice - activePosition.entryPrice
        : activePosition.entryPrice - currentPrice
    const pnl = Math.round(diff * activePosition.quantity * multiplier * 100) / 100

    const timeStr = currentCandle
      ? new Date(currentCandle.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleTimeString()

    const newTrade: SimulatedTrade = {
      id: Date.now().toString(),
      direction: activePosition.direction,
      entryPrice: activePosition.entryPrice,
      exitPrice: currentPrice,
      quantity: activePosition.quantity,
      pnl,
      time: timeStr,
      savedToJournal: false,
    }

    setCompletedTrades([newTrade, ...completedTrades])
    setActivePosition(null)
  }

  // Save Simulated Replay Trade to Database Journal
  const handleSaveToJournal = async (trade: SimulatedTrade) => {
    if (userAccounts.length === 0) {
      setNotification("Please create a trading account first in Accounts.")
      setTimeout(() => setNotification(null), 3500)
      return
    }

    try {
      const targetAccount = userAccounts[0]
      const nowIso = new Date().toISOString()
      await tradesApi.create({
        account_id: targetAccount.id,
        symbol: selectedInstrument.id,
        direction: trade.direction,
        entry_time: nowIso,
        exit_time: nowIso,
        entry_price: String(trade.entryPrice),
        exit_price: String(trade.exitPrice),
        quantity: String(trade.quantity),
        contract_size: String(selectedInstrument.multiplier),
        gross_pnl: String(trade.pnl),
        net_pnl: String(trade.pnl),
        setup_name: "Replay Practice Execution",
        notes: `Simulated trade during ${selectedInstrument.name} replay practice.`,
        status: "closed",
      })

      setCompletedTrades((prev) =>
        prev.map((t) => (t.id === trade.id ? { ...t, savedToJournal: true } : t))
      )
      setNotification(`Trade #${trade.id.slice(-4)} successfully saved to your Journal & Calendar!`)
      setTimeout(() => setNotification(null), 3500)
    } catch {
      setNotification("Failed to save trade. Check connection or account status.")
      setTimeout(() => setNotification(null), 3500)
    }
  }

  // Live floating unrealized P&L
  const unrealizedPnl = useMemo(() => {
    if (!activePosition || !currentPrice) return 0
    const multiplier = selectedInstrument.multiplier
    const diff =
      activePosition.direction === "long"
        ? currentPrice - activePosition.entryPrice
        : activePosition.entryPrice - currentPrice
    return Math.round(diff * activePosition.quantity * multiplier * 100) / 100
  }, [activePosition, currentPrice, selectedInstrument.multiplier])

  const totalRealizedPnl = completedTrades.reduce((acc, t) => acc + t.pnl, 0)
  const winningTrades = completedTrades.filter((t) => t.pnl > 0).length
  const winRate =
    completedTrades.length > 0 ? (winningTrades / completedTrades.length) * 100 : 0

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(35)
    setActivePosition(null)
  }

  const handleSelectInstrument = (inst: InstrumentConfig) => {
    setSelectedInstrument(inst)
    setCustomSymbol("")
    handleReset()
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      {/* Top Header & Replay Mode Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#202634] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">TradingView Terminal & Replay</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-3 w-3" /> Real Market Integration
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full TradingView charting environment with drawing tools, multi-timeframe analysis, and forward simulator.
          </p>
        </div>

        {/* View Mode Toggle: Real TV Chart vs Bar-by-Bar Simulator */}
        <div className="flex items-center rounded-lg border border-[#2a2e39] bg-[#131722] p-1 shadow-md">
          <button
            onClick={() => setActiveTab("live-chart")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeTab === "live-chart"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <LineChart className="h-3.5 w-3.5" /> TradingView Terminal
          </button>
          <button
            onClick={() => setActiveTab("bar-replay")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeTab === "bar-replay"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <History className="h-3.5 w-3.5" /> Bar-by-Bar Replay
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs shadow-lg animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TradingView-Style Instrument & Timeframe Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131722] p-2.5 rounded-xl border border-[#2a2e39] shadow-lg">
        {/* Preset Instrument Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {POPULAR_INSTRUMENTS.map((inst) => {
            const isSelected = selectedInstrument.id === inst.id && !customSymbol
            return (
              <button
                key={inst.id}
                onClick={() => handleSelectInstrument(inst)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs font-semibold font-mono transition-colors cursor-pointer",
                  isSelected
                    ? "bg-[#2962ff] text-white shadow-sm"
                    : "bg-[#1e222d] text-[#9db2c8] hover:bg-[#2a2e39] hover:text-white"
                )}
              >
                {inst.id}
              </button>
            )
          })}
        </div>

        {/* Custom Symbol Search & Timeframe Ribbon */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Custom Search Box */}
          <div className="relative w-48 sm:w-56">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search (e.g. TSLA, SOLUSDT)"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value)}
              className="h-7 w-full rounded-md border border-[#2a2e39] bg-[#1e222d] pl-8 pr-2.5 text-xs text-white placeholder:text-muted-foreground font-mono focus:border-[#2962ff] focus:outline-none uppercase"
            />
          </div>

          {/* Timeframe Buttons Ribbon (TradingView style) */}
          <div className="flex items-center rounded-md border border-[#2a2e39] bg-[#1e222d] p-0.5">
            {[
              { label: "1m", value: "1" },
              { label: "5m", value: "5" },
              { label: "15m", value: "15" },
              { label: "1h", value: "60" },
              { label: "4h", value: "240" },
              { label: "1D", value: "D" },
            ].map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={cn(
                  "px-2 py-0.5 text-xs font-mono font-medium rounded transition-colors cursor-pointer",
                  timeframe === tf.value
                    ? "bg-[#2962ff] text-white"
                    : "text-[#787b86] hover:text-white"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area Based on Active Tab */}
      {activeTab === "live-chart" ? (
        /* REAL TRADINGVIEW ADVANCED LIVE CHART VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white font-mono text-sm">{activeTvSymbol}</span>
              <span className="text-muted-foreground">({selectedInstrument.name})</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                Official TradingView Widget
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-[11px] hidden sm:flex">
              <span>Full Left Drawing Bar • Unsquished Candlestick Height • Real-Time Ticks</span>
            </div>
          </div>

          {/* Embedded TradingView Live Terminal - Full 760px Height with SMA Overlay (No Squishing Subpanes) */}
          <TradingViewAdvancedChart
            symbol={activeTvSymbol}
            interval={timeframe}
            height={760}
          />

          {/* Real-time Paper Trading Simulator Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Quick Order Entry */}
            <div className="rounded-xl border border-[#2a2e39] bg-[#131722] p-4 flex flex-col justify-between shadow-lg">
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
                  Live Paper Execution
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Execute test trades directly on {selectedInstrument.id} with zero capital risk.
                </p>
              </div>

              <div>
                {!activePosition ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenTrade("long")}
                      className="w-full py-2.5 rounded-lg bg-[#089981] hover:bg-[#07836f] text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      <TrendingUp className="h-3.5 w-3.5" /> BUY LONG
                    </button>
                    <button
                      onClick={() => handleOpenTrade("short")}
                      className="w-full py-2.5 rounded-lg bg-[#f23645] hover:bg-[#d62837] text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      <TrendingDown className="h-3.5 w-3.5" /> SELL SHORT
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCloseTrade}
                    className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-md"
                  >
                    FLATTEN POSITION (CLOSE TRADE)
                  </button>
                )}
              </div>
            </div>

            {/* Position Monitor */}
            <div className="rounded-xl border border-[#2a2e39] bg-[#131722] p-4 flex flex-col justify-between font-mono shadow-lg">
              <div>
                <span className="text-[10px] uppercase text-[#787b86]">Active Position</span>
                {activePosition ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          activePosition.direction === "long"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        )}
                      >
                        {activePosition.direction} {activePosition.quantity} lot
                      </span>
                      <span className="text-xs text-white">Entry: {activePosition.entryPrice}</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground font-sans">
                    No active position. Click Buy or Sell to simulate execution.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#2a2e39]">
                <span className="text-[10px] uppercase text-[#787b86] block">Floating Unrealized P&L</span>
                <p className={cn("text-xl font-bold mt-0.5", pnlColor(unrealizedPnl))}>
                  {formatPnL(unrealizedPnl)}
                </p>
              </div>
            </div>

            {/* Session Performance */}
            <div className="rounded-xl border border-[#2a2e39] bg-[#131722] p-4 flex flex-col justify-between font-mono shadow-lg">
              <div>
                <span className="text-[10px] uppercase text-[#787b86]">Session Realized P&L</span>
                <p className={cn("text-xl font-bold mt-1", pnlColor(totalRealizedPnl))}>
                  {formatPnL(totalRealizedPnl)}
                </p>
              </div>

              <div className="pt-3 border-t border-[#2a2e39] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#787b86] uppercase block">Trades</span>
                  <span className="font-bold text-white">{completedTrades.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#787b86] uppercase block">Win Rate</span>
                  <span className="font-bold text-white">
                    {completedTrades.length > 0 ? `${winRate.toFixed(1)}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* BAR-BY-BAR REPLAY & PAPER TRADING VIEW */
        <div className="space-y-4">
          {/* Replay Toolbar & Playback Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131722] p-3 rounded-xl border border-[#2a2e39] shadow-lg">
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="font-bold text-white text-sm">
                {selectedInstrument.id} • {timeframe === "1" ? "1m" : timeframe === "5" ? "5m" : timeframe === "15" ? "15m" : timeframe === "60" ? "1h" : "15m"}
              </span>
              <span className="text-[#9db2c8]">
                Bar {currentIndex} of {fullCandles.length}
              </span>
              <span className="text-emerald-400 font-semibold">
                Price: {currentPrice.toFixed(precision)}
              </span>
            </div>

            {/* Playback Controls (TradingView Style Replay Dock) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-[#2a2e39] bg-[#1e222d] p-1">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(10, prev - 1))}
                  className="p-1.5 rounded hover:bg-[#2a2e39] text-[#9db2c8] hover:text-white cursor-pointer transition-colors"
                  title="Step Back 1 Bar"
                >
                  <SkipBack className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={cn(
                    "p-1.5 rounded text-white cursor-pointer transition-colors shadow-sm",
                    isPlaying ? "bg-amber-600 hover:bg-amber-500 animate-pulse" : "bg-[#2962ff] hover:bg-[#1e53e5]"
                  )}
                  title={isPlaying ? "Pause Replay" : "Play Replay"}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(fullCandles.length, prev + 1))}
                  className="p-1.5 rounded hover:bg-[#2a2e39] text-[#9db2c8] hover:text-white cursor-pointer transition-colors"
                  title="Step Forward 1 Bar"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded hover:bg-[#2a2e39] text-[#9db2c8] hover:text-white cursor-pointer transition-colors"
                  title="Reset Replay"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Speed Selector */}
              <div className="flex items-center rounded-lg border border-[#2a2e39] bg-[#1e222d] p-0.5">
                {["0.5x", "1x", "2x", "3x", "5x"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={cn(
                      "px-2 py-1 text-[11px] font-mono rounded cursor-pointer transition-colors",
                      speed === s ? "bg-[#2a2e39] text-white font-bold" : "text-[#787b86] hover:text-white"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive TradingView-Styled Candlestick & Volume Canvas */}
          <LightweightCandlestickChart
            candles={visibleCandles}
            symbolName={selectedInstrument.id}
            timeframe={timeframe === "1" ? "1m" : timeframe === "5" ? "5m" : timeframe === "15" ? "15m" : timeframe === "60" ? "1h" : "15m"}
            currentPrice={currentPrice}
            height={640}
          />

          {/* Timeline Scrubber */}
          <div className="flex items-center gap-3 px-3 py-2 bg-[#131722] rounded-lg border border-[#2a2e39]">
            <span className="text-[11px] font-mono text-[#787b86]">Session Open</span>
            <input
              type="range"
              min={10}
              max={fullCandles.length}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="w-full accent-[#2962ff] cursor-pointer h-1.5 bg-[#1e222d] rounded"
            />
            <span className="text-[11px] font-mono text-[#787b86]">Session End</span>
          </div>

          {/* Simulated Execution & Live Position Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Trade Execution Controls */}
            <div className="rounded-xl border border-[#2a2e39] bg-[#131722] p-4 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Paper Trading Order Entry
                  </h3>
                  {/* Lot Size Selector */}
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <span className="text-[#787b86]">Lots:</span>
                    {[0.5, 1.0, 2.0, 5.0].map((l) => (
                      <button
                        key={l}
                        onClick={() => setLotSize(l)}
                        className={cn(
                          "px-1.5 py-0.5 rounded cursor-pointer",
                          lotSize === l ? "bg-[#2962ff] text-white font-bold" : "bg-[#1e222d] text-[#9db2c8]"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Place instant market orders directly on current candle close ({currentPrice.toFixed(precision)}).
                </p>
              </div>

              <div>
                {!activePosition ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenTrade("long")}
                      className="w-full py-2.5 rounded-lg bg-[#089981] hover:bg-[#07836f] text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      <TrendingUp className="h-3.5 w-3.5" /> BUY {lotSize} LOT
                    </button>
                    <button
                      onClick={() => handleOpenTrade("short")}
                      className="w-full py-2.5 rounded-lg bg-[#f23645] hover:bg-[#d62837] text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      <TrendingDown className="h-3.5 w-3.5" /> SELL {lotSize} LOT
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCloseTrade}
                    className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-md"
                  >
                    FLATTEN POSITION (CLOSE TRADE)
                  </button>
                )}
              </div>
            </div>

            {/* Active Position Card */}
            <div className="rounded-xl border border-[#2a2e39] bg-[#131722] p-4 flex flex-col justify-between font-mono shadow-lg">
              <div>
                <span className="text-[10px] uppercase text-[#787b86]">Active Position Status</span>
                {activePosition ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          activePosition.direction === "long"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        )}
                      >
                        {activePosition.direction} {activePosition.quantity} lot
                      </span>
                      <span className="text-xs text-white">
                        Entry: {activePosition.entryPrice.toFixed(precision)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground font-sans">
                    No active position. Use Buy/Sell to simulate trading this setup.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#2a2e39]">
                <span className="text-[10px] uppercase text-[#787b86] block">Unrealized P&L</span>
                <p className={cn("text-xl font-bold mt-0.5", pnlColor(unrealizedPnl))}>
                  {formatPnL(unrealizedPnl)}
                </p>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="rounded-xl border border-[#2a2e39] bg-[#131722] p-4 flex flex-col justify-between font-mono shadow-lg">
              <div>
                <span className="text-[10px] uppercase text-[#787b86]">Session Net Realized P&L</span>
                <p className={cn("text-xl font-bold mt-1", pnlColor(totalRealizedPnl))}>
                  {formatPnL(totalRealizedPnl)}
                </p>
              </div>

              <div className="pt-3 border-t border-[#2a2e39] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#787b86] uppercase block">Closed Trades</span>
                  <span className="font-bold text-white">{completedTrades.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#787b86] uppercase block">Win Rate</span>
                  <span className="font-bold text-white">
                    {completedTrades.length > 0 ? `${winRate.toFixed(1)}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trade History Log with 'Save to Journal' Action */}
          {completedTrades.length > 0 && (
            <div className="rounded-xl border border-[#2a2e39] bg-[#131722] p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#2962ff]" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Simulated Session Trade Log ({completedTrades.length})
                  </h3>
                </div>
                <span className="text-[11px] text-[#787b86]">
                  Click Save to log directly into your Journal & Calendar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="text-[10px] text-[#787b86] uppercase border-b border-[#2a2e39]">
                    <tr>
                      <th className="py-2 px-3">Side</th>
                      <th className="py-2 px-3">Lots</th>
                      <th className="py-2 px-3">Entry</th>
                      <th className="py-2 px-3">Exit</th>
                      <th className="py-2 px-3">Net P&L</th>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3 text-right">Journal Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2e39]/50">
                    {completedTrades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-[#1e222d]/40 transition-colors">
                        <td className="py-2 px-3">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                              trade.direction === "long"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/20 text-rose-400"
                            )}
                          >
                            {trade.direction}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-white">{trade.quantity}</td>
                        <td className="py-2 px-3 text-[#9db2c8]">{trade.entryPrice.toFixed(precision)}</td>
                        <td className="py-2 px-3 text-[#9db2c8]">{trade.exitPrice.toFixed(precision)}</td>
                        <td className={cn("py-2 px-3 font-bold", pnlColor(trade.pnl))}>
                          {formatPnL(trade.pnl)}
                        </td>
                        <td className="py-2 px-3 text-[#787b86]">{trade.time}</td>
                        <td className="py-2 px-3 text-right">
                          {trade.savedToJournal ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSaveToJournal(trade)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white text-[11px] font-sans font-medium transition-colors cursor-pointer border border-indigo-500/30"
                            >
                              <BookmarkPlus className="h-3 w-3" /> Log to Journal
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
