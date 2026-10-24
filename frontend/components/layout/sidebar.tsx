"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  BarChart3,
  Target,
  FileSpreadsheet,
  PenTool,
  PlayCircle,
  FlaskConical,
  ShieldAlert,
  Wallet,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react"

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Trade Journal", href: "/trades", icon: BookOpen },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Strategies", href: "/strategies", icon: Target },
  { name: "Playbook", href: "/playbook", icon: FileSpreadsheet },
  { name: "Daily Journal", href: "/journal", icon: PenTool },
  { name: "Trade Replay", href: "/replay", icon: PlayCircle },
  { name: "Backtesting", href: "/backtesting", icon: FlaskConical },
  { name: "Risk Manager", href: "/risk", icon: ShieldAlert },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-[#202634] bg-[#0c0e14] transition-all duration-200 flex flex-col justify-between select-none",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand header */}
      <div>
        <div className="flex h-14 items-center justify-between border-b border-[#202634] px-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <TrendingUp className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-sm tracking-tight text-white">MyTradeJournal</span>
                <span className="text-[10px] text-muted-foreground font-mono">Trade. Review. Improve.</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1 p-2 overflow-y-auto max-h-[calc(100vh-112px)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 font-semibold"
                    : "text-muted-foreground hover:bg-[#151922] hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-400" : "text-muted-foreground")} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Collapse toggle bottom */}
      <div className="border-t border-[#202634] p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-md p-2 text-xs text-muted-foreground hover:bg-[#151922] hover:text-foreground cursor-pointer transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
