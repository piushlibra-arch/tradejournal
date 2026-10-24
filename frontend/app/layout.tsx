import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/lib/providers"

export const metadata: Metadata = {
  title: "MyTradeJournal — Trade. Review. Improve.",
  description:
    "A professional trading journal, execution audit, and performance analytics platform inspired by TradeZella.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#090a0d] text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
