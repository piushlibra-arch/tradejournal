"use client"

import React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { EquityCurvePoint } from "@/lib/api/analytics"
import { formatCurrency, formatPnL } from "@/lib/utils"

interface Props {
  data: EquityCurvePoint[]
}

export function EquityChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-muted-foreground font-mono">
        No equity curve data available
      </div>
    )
  }

  const chartData = data.map((d, i) => ({
    name: i === 0 ? "Start" : new Date(d.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
    equity: parseFloat(d.equity),
    pnl: parseFloat(d.cumulative_pnl),
    symbol: d.symbol || "",
  }))

  const minEquity = Math.min(...chartData.map((d) => d.equity))
  const maxEquity = Math.max(...chartData.map((d) => d.equity))
  const isNetProfit = (chartData[chartData.length - 1]?.pnl || 0) >= 0

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isNetProfit ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isNetProfit ? "#22c55e" : "#ef4444"} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            stroke="#4b5563"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#4b5563"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            domain={[minEquity * 0.99, maxEquity * 1.01]}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload
                return (
                  <div className="rounded border border-[#202634] bg-[#11141a] p-2.5 text-xs shadow-lg font-mono">
                    <p className="text-muted-foreground text-[10px]">{item.name} {item.symbol ? `(${item.symbol})` : ""}</p>
                    <p className="font-bold text-white mt-1">Equity: {formatCurrency(item.equity)}</p>
                    <p className={item.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      Net P&L: {formatPnL(item.pnl)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={isNetProfit ? "#22c55e" : "#ef4444"}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#equityGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
