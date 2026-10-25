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
  height = 720,
}: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear previous widget
    container.innerHTML = ""

    const widgetContainer = document.createElement("div")
    widgetContainer.className = "tradingview-widget-container__widget"
    widgetContainer.style.height = typeof height === "number" ? `${height}px` : height
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
      style: "1", // Candlestick style
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false, // Left-hand drawing toolbar with trendlines, Fibs, brushes
      withdateranges: true, // Bottom date ranges (1D, 5D, 1M, YTD, 1Y, ALL)
      details: true, // Real-time quote & market details
      hotlist: false,
      calendar: false,
      show_popup_button: true,
      popup_width: "1200",
      popup_height: "800",
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      backgroundColor: "rgba(11, 14, 20, 1)",
      gridColor: "rgba(32, 38, 52, 0.4)",
      studies: [
        "STD;EMA",
        "STD;RSI",
        "STD;MACD",
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

  return (
    <div
      className="tradingview-widget-container rounded-lg overflow-hidden border border-[#202634] bg-[#11141a]"
      ref={containerRef}
      style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%" }}
    />
  )
}

export default memo(TradingViewAdvancedChart)
