"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authApi, UserProfile, LoginPayload, RegisterPayload } from "@/lib/api/auth"

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("mtj_access_token") : null
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }
      const data = await authApi.getMe()
      setUser(data)
    } catch {
      authApi.logout()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (payload: LoginPayload) => {
    await authApi.login(payload)
    await refreshUser()
  }

  const register = async (payload: RegisterPayload) => {
    await authApi.register(payload)
    await authApi.login({ email: payload.email, password: payload.password })
    await refreshUser()
  }

  const logout = () => {
    authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
