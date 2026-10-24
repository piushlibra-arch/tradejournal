"use client"

import React, { useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { User, Lock, Globe, Shield, Save, CheckCircle } from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name || "")
  const [lastName, setLastName] = useState(user?.last_name || "")
  const [timezone, setTimezone] = useState(user?.timezone || "UTC")
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-[#202634] pb-5">
        <h1 className="text-xl font-bold text-white tracking-tight">Account Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal profile, preferred timezone, and security credentials
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-5 space-y-4 text-xs">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-400" /> Personal Information
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-foreground font-medium mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-foreground font-medium mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-foreground font-medium mb-1.5">Email Address</label>
            <input
              type="email"
              disabled
              value={user?.email || "trader@example.com"}
              className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-foreground font-medium mb-1.5">Display Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-9 w-full rounded-md border border-[#202634] bg-[#141821] px-3 text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Chicago">America/Chicago (CST/CDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Europe/Frankfurt">Europe/Frankfurt (CET/CEST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            </select>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-5 space-y-3 text-xs">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-400" /> Security & Authentication
          </h2>
          <p className="text-muted-foreground">
            Your account is secured with bcrypt password hashing and rotating JWT tokens.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" /> {saved ? "Changes Saved!" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
