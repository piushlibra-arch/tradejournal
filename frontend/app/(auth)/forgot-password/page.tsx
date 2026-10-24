"use client"

import React, { useState } from "react"
import Link from "next/link"
import { TrendingUp, ArrowLeft, Mail, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#090a0d] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">MyTradeJournal</span>
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Reset your password</h1>
          <p className="text-xs text-muted-foreground mt-1">Enter your registered email to receive reset instructions</p>
        </div>

        <div className="rounded-xl border border-[#202634] bg-[#11141a] p-6 shadow-2xl">
          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
              <h2 className="text-sm font-semibold text-white">Reset instructions sent</h2>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                If an account exists for <span className="text-foreground font-mono">{email}</span>, you will receive a password reset link shortly.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline font-medium"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@example.com"
                    className="h-10 w-full rounded-md border border-[#202634] bg-[#141821] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 flex h-10 w-full items-center justify-center rounded-md bg-indigo-600 font-medium text-sm text-white shadow-md hover:bg-indigo-700 cursor-pointer transition-colors"
              >
                Send Reset Link
              </button>

              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
