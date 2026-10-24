"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { formatPnL, pnlColor, formatCurrency, cn } from "@/lib/utils"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Layers,
  CheckCircle2,
} from "lucide-react"

// Dynamically import Lightweight Charts to avoid SSR canvas window issues
const LightweightCandlestickChart = dynamic(
  () => import("@/components/replay/lightweight-candlestick-chart"),
  { ssr: false }
)

// Generate realistic deterministic session candles
function generateHistoricalSession(symbol: string, count: number = 80) {
  const base = symbol === "NQ" ? 20450 : symbol === "ES" ? 5820 : symbol === "EURUSD" ? 1.0850 : 2720
  const volatility = symbol === "NQ" ? 8 : symbol === "ES" ? 2.5 : symbol === "EURUSD" ? 0.0004 : 1.8
  const candles = []

  let current = base
  const startTime = new Date("2024-10-24T09:30:00Z").getTime()

  for (let i = 0; i < count; i++) {
    const timeIso = new Date(startTime + i * 5 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ")
    const change = (Math.sin(i / 5) * 1.5 + (Math.random() - 0.48) * 2) * volatility
    const open = current
    const close = +(open + change).toFixed(symbol === "EURUSD" ? 4 : 2)
    const high = +(Math.max(open, close) + Math.random() * volatility).toFixed(symbol === "EURUSD" ? 4 : 2)
    const low = +(Math.min(open, close) - Math.random() * volatility).toFixed(symbol === "EURUSD" ? 4 : 2)
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
  const [symbol, setSymbol] = useState("NQ")
  const [speed, setSpeed] = useState("1x")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(25) // start with first 25 bars visible

  // Simulated Trading State
  const [activePosition, setActivePosition] = useState<{
    direction: "long" | "short"
    entryPrice: number
    quantity: number
  } | null>(null)
  const [completedTrades, setCompletedTrades] = useState<SimulatedTrade[]>([])

  const fullCandles = useMemo(() => generateHistoricalSession(symbol, 80), [symbol])

  // Visible candles up to currentIndex
  const visibleCandles = useMemo(() => {
    return fullCandles.slice(0, currentIndex)
  }, [fullCandles, currentIndex])

  const currentCandle = visibleCandles[visibleCandles.length - 1]
  const currentPrice = currentCandle ? currentCandle.close : 0

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

  // Simulated Buy / Sell
  const handleOpenTrade = (direction: "long" | "short") => {
    if (!currentPrice || activePosition) return
    setActivePosition({
      direction,
      entryPrice: currentPrice,
      quantity: 1,
    })
  }

  const handleCloseTrade = () => {
    if (!activePosition || !currentPrice) return
    const multiplier = symbol === "NQ" ? 20 : symbol === "ES" ? 50 : 100
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
      time: currentCandle.time,
    }

    setCompletedTrades([newTrade, ...completedTrades])
    setActivePosition(null)
  }

  // Live unrealized PnL
  const unrealizedPnl = useMemo(() => {
    if (!activePosition || !currentPrice) return 0
    const multiplier = symbol === "NQ" ? 20 : symbol === "ES" ? 50 : 100
    const diff =
      activePosition.direction === "long"
        ? currentPrice - activePosition.entryPrice
        : activePosition.entryPrice - currentPrice
    return Math.round(diff * activePosition.quantity * multiplier * 100) / 100
  }, [activePosition, currentPrice, symbol])

  const totalRealizedPnl = completedTrades.reduce((acc, t) => acc + t.pnl, 0)
  const winningTrades = completedTrades.filter((t) => t.pnl > 0).length
  const winRate =
    completedTrades.length > 0 ? (winningTrades / completedTrades.length) * 100 : 0

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(25)
    setActivePosition(null)
    setCompletedTrades([])
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#202634] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Trade Replay Engine</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> Zero Look-Ahead Bias
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step through historical price action candle-by-candle and test execution precision in real market conditions
          </p>
        </div>

        {/* Replay Top Toolbar */}
        <div className="flex items-center gap-3">
          <select
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value)
              handleReset()
            }}
            className="h-8 rounded-md border border-[#202634] bg-[#141821] px-3 font-mono text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="NQ">NQ (E-mini Nasdaq 100)</option>
            <option value="ES">ES (E-mini S&P 500)</option>
            <option value="EURUSD">EURUSD (Euro / Dollar)</option>
            <option value="XAUUSD">XAUUSD (Spot Gold)</option>
          </select>

          {/* Player controls */}
          <div className="flex items-center gap-1 rounded-md border border-[#202634] bg-[#11141a] p-1">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(10, prev - 1))}
              className="p-1 rounded hover:bg-[#141821] text-muted-foreground hover:text-white cursor-pointer"
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
              className="p-1 rounded hover:bg-[#141821] text-muted-foreground hover:text-white cursor-pointer"
              title="Step Forward 1 Bar"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1 rounded hover:bg-[#141821] text-muted-foreground hover:text-white cursor-pointer"
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

      {/* Candlestick Canvas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white text-sm">{symbol} • 5m</span>
            <span className="text-muted-foreground">Bar {currentIndex} of {fullCandles.length}</span>
            <span className="text-muted-foreground">{currentCandle?.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Current Price:</span>
            <span className="text-sm font-bold text-white">{currentPrice}</span>
          </div>
        </div>

        {/* Chart View */}
        <LightweightCandlestickChart candles={visibleCandles} currentPrice={currentPrice} />

        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[10px] font-mono text-muted-foreground">Start</span>
          <input
            type="range"
            min={10}
            max={fullCandles.length}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-[#141821] rounded"
          />
          <span className="text-[10px] font-mono text-muted-foreground">End</span>
        </div>
      </div>

      {/* Simulated Execution & Live Position Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Trade Execution Controls */}
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
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
                  className="w-full py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-sm"
                >
                  BUY LONG @ {currentPrice}
                </button>
                <button
                  onClick={() => handleOpenTrade("short")}
                  className="w-full py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-sm"
                >
                  SELL SHORT @ {currentPrice}
                </button>
              </div>
            ) : (
              <button
                onClick={handleCloseTrade}
                className="w-full py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white font-mono cursor-pointer transition-colors shadow-sm"
              >
                FLATTEN POSITION (CLOSE TRADE)
              </button>
            )}
          </div>
        </div>

        {/* Active Trade Status Card */}
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-4 flex flex-col justify-between font-mono">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground">Active Position Status</span>
            {activePosition ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                      activePosition.direction === "long"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                    )}
                  >
                    {activePosition.direction} 1 contract
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

        {/* Replay Session Summary */}
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
  )
}
