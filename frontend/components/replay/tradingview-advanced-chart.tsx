"use client"

import React, { useEffect, useRef, memo } from "react"

interface TradingViewAdvancedChartProps {
  symbol?: string
  interval?: string
  theme?: "dark" | "light"
  height?: number | string
}

function TradingViewAdvancedChart({
  symbol = "BINANCE:BTCUSDT",
  interval = "15",
  theme = "dark",
  height = 760,
}: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear previous widget
    container.innerHTML = ""

    const widgetContainer = document.createElement("div")
    widgetContainer.className = "tradingview-widget-container__widget"
    widgetContainer.style.height = "100%"
    widgetContainer.style.width = "100%"
    container.appendChild(widgetContainer)

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: theme,
      style: "1", // Japanese Candlesticks
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false, // Left drawing toolbar: trendlines, fibonacci, text, patterns
      withdateranges: true, // Bottom date ranges (1D, 5D, 1M, 3M, 6M, YTD, 1Y, ALL)
      details: true, // Key stats & 52w high/low
      hotlist: false,
      calendar: false,
      show_popup_button: true,
      popup_width: "1280",
      popup_height: "820",
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      backgroundColor: "#131722",
      gridColor: "rgba(42, 46, 57, 0.45)",
      studies: [
        "STD;SMA" // Overlay SMA on price candles - does NOT split into subpanes, giving candles maximum vertical height
      ],
      disabled_features: ["header_saveload"],
      enabled_features: ["study_templates", "use_localstorage_for_settings"],
    })

    container.appendChild(script)

    return () => {
      if (container) {
        container.innerHTML = ""
      }
    }
  }, [symbol, interval, theme, height])

  const heightStyle = typeof height === "number" ? `${height}px` : height

  return (
    <div
      className="tradingview-widget-container relative w-full rounded-xl overflow-hidden border border-[#2a2e39] bg-[#131722] shadow-2xl"
      ref={containerRef}
      style={{
        height: heightStyle,
        minHeight: heightStyle,
        width: "100%",
      }}
    />
  )
}

export default memo(TradingViewAdvancedChart)
