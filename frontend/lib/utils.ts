import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || value === "") return "$0.00"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatPnL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "$0.00"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "$0.00"
  const prefix = num > 0 ? "+" : ""
  return prefix + formatCurrency(num)
}

export function formatPercent(value: number | string | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || value === "") return "0.0%"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "0.0%"
  return `${num.toFixed(decimals)}%`
}

export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === "") return "0"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "0"
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function pnlColor(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "text-muted-foreground"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (num > 0) return "text-emerald-400"
  if (num < 0) return "text-rose-400"
  return "text-muted-foreground"
}

export function pnlBgColor(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "bg-muted"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (num > 0) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  if (num < 0) return "bg-rose-500/10 text-rose-400 border-rose-500/20"
  return "bg-muted text-muted-foreground"
}
