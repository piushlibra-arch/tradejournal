import Link from "next/link"
import {
  TrendingUp,
  BarChart3,
  BookOpen,
  Calendar,
  Shield,
  Target,
  ArrowRight,
  CheckCircle2,
  LineChart,
  PlayCircle,
  FlaskConical,
  Award,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-foreground flex flex-col justify-between">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#202634] bg-[#090a0d]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white">MyTradeJournal</span>
              <span className="text-[10px] text-muted-foreground font-mono">Trade. Review. Improve.</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-muted-foreground">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-muted-foreground hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400">
            <Award className="h-3.5 w-3.5" /> Next-Gen Trading Journal & Performance Analytics
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Stop Guessing. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Trade. Review. Improve.
            </span>
          </h1>

          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Record every execution fill, audit trading mistakes, track daily psychological discipline, and
            evaluate true statistical expectancy across forex, futures, stocks, and prop-firm evaluations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto justify-center"
            >
              Start Journaling Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-md border border-[#202634] bg-[#141821] px-6 py-3 text-sm font-semibold text-foreground hover:bg-[#1c222e] transition-colors w-full sm:w-auto justify-center"
            >
              Explore Live Demo
            </Link>
          </div>

          {/* Social Proof Metric bar */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-center">
            <div className="p-3 rounded-lg border border-[#202634] bg-[#11141a]/60">
              <span className="text-xl font-bold font-mono text-white">100%</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Data Isolation</p>
            </div>
            <div className="p-3 rounded-lg border border-[#202634] bg-[#11141a]/60">
              <span className="text-xl font-bold font-mono text-emerald-400">Decimal</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">NUMERIC Precision</p>
            </div>
            <div className="p-3 rounded-lg border border-[#202634] bg-[#11141a]/60">
              <span className="text-xl font-bold font-mono text-indigo-400">13</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Core SaaS Modules</p>
            </div>
            <div className="p-3 rounded-lg border border-[#202634] bg-[#11141a]/60">
              <span className="text-xl font-bold font-mono text-white">Prop-Firm</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Compliance Tracking</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Modules Section */}
      <section id="features" className="py-20 px-6 border-t border-[#202634] bg-[#0c0e14]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Engineered For Serious Traders
            </h2>
            <p className="text-xs text-muted-foreground">
              A comprehensive modular monolith built to answer every critical question about your trading edge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: BookOpen,
                title: "Trade Journal & Multi-Fills",
                desc: "Record multiple executions per position. Compute gross/net P&L with exact fees, commissions, and contract multipliers.",
              },
              {
                icon: BarChart3,
                title: "Verified Analytics Engine",
                desc: "Automatic profit factor, peak-to-trough drawdown, expectancy per completed trade, and breakeven handling.",
              },
              {
                icon: Calendar,
                title: "Trading Calendar",
                desc: "Visualize daily net profitability and volume across calendar days with clear distinction between no activity and breakeven.",
              },
              {
                icon: Target,
                title: "Strategy & Playbook",
                desc: "Categorize trades by edge setups, track adherence checklists, and prevent recurring execution mistakes.",
              },
              {
                icon: Shield,
                title: "Risk Manager",
                desc: "Configurable max daily loss limits, trailing drawdown floors, and session compliance safeguards.",
              },
              {
                icon: PlayCircle,
                title: "Candle Replay & Backtest",
                desc: "Historical bar-by-bar candle replay and strategy backtesting simulation without look-ahead bias.",
              },
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className="rounded-xl border border-[#202634] bg-[#11141a] p-6 space-y-3 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-white">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 border-t border-[#202634]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Transparent Pricing</h2>
            <p className="text-xs text-muted-foreground">Invest in your trading career with clear, simple tiers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Free Starter",
                price: "$0",
                cadence: "forever",
                features: ["Up to 50 trades / month", "1 Trading Account", "Core Trade Journal", "Basic Calendar P&L", "CSV Export"],
                cta: "Start Free",
                highlight: false,
              },
              {
                name: "Pro Trader",
                price: "$29",
                cadence: "per month",
                features: ["Unlimited Trades & Fills", "Unlimited Trading Accounts", "Full Analytics & Expectancy", "Risk Manager Alerts", "Strategy Playbook", "Candle Replay & Backtest"],
                cta: "Get Pro Access",
                highlight: true,
              },
              {
                name: "Prop Firm / Team",
                price: "$79",
                cadence: "per month",
                features: ["Everything in Pro", "Multi-account Drawdown Rules", "Audit Statements (PDF)", "Priority API Integration", "Team Analytics & Review"],
                cta: "Contact Enterprise",
                highlight: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-xl border p-6 flex flex-col justify-between space-y-6 ${
                  plan.highlight
                    ? "border-indigo-500 bg-indigo-950/15 shadow-xl ring-1 ring-indigo-500/50"
                    : "border-[#202634] bg-[#11141a]"
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-white">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white font-mono">{plan.price}</span>
                      <span className="text-xs text-muted-foreground">{plan.cadence}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/register"
                  className={`w-full py-2.5 rounded-md text-center text-xs font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                      : "border border-[#202634] bg-[#141821] text-foreground hover:bg-[#1a202c]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#202634] bg-[#0c0e14] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-white">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-white">MyTradeJournal</span>
            <span>— Trade. Review. Improve.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/login" className="hover:text-white transition-colors">App Login</Link>
          </div>

          <p className="text-[11px] font-mono">© 2026 MyTradeJournal. Production release v0.1.0.</p>
        </div>
      </footer>
    </div>
  )
}
