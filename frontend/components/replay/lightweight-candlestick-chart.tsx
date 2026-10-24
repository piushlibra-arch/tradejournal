"use client"

import React, { useEffect, useRef } from "react"
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts"

export interface CandleData {
  time: string
  open: number
  high: number
  low: number
  close: number
}

interface ReplayChartProps {
  candles: CandleData[]
  currentPrice?: number
}

export default function LightweightCandlestickChart({
  candles,
  currentPrice,
}: ReplayChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const container = chartContainerRef.current
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#11141a" },
        textColor: "#94a3b8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1c2230" },
        horzLines: { color: "#1c2230" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: "#202634",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#202634",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      width: container.clientWidth,
      height: 420,
    })

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [])

  // Update candlestick series data when candles prop updates
  useEffect(() => {
    if (seriesRef.current && candles.length > 0) {
      seriesRef.current.setData(candles as any)
      if (chartRef.current) {
        chartRef.current.timeScale().scrollToRealTime()
      }
    }
  }, [candles])

  return (
    <div className="w-full relative">
      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden border border-[#202634]" />
    </div>
  )
}
