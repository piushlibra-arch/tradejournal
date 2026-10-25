"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { accountsApi, Account } from "@/lib/api/accounts"
import { useAuth } from "@/lib/auth/auth-context"

interface AccountContextType {
  accounts: Account[]
  selectedAccountId: string
  selectedAccount: Account | null
  accountCurrency: string
  isLoading: boolean
  setSelectedAccountId: (id: string) => void
  refreshAccounts: () => Promise<void>
}

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  selectedAccountId: "all",
  selectedAccount: null,
  accountCurrency: "USD",
  isLoading: true,
  setSelectedAccountId: () => {},
  refreshAccounts: async () => {},
})

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountIdState] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  const storageKey = user ? `mytradejournal_selected_account_${user.id}` : null

  const refreshAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const data = await accountsApi.list()
      setAccounts(data)

      // Restore user-scoped selection from localStorage if valid
      if (storageKey) {
        const stored = localStorage.getItem(storageKey)
        if (stored && (stored === "all" || data.some((a) => a.id === stored))) {
          setSelectedAccountIdState(stored)
        } else if (data.length > 0) {
          // If stored account is no longer valid, default to "all"
          setSelectedAccountIdState("all")
          localStorage.setItem(storageKey, "all")
        }
      }
    } catch (err) {
      console.error("Failed to load accounts in AccountProvider", err)
    } finally {
      setIsLoading(false)
    }
  }, [user, storageKey])

  useEffect(() => {
    refreshAccounts()
  }, [refreshAccounts])

  const setSelectedAccountId = useCallback(
    (id: string) => {
      setSelectedAccountIdState(id)
      if (storageKey) {
        localStorage.setItem(storageKey, id)
      }
    },
    [storageKey]
  )

  const selectedAccount =
    selectedAccountId === "all"
      ? null
      : accounts.find((a) => a.id === selectedAccountId) || null

  // If a specific account is chosen, use its currency; if "all", check if all accounts share currency or default to first/USD
  const accountCurrency = selectedAccount
    ? selectedAccount.currency
    : accounts.length > 0 && accounts.every((a) => a.currency === accounts[0].currency)
    ? accounts[0].currency
    : "USD"

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccountId,
        selectedAccount,
        accountCurrency,
        isLoading,
        setSelectedAccountId,
        refreshAccounts,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider")
  }
  return context
}
