"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts"
import { Maximize2, Minimize2, RefreshCw } from "lucide-react"

export interface CandleData {
  time: number // Unix timestamp in seconds
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface ReplayChartProps {
  candles: CandleData[]
  symbolName?: string
  timeframe?: string
  height?: number
}

interface LegendData {
  time?: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  change: number
  changePercent: number
  isUp: boolean
}

export default function LightweightCandlestickChart({
  candles,
  symbolName = "XAUUSD",
  timeframe = "5m",
  height = 640,
}: ReplayChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [legend, setLegend] = useState<LegendData | null>(null)

  // Format price helper
  const formatVal = (v: number | undefined, precision: number = 2) => {
    if (v === undefined || isNaN(v)) return "—"
    return v.toLocaleString("en-US", {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
  }

  // Determine precision
  const precision = symbolName.includes("EUR") || symbolName.includes("USD") && !symbolName.includes("XAU") && !symbolName.includes("BTC") ? 4 : 2

  // Update legend data from candle
  const updateLegendFromCandle = useCallback((c?: CandleData) => {
    if (!c) {
      setLegend(null)
      return
    }
    const diff = c.close - c.open
    const pct = c.open > 0 ? (diff / c.open) * 100 : 0
    const dateStr = new Date(c.time * 1000).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })

    setLegend({
      time: dateStr,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0,
      change: diff,
      changePercent: pct,
      isUp: diff >= 0,
    })
  }, [])

  // Initialize TradingView-styled Lightweight Chart
  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) return

    // Clean up any existing instances
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#131722" }, // Official TV dark background
        textColor: "#787b86", // TV neutral gray text
        fontSize: 11,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.4)" },
        horzLines: { color: "rgba(42, 46, 57, 0.4)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#758696",
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: "#2a2e39",
        },
        horzLine: {
          color: "#758696",
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: "#2a2e39",
        },
      },
      timeScale: {
        borderColor: "#2a2e39",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 10,
        minBarSpacing: 3,
      },
      rightPriceScale: {
        borderColor: "#2a2e39",
        scaleMargins: {
          top: 0.08,
          bottom: 0.22, // leaves room at the bottom for volume
        },
        autoScale: true,
        alignLabels: true,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
      width: container.clientWidth || 800,
      height: height,
    })

    // Add Candlestick Series with signature TradingView colors
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#089981", // TV Emerald Green
      downColor: "#f23645", // TV Crimson Red
      borderVisible: true,
      borderColor: "#089981",
      borderUpColor: "#089981",
      borderDownColor: "#f23645",
      wickVisible: true,
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
      priceFormat: {
        type: "price",
        precision: precision,
        minMove: precision === 4 ? 0.0001 : 0.01,
      },
    })

    // Add Volume Histogram Series positioned at the bottom of the chart
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // Overlay on main chart
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Takes bottom 20%
        bottom: 0,
      },
    })

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries

    // Crosshair hover legend synchronization
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        // Fallback to latest candle in array
        if (candles.length > 0) {
          updateLegendFromCandle(candles[candles.length - 1])
        }
        return
      }

      const barData = param.seriesData.get(candlestickSeries) as any
      const volData = param.seriesData.get(volumeSeries) as any

      if (barData && typeof barData.close === "number") {
        const diff = barData.close - barData.open
        const pct = barData.open > 0 ? (diff / barData.open) * 100 : 0
        const dateStr = typeof param.time === "number"
          ? new Date(param.time * 1000).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : String(param.time)

        setLegend({
          time: dateStr,
          open: barData.open,
          high: barData.high,
          low: barData.low,
          close: barData.close,
          volume: volData?.value || 0,
          change: diff,
          changePercent: pct,
          isUp: diff >= 0,
        })
      }
    })

    // Responsive Auto Resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !entries[0].contentRect) return
      const { width } = entries[0].contentRect
      if (width > 0 && chartRef.current) {
        chartRef.current.applyOptions({ width })
      }
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candlestickSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [height, precision, updateLegendFromCandle])

  // Update Candlestick and Volume Data when candles change
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return

    // Map candles to Lightweight Charts format
    const candleItems = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    // Map volume bars with matching green / red styling
    const volumeItems = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume || Math.max(10, Math.round(Math.abs(c.close - c.open) * 100 + 50)),
      color: c.close >= c.open ? "rgba(8, 153, 129, 0.45)" : "rgba(242, 54, 69, 0.45)",
    }))

    candlestickSeriesRef.current.setData(candleItems)
    volumeSeriesRef.current.setData(volumeItems)

    // Update legend with latest candle
    const latest = candles[candles.length - 1]
    updateLegendFromCandle(latest)
  }, [candles, updateLegendFromCandle])

  // Fit content helper
  const handleFitContent = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    if (!isFullscreen) {
      if (wrapperRef.current.requestFullscreen) {
        wrapperRef.current.requestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  const latestCandle = candles[candles.length - 1]
  const displayLegend = legend || (latestCandle ? {
    time: new Date(latestCandle.time * 1000).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    open: latestCandle.open,
    high: latestCandle.high,
    low: latestCandle.low,
    close: latestCandle.close,
    volume: latestCandle.volume || 0,
    change: latestCandle.close - latestCandle.open,
    changePercent: latestCandle.open > 0 ? ((latestCandle.close - latestCandle.open) / latestCandle.open) * 100 : 0,
    isUp: latestCandle.close >= latestCandle.open,
  } : null)

  return (
    <div
      ref={wrapperRef}
      className="relative w-full rounded-xl overflow-hidden border border-[#2a2e39] bg-[#131722] shadow-2xl flex flex-col"
    >
      {/* Top TradingView-Style Ticker Ribbon & Real-time OHLCV Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-[#171b26] border-b border-[#2a2e39] select-none text-xs">
        {/* Left: Symbol & Timeframe badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-sm tracking-wide font-mono">
              {symbolName}
            </span>
            <span className="rounded bg-[#2a2e39] px-1.5 py-0.5 text-[11px] font-semibold text-[#9db2c8] font-mono">
              {timeframe}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              ● Replay Engine
            </span>
          </div>

          {/* Interactive TradingView OHLCV Legend */}
          {displayLegend && (
            <div className="hidden sm:flex items-center gap-3 font-mono text-[11px]">
              <div className="flex items-center gap-1">
                <span className="text-[#787b86]">O</span>
                <span className={displayLegend.isUp ? "text-[#089981]" : "text-[#f23645]"}>
                  {formatVal(displayLegend.open, precision)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#787b86]">H</span>
                <span className={displayLegend.isUp ? "text-[#089981]" : "text-[#f23645]"}>
                  {formatVal(displayLegend.high, precision)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#787b86]">L</span>
                <span className={displayLegend.isUp ? "text-[#089981]" : "text-[#f23645]"}>
                  {formatVal(displayLegend.low, precision)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#787b86]">C</span>
                <span className={displayLegend.isUp ? "text-[#089981]" : "text-[#f23645]"}>
                  {formatVal(displayLegend.close, precision)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={
                    displayLegend.isUp
                      ? "text-[#089981] font-semibold"
                      : "text-[#f23645] font-semibold"
                  }
                >
                  {displayLegend.change >= 0 ? "+" : ""}
                  {formatVal(displayLegend.change, precision)} (
                  {displayLegend.changePercent >= 0 ? "+" : ""}
                  {displayLegend.changePercent.toFixed(2)}%)
                </span>
              </div>
              {displayLegend.volume > 0 && (
                <div className="flex items-center gap-1 text-[#787b86]">
                  <span>Vol</span>
                  <span className="text-[#9db2c8]">
                    {displayLegend.volume.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Controls: Fit View & Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFitContent}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#202634] hover:bg-[#2a3245] text-muted-foreground hover:text-white text-[11px] transition-colors cursor-pointer"
            title="Auto-fit Candlestick Chart"
          >
            <RefreshCw className="h-3 w-3" />
            <span className="hidden md:inline">Fit Content</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1 rounded bg-[#202634] hover:bg-[#2a3245] text-muted-foreground hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chart"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Candlestick & Volume Chart Canvas */}
      <div
        ref={chartContainerRef}
        className="w-full relative"
        style={{ height: `${height}px`, minHeight: `${height}px` }}
      />
    </div>
  )
}
