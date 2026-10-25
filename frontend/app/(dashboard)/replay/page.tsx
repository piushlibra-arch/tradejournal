"use client"

import React, { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { formatPnL, pnlColor, cn } from "@/lib/utils"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  TrendingUp,
  LineChart,
  History,
  Search,
  ExternalLink,
} from "lucide-react"

// Dynamically import TradingView Advanced Real-Time Chart (client-side only)
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
  { id: "XAUUSD", name: "Gold Spot (XAU/USD)", tvSymbol: "OANDA:XAUUSD", category: "Commodities", basePrice: 2720, tickSize: 0.1, multiplier: 100 },
  { id: "BTCUSDT", name: "Bitcoin / Tether", tvSymbol: "BINANCE:BTCUSDT", category: "Crypto", basePrice: 80500, tickSize: 1, multiplier: 1 },
  { id: "ETHUSDT", name: "Ethereum / Tether", tvSymbol: "BINANCE:ETHUSDT", category: "Crypto", basePrice: 2850, tickSize: 0.5, multiplier: 1 },
  { id: "NQ", name: "E-mini Nasdaq 100", tvSymbol: "CME_MINI:NQ1!", category: "Futures", basePrice: 20450, tickSize: 0.25, multiplier: 20 },
  { id: "ES", name: "E-mini S&P 500", tvSymbol: "CME_MINI:ES1!", category: "Futures", basePrice: 5820, tickSize: 0.25, multiplier: 50 },
  { id: "EURUSD", name: "Euro / US Dollar", tvSymbol: "FX:EURUSD", category: "Forex", basePrice: 1.0850, tickSize: 0.0001, multiplier: 100000 },
  { id: "AAPL", name: "Apple Inc.", tvSymbol: "NASDAQ:AAPL", category: "Equities", basePrice: 232, tickSize: 0.01, multiplier: 1 },
  { id: "NVDA", name: "Nvidia Corp.", tvSymbol: "NASDAQ:NVDA", category: "Equities", basePrice: 141, tickSize: 0.01, multiplier: 1 },
]

// Generate realistic deterministic session candles for the step-by-step simulator
function generateHistoricalSession(symbolId: string, count: number = 80) {
  const inst = POPULAR_INSTRUMENTS.find((i) => i.id === symbolId) || POPULAR_INSTRUMENTS[0]
  const base = inst.basePrice
  const volatility = symbolId === "BTCUSDT" ? 120 : symbolId === "ETHUSDT" ? 12 : symbolId === "NQ" ? 18 : symbolId === "ES" ? 3.5 : symbolId === "EURUSD" ? 0.0006 : 2.5
  const isForex = symbolId === "EURUSD"
  const candles = []

  let current = base
  const startTime = new Date("2024-10-24T09:30:00Z").getTime()

  for (let i = 0; i < count; i++) {
    const timeIso = new Date(startTime + i * 5 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ")
    const change = (Math.sin(i / 5) * 1.5 + (Math.random() - 0.48) * 2) * volatility
    const open = current
    const close = +(open + change).toFixed(isForex ? 4 : 2)
    const high = +(Math.max(open, close) + Math.random() * volatility).toFixed(isForex ? 4 : 2)
    const low = +(Math.min(open, close) - Math.random() * volatility).toFixed(isForex ? 4 : 2)
    current = close

    candles.push({
      time: timeIso,
      open,
      high,
      low,
      close,
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
}

export default function TradeReplayPage() {
  const [activeTab, setActiveTab] = useState<"live-chart" | "bar-replay">("live-chart")
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentConfig>(POPULAR_INSTRUMENTS[0])
  const [customSymbol, setCustomSymbol] = useState("")
  const [timeframe, setTimeframe] = useState("15")

  // Replay Simulator State
  const [speed, setSpeed] = useState("1x")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(30)
  const [activePosition, setActivePosition] = useState<{
    direction: "long" | "short"
    entryPrice: number
    quantity: number
  } | null>(null)
  const [completedTrades, setCompletedTrades] = useState<SimulatedTrade[]>([])

  // Candles for simulator
  const fullCandles = useMemo(() => {
    return generateHistoricalSession(selectedInstrument.id, 90)
  }, [selectedInstrument.id])

  const visibleCandles = useMemo(() => {
    return fullCandles.slice(0, currentIndex)
  }, [fullCandles, currentIndex])

  const currentCandle = visibleCandles[visibleCandles.length - 1]
  const currentPrice = currentCandle ? currentCandle.close : selectedInstrument.basePrice

  // Active TV Symbol (custom or preset)
  const activeTvSymbol = customSymbol.trim() ? customSymbol.trim() : selectedInstrument.tvSymbol

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return

    const speedMs =
      speed === "0.5x" ? 2000 : speed === "1x" ? 1000 : speed === "2x" ? 500 : speed === "5x" ? 200 : 100

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
      quantity: 1,
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

    const newTrade: SimulatedTrade = {
      id: Date.now().toString(),
      direction: activePosition.direction,
      entryPrice: activePosition.entryPrice,
      exitPrice: currentPrice,
      quantity: activePosition.quantity,
      pnl,
      time: currentCandle ? currentCandle.time : new Date().toLocaleTimeString(),
    }

    setCompletedTrades([newTrade, ...completedTrades])
    setActivePosition(null)
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
    setCurrentIndex(30)
    setActivePosition(null)
    setCompletedTrades([])
  }

  const handleSelectInstrument = (inst: InstrumentConfig) => {
    setSelectedInstrument(inst)
    setCustomSymbol("")
    handleReset()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Replay Mode Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Trade Replay & Live Charting</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-3 w-3" /> Real TradingView Integration
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Analyze real market price action with TradingView interactive charts and practice execution with zero risk
          </p>
        </div>

        {/* View Mode Toggle: Real TV Chart vs Bar-by-Bar Simulator */}
        <div className="flex items-center rounded-lg border border-[#202634] bg-[#11141a] p-1">
          <button
            onClick={() => setActiveTab("live-chart")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeTab === "live-chart"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <LineChart className="h-3.5 w-3.5" /> Real TradingView Chart
          </button>
          <button
            onClick={() => setActiveTab("bar-replay")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeTab === "bar-replay"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <History className="h-3.5 w-3.5" /> Bar-by-Bar Replay Simulator
          </button>
        </div>
      </div>

      {/* Instrument Selection Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11141a] p-3 rounded-lg border border-[#202634]">
        {/* Preset Instrument Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {POPULAR_INSTRUMENTS.map((inst) => {
            const isSelected = selectedInstrument.id === inst.id && !customSymbol
            return (
              <button
                key={inst.id}
                onClick={() => handleSelectInstrument(inst)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer border",
                  isSelected
                    ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40"
                    : "bg-[#141821] text-muted-foreground border-transparent hover:text-white hover:border-[#202634]"
                )}
              >
                {inst.id}
              </button>
            )
          })}
        </div>

        {/* Custom Symbol Search & Timeframe */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-44">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search symbol (e.g. TSLA, SOLUSDT)"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value)}
              className="h-8 w-full rounded-md border border-[#202634] bg-[#141821] pl-8 pr-2.5 text-xs text-white placeholder:text-muted-foreground font-mono focus:border-indigo-500 focus:outline-none uppercase"
            />
          </div>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="h-8 rounded-md border border-[#202634] bg-[#141821] px-2.5 font-mono text-xs text-foreground cursor-pointer focus:border-indigo-500 focus:outline-none"
          >
            <option value="1">1m</option>
            <option value="5">5m</option>
            <option value="15">15m</option>
            <option value="60">1h</option>
            <option value="240">4h</option>
            <option value="D">1D</option>
          </select>
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
                Live TradingView Terminal
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-[11px] hidden sm:flex">
              <span>Full Left Drawing Toolbar • Live Ticks • Multiple Indicators & Layouts</span>
            </div>
          </div>

          {/* Embedded TradingView Live Terminal with Drawing Tools & Date Ranges */}
          <TradingViewAdvancedChart
            symbol={activeTvSymbol}
            interval={timeframe}
            height={740}
          />

          {/* Real-time Paper Trading Simulator Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Quick Order Entry */}
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
                  Live Paper Execution
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Simulate live market orders on {selectedInstrument.id} with real tick tracking.
                </p>
              </div>

              <div>
                {!activePosition ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenTrade("long")}
                      className="w-full py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-sm"
                    >
                      BUY LONG @ {currentPrice}
                    </button>
                    <button
                      onClick={() => handleOpenTrade("short")}
                      className="w-full py-2.5 rounded-md bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-sm"
                    >
                      SELL SHORT @ {currentPrice}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCloseTrade}
                    className="w-full py-2.5 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-sm"
                  >
                    FLATTEN POSITION (CLOSE TRADE)
                  </button>
                )}
              </div>
            </div>

            {/* Position Monitor */}
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between font-mono">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground">Active Position</span>
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
                        {activePosition.direction} 1 lot
                      </span>
                      <span className="text-xs text-white">Entry: {activePosition.entryPrice}</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground font-sans">
                    No active position. Use Buy/Sell to test your trading setup live.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#202634]">
                <span className="text-[10px] uppercase text-muted-foreground block">Floating Unrealized P&L</span>
                <p className={cn("text-xl font-bold mt-0.5", pnlColor(unrealizedPnl))}>
                  {formatPnL(unrealizedPnl)}
                </p>
              </div>
            </div>

            {/* Session Performance */}
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between font-mono">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground">Session Realized P&L</span>
                <p className={cn("text-xl font-bold mt-1", pnlColor(totalRealizedPnl))}>
                  {formatPnL(totalRealizedPnl)}
                </p>
              </div>

              <div className="pt-3 border-t border-[#202634] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Trades</span>
                  <span className="font-bold text-white">{completedTrades.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Win Rate</span>
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
        <div className="space-y-6">
          {/* Replay Toolbar & Playback Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11141a] p-3 rounded-lg border border-[#202634]">
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="font-bold text-white text-sm">{selectedInstrument.id} • 5m</span>
              <span className="text-muted-foreground">
                Bar {currentIndex} of {fullCandles.length}
              </span>
              <span className="text-muted-foreground">{currentCandle?.time}</span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-md border border-[#202634] bg-[#141821] p-1">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(10, prev - 1))}
                  className="p-1 rounded hover:bg-[#202634] text-muted-foreground hover:text-white cursor-pointer"
                  title="Step Back 1 Bar"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                  title={isPlaying ? "Pause" : "Play Replay"}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(fullCandles.length, prev + 1))}
                  className="p-1 rounded hover:bg-[#202634] text-muted-foreground hover:text-white cursor-pointer"
                  title="Step Forward 1 Bar"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-1 rounded hover:bg-[#202634] text-muted-foreground hover:text-white cursor-pointer"
                  title="Reset Session"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <select
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="h-8 rounded-md border border-[#202634] bg-[#141821] px-2 font-mono text-xs text-foreground cursor-pointer"
              >
                <option value="0.5x">0.5x</option>
                <option value="1x">1x</option>
                <option value="2x">2x</option>
                <option value="5x">5x</option>
                <option value="10x">10x</option>
              </select>
            </div>
          </div>

          {/* Candlestick Canvas (Lightweight Charts) */}
          <div className="space-y-2">
            <LightweightCandlestickChart candles={visibleCandles} currentPrice={currentPrice} />

            {/* Timeline Scrubber */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] font-mono text-muted-foreground">Session Open</span>
              <input
                type="range"
                min={10}
                max={fullCandles.length}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[#141821] rounded"
              />
              <span className="text-[10px] font-mono text-muted-foreground">Session Close</span>
            </div>
          </div>

          {/* Simulated Execution & Live Position Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Trade Execution Controls */}
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
                  Simulated Execution
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Enter market orders at the exact bar close price to test forward performance.
                </p>
              </div>

              <div className="space-y-2">
                {!activePosition ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenTrade("long")}
                      className="w-full py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-sm"
                    >
                      BUY LONG @ {currentPrice}
                    </button>
                    <button
                      onClick={() => handleOpenTrade("short")}
                      className="w-full py-2.5 rounded-md bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-sm"
                    >
                      SELL SHORT @ {currentPrice}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCloseTrade}
                    className="w-full py-2.5 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-sm"
                  >
                    FLATTEN POSITION (CLOSE TRADE)
                  </button>
                )}
              </div>
            </div>

            {/* Active Position Card */}
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between font-mono">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground">Active Position Status</span>
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
                        {activePosition.direction} 1 lot
                      </span>
                      <span className="text-xs text-white">Entry: {activePosition.entryPrice}</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground font-sans">
                    No open position. Click Buy or Sell to enter simulation trade.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#202634]">
                <span className="text-[10px] uppercase text-muted-foreground block">Floating Unrealized P&L</span>
                <p className={cn("text-xl font-bold mt-0.5", pnlColor(unrealizedPnl))}>
                  {formatPnL(unrealizedPnl)}
                </p>
              </div>
            </div>

            {/* Replay Session Summary Card */}
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between font-mono">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground">Replay Session P&L</span>
                <p className={cn("text-xl font-bold mt-1", pnlColor(totalRealizedPnl))}>
                  {formatPnL(totalRealizedPnl)}
                </p>
              </div>

              <div className="pt-3 border-t border-[#202634] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Trades</span>
                  <span className="font-bold text-white">{completedTrades.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Win Rate</span>
                  <span className="font-bold text-white">
                    {completedTrades.length > 0 ? `${winRate.toFixed(1)}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Completed Trades in Replay Session */}
          {completedTrades.length > 0 && (
            <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Replay Session Executions ({completedTrades.length})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#141821] text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Direction</th>
                      <th className="px-3 py-2">Entry</th>
                      <th className="px-3 py-2">Exit</th>
                      <th className="px-3 py-2 text-right">Realized P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202634]">
                    {completedTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-[#151a24] transition-colors">
                        <td className="px-3 py-2 text-muted-foreground">{t.time}</td>
                        <td className="px-3 py-2 uppercase font-bold">
                          <span className={t.direction === "long" ? "text-emerald-400" : "text-rose-400"}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="px-3 py-2">{t.entryPrice}</td>
                        <td className="px-3 py-2">{t.exitPrice}</td>
                        <td className={cn("px-3 py-2 text-right font-bold", pnlColor(t.pnl))}>
                          {formatPnL(t.pnl)}
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
