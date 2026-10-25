/**
 * Centralized Currency Resolution and Monetary Formatting Service
 * Supports Indian Rupee (INR / ₹) with Indian numbering format,
 * US Dollar (USD / $), Euro (EUR / €), British Pound (GBP / £), etc.
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
}

export const CURRENCY_LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  JPY: "ja-JP",
  AUD: "en-AU",
  CAD: "en-CA",
}

export function getCurrencySymbol(currency: string = "USD"): string {
  const clean = currency.toUpperCase().trim()
  return CURRENCY_SYMBOLS[clean] || "$"
}

/**
 * Format a monetary amount (e.g. ₹1,25,000.50 or $125,000.50)
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "USD",
  decimals: number = 2
): string {
  if (value === null || value === undefined || value === "") {
    return `${getCurrencySymbol(currency)}0.00`
  }
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) {
    return `${getCurrencySymbol(currency)}0.00`
  }

  const cleanCurr = currency.toUpperCase().trim()
  const locale = CURRENCY_LOCALES[cleanCurr] || "en-US"

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cleanCurr,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num)
  } catch {
    const sym = getCurrencySymbol(cleanCurr)
    return `${sym}${num.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`
  }
}

/**
 * Format Realized / Unrealized P&L with sign prefix (+₹1,500.00 or -₹750.00)
 */
export function formatPnL(
  value: number | string | null | undefined,
  currency: string = "USD"
): string {
  if (value === null || value === undefined || value === "") {
    return `${getCurrencySymbol(currency)}0.00`
  }
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) {
    return `${getCurrencySymbol(currency)}0.00`
  }

  const prefix = num > 0 ? "+" : ""
  return prefix + formatCurrency(num, currency)
}

/**
 * Format an instrument price without style: "currency" if symbol is desired separately
 */
export function formatPrice(
  value: number | string | null | undefined,
  currency: string = "USD",
  decimals: number = 2
): string {
  if (value === null || value === undefined || value === "") return "0.00"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "0.00"

  const cleanCurr = currency.toUpperCase().trim()
  const locale = CURRENCY_LOCALES[cleanCurr] || "en-US"
  const sym = getCurrencySymbol(cleanCurr)

  return `${sym}${num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/**
 * Resolve trade currency code based on trade metadata, exchange, or account currency
 */
export function resolveTradeCurrency(
  tradeOrCurrency?:
    | {
        currency?: string | null
        symbol?: string | null
        import_source?: string | null
        asset_class?: string | null
      }
    | string
    | null,
  symbolOrAccountCurrency?: string,
  fallbackAccountCurrency: string = "USD"
): string {
  if (!tradeOrCurrency) return symbolOrAccountCurrency || fallbackAccountCurrency

  // Case 1: called as resolveTradeCurrency(currencyString, symbolString, fallbackCurrency)
  if (typeof tradeOrCurrency === "string") {
    if (tradeOrCurrency.trim()) {
      return tradeOrCurrency.toUpperCase().trim()
    }
    const sym = (symbolOrAccountCurrency || "").toUpperCase().trim()
    if (
      sym.startsWith("NIFTY") ||
      sym.startsWith("BANKNIFTY") ||
      sym.startsWith("FINNIFTY") ||
      sym.startsWith("SENSEX") ||
      sym.endsWith(".NS") ||
      sym.endsWith(".BO")
    ) {
      return "INR"
    }
    return fallbackAccountCurrency
  }

  // Case 2: called as resolveTradeCurrency(tradeObject, accountCurrency)
  const trade = tradeOrCurrency
  const accountCurrency = symbolOrAccountCurrency || fallbackAccountCurrency

  // 1. Explicit trade currency
  if (trade.currency && trade.currency.trim()) {
    return trade.currency.toUpperCase().trim()
  }

  // 2. Dhan import source
  if (trade.import_source?.toLowerCase().includes("dhan")) {
    return "INR"
  }

  // 3. Indian symbols / index patterns
  const sym = (trade.symbol || "").toUpperCase()
  if (
    sym.startsWith("NIFTY") ||
    sym.startsWith("BANKNIFTY") ||
    sym.startsWith("FINNIFTY") ||
    sym.startsWith("SENSEX") ||
    sym.endsWith(".NS") ||
    sym.endsWith(".BO")
  ) {
    return "INR"
  }

  return accountCurrency
}
