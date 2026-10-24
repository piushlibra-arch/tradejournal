"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { accountsApi, Account } from "@/lib/api/accounts"
import {
  Search,
  Bell,
  LogOut,
  Settings,
  ChevronDown,
  User,
  Plus,
} from "lucide-react"

export function TopBar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all")
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)

  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await accountsApi.list()
        setAccounts(data)
      } catch {
        // Accounts might be empty initially
      }
    }
    loadAccounts()
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

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
        {/* Notifications */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[#151922] hover:text-foreground cursor-pointer"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </button>

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
