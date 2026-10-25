"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { useAccount } from "@/lib/context/account-context"
import { Account } from "@/lib/api/accounts"
import { notificationsApi, NotificationItem } from "@/lib/api/notifications"
import {
  Search,
  Bell,
  LogOut,
  Settings,
  ChevronDown,
  User,
  Plus,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
} from "lucide-react"

export function TopBar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { accounts, selectedAccountId, selectedAccount, setSelectedAccountId } = useAccount()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  // Notification State
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Load Notifications
  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true)
      const res = await notificationsApi.list(15)
      setNotifications(res.notifications)
      setUnreadCount(res.unread_count)
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const handleMarkAsRead = async (id: string, actionUrl?: string | null) => {
    await notificationsApi.markAsRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
    if (actionUrl) {
      setShowNotifications(false)
      router.push(actionUrl)
    }
  }

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const formatRelativeTime = (isoStr: string) => {
    if (!isoStr) return ""
    const diffMs = Date.now() - new Date(isoStr).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
      default:
        return <Info className="h-4 w-4 text-indigo-400 shrink-0" />
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#202634] bg-[#0c0e14]/90 px-6 backdrop-blur-md">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64 md:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search trades, symbols, setups..."
            className="h-8 w-full rounded-md border border-[#202634] bg-[#141821] pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Account Selector */}
        <div className="relative">
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex h-8 items-center gap-2 rounded-md border border-[#202634] bg-[#141821] px-3 text-xs text-foreground hover:bg-[#1a202c] cursor-pointer"
          >
            <span className="text-muted-foreground font-mono text-[11px]">Account:</span>
            <span className="font-medium max-w-[120px] truncate">
              {selectedAccount ? selectedAccount.name : "All Accounts"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {showAccountMenu && (
            <div className="absolute left-0 mt-1.5 w-52 rounded-md border border-[#202634] bg-[#141821] py-1 shadow-lg z-50">
              <button
                onClick={() => {
                  setSelectedAccountId("all")
                  setShowAccountMenu(false)
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-indigo-600/15 hover:text-indigo-400 cursor-pointer"
              >
                All Accounts
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccountId(acc.id)
                    setShowAccountMenu(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-indigo-600/15 hover:text-indigo-400 flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{acc.name}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{acc.currency}</span>
                </button>
              ))}
              <div className="border-t border-[#202634] my-1 pt-1">
                <button
                  onClick={() => {
                    setShowAccountMenu(false)
                    router.push("/accounts")
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-600/15 flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <Plus className="h-3 w-3" /> Manage Accounts
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right User actions */}
      <div className="flex items-center gap-3">
        {/* Notifications Center */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[#151922] hover:text-foreground cursor-pointer transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-[#0c0e14]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#2a2e39] bg-[#141821] shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#202634] bg-[#10131a]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#202634]/50">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif.id, notif.action_url)}
                      className={`flex items-start gap-3 p-3.5 hover:bg-[#1a202c]/60 cursor-pointer transition-colors ${
                        !notif.is_read ? "bg-indigo-950/20" : ""
                      }`}
                    >
                      <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${!notif.is_read ? "text-white" : "text-[#9db2c8]"}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <p className="font-medium text-white mb-1">No notifications</p>
                    <p className="text-[11px]">You are all caught up on alerts and sync events.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-md p-1.5 text-xs text-foreground hover:bg-[#151922] cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold text-xs">
              {user ? user.first_name[0].toUpperCase() : "U"}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="font-medium text-xs">
                {user ? `${user.first_name} ${user.last_name}` : "Trader"}
              </span>
              <span className="text-[10px] text-muted-foreground">{user?.email || "trader@example.com"}</span>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-md border border-[#202634] bg-[#141821] py-1 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-[#202634]">
                <p className="text-xs font-semibold text-white truncate">
                  {user ? `${user.first_name} ${user.last_name}` : "Trader"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  router.push("/settings")
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-[#1f2533] cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Profile
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  router.push("/settings")
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-[#1f2533] cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Settings
              </button>
              <div className="border-t border-[#202634] my-1" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 cursor-pointer font-medium"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
