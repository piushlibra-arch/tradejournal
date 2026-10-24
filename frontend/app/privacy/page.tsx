import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-foreground py-16 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
        <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground">Last updated: October 2024</p>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-6 space-y-4 text-xs text-muted-foreground leading-relaxed">
          <p>
            This privacy policy placeholder outlines how MyTradeJournal collects, stores, and protects user data.
          </p>
          <h2 className="text-sm font-semibold text-white">1. Data Isolation & Security</h2>
          <p>
            All trade records, account balances, and journal notes are strictly isolated per registered user account using database-enforced row ownership checks.
          </p>
          <h2 className="text-sm font-semibold text-white">2. Trade Information</h2>
          <p>
            We do not share, sell, or disclose your trading records, strategies, or execution fills to any third parties.
          </p>
        </div>
      </div>
    </div>
  )
}
