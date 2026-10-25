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
  height = "100%",
}: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clean up any previous widget instances before injecting a new one
    container.innerHTML = ""

    const widgetDiv = document.createElement("div")
    widgetDiv.className = "tradingview-widget-container__widget"
    widgetDiv.style.height = "calc(100% - 32px)"
    widgetDiv.style.width = "100%"
    container.appendChild(widgetDiv)

    const copyrightDiv = document.createElement("div")
    copyrightDiv.className = "tradingview-widget-copyright"
    copyrightDiv.style.height = "32px"
    copyrightDiv.style.lineHeight = "32px"
    copyrightDiv.style.textAlign = "center"
    copyrightDiv.style.fontSize = "11px"
    copyrightDiv.style.color = "#787b86"
    copyrightDiv.style.backgroundColor = "#131722"
    copyrightDiv.innerHTML = `
      <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color: #787b86; text-decoration: none; font-size: 11px;">
        Track all markets on <span style="color: #2962ff; font-weight: 500;">TradingView</span>
      </a>
    `
    container.appendChild(copyrightDiv)

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      width: "100%",
      height: "100%",
      symbol: symbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: theme,
      style: "1", // Japanese Candlesticks
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false, // Full left-hand drawing toolbar with lines, shapes, fibs
      withdateranges: true, // Bottom date ranges (1D, 5D, 1M, 3M, 6M, YTD, 1Y, ALL)
      details: false, // Maximize candlestick chart width by disabling right watchlist sidebar
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
        "STD;SMA" // Overlay SMA directly on price candles - zero sub-pane vertical compression
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
  }, [symbol, interval, theme])

  const heightStyle = typeof height === "number" ? `${height}px` : height

  return (
    <div
      className="tradingview-widget-container relative w-full h-full"
      ref={containerRef}
      style={{
        height: heightStyle,
        minHeight: typeof height === "number" ? `${height}px` : "520px",
        width: "100%",
      }}
    />
  )
}

export default memo(TradingViewAdvancedChart)
