import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-foreground py-16 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
        <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
        <p className="text-xs text-muted-foreground">Last updated: October 2024</p>

        <div className="rounded-lg border border-[#202634] bg-[#11141a] p-6 space-y-4 text-xs text-muted-foreground leading-relaxed">
          <p>
            Welcome to MyTradeJournal. By using our trading journaling and performance analytics platform, you agree to these terms.
          </p>
          <h2 className="text-sm font-semibold text-white">1. Not Financial Advice</h2>
          <p>
            MyTradeJournal provides performance analytics, backtesting simulations, and journaling software. Nothing within this platform constitutes financial or investment advice.
          </p>
          <h2 className="text-sm font-semibold text-white">2. Simulation & Backtesting</h2>
          <p>
            Past performance, replay metrics, and backtest results do not guarantee future returns.
          </p>
        </div>
      </div>
    </div>
  )
}
