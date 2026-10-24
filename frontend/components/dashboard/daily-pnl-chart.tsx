"use client"

import React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"
import { DailyPnLPoint } from "@/lib/api/analytics"
import { formatCurrency, formatPnL } from "@/lib/utils"

interface Props {
  data: DailyPnLPoint[]
}

export function DailyPnLChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-muted-foreground font-mono">
        No daily P&L data recorded
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    fullDate: d.date,
    pnl: parseFloat(d.net_pnl),
    count: d.trades_count,
    winRate: d.win_rate,
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis
            dataKey="date"
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
            tickFormatter={(v) => `$${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
          />
          <ReferenceLine y={0} stroke="#202634" />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload
                return (
                  <div className="rounded border border-[#202634] bg-[#11141a] p-2.5 text-xs shadow-lg font-mono">
                    <p className="text-muted-foreground text-[10px]">{item.fullDate}</p>
                    <p className={`font-bold mt-1 ${item.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatPnL(item.pnl)}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      {item.count} trades | {item.winRate}% Win Rate
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
