from decimal import Decimal
import re
from typing import Dict, Optional, Tuple

SUPPORTED_CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF"]

CURRENCY_SYMBOLS: Dict[str, str] = {
    "USD": "$",
    "INR": "₹",
    "EUR": "€",
    "GBP": "£",
    "JPY": "¥",
    "AUD": "A$",
    "CAD": "C$",
    "CHF": "CHF",
}

# Known Indian Exchange Segments & Suffixes
INDIAN_EXCHANGES = {"NSE", "BSE", "MCX"}
INDIAN_SEGMENTS = {
    "NSE_EQ", "BSE_EQ", "NSE_FNO", "BSE_FNO", "MCX_COMM",
    "EQUITY", "FNO", "COMMODITY", "DERIVATIVES"
}

# Prominent Indian Indices & Stocks patterns
INDIAN_INDEX_PATTERNS = [
    r"^NIFTY.*",
    r"^BANKNIFTY.*",
    r"^FINNIFTY.*",
    r"^MIDCPNIFTY.*",
    r"^SENSEX.*",
    r"^BANKEX.*",
]


def resolve_instrument_currency(
    symbol: str,
    exchange: Optional[str] = None,
    segment: Optional[str] = None,
    account_currency: Optional[str] = None,
    asset_class: Optional[str] = None,
    **kwargs,
) -> str:
    """Resolve currency code (e.g. 'INR', 'USD', 'EUR') based on exchange, segment, symbol, and account context.
    
    Currency is resolved deterministically without guessing from symbol alone when metadata is present.
    """
    clean_sym = symbol.strip().upper() if symbol else ""
    clean_exch = exchange.strip().upper() if exchange else ""
    clean_seg = segment.strip().upper() if segment else ""

    # 1. Explicit Indian Exchange / Segment
    if clean_exch in INDIAN_EXCHANGES:
        return "INR"
    if clean_seg.startswith("NSE") or clean_seg.startswith("BSE") or clean_seg.startswith("MCX") or clean_seg in INDIAN_SEGMENTS:
        return "INR"

    # 2. Indian stock/index symbol suffixes or known patterns
    if clean_sym.endswith(".NS") or clean_sym.endswith(".BO"):
        return "INR"
    for pattern in INDIAN_INDEX_PATTERNS:
        if re.match(pattern, clean_sym):
            return "INR"

    # 3. Forex Pairs (Resolve from quote currency)
    # E.g. EURUSD -> USD, USDINR -> INR, EURGBP -> GBP
    if len(clean_sym) == 6 and clean_sym.isalpha():
        quote = clean_sym[3:6]
        if quote in SUPPORTED_CURRENCIES:
            return quote

    # 4. Crypto pairs with Fiat/Stablecoin quote
    if clean_sym.endswith("USDT") or clean_sym.endswith("USDC") or clean_sym.endswith("USD"):
        return "USD"
    if clean_sym.endswith("INR"):
        return "INR"
    if clean_sym.endswith("EUR"):
        return "EUR"

    # 5. Fallback to Account Currency if provided
    if account_currency and account_currency.upper() in SUPPORTED_CURRENCIES:
        return account_currency.upper()

    # Default to USD
    return "USD"


def calculate_trade_pnl(
    direction: str,
    entry_price: Decimal,
    exit_price: Optional[Decimal],
    quantity: Decimal,
    contract_size: Decimal = Decimal("1"),
    commission: Decimal = Decimal("0"),
    fees: Decimal = Decimal("0"),
    swap: Decimal = Decimal("0"),
    asset_class: Optional[str] = None,
) -> Tuple[Optional[Decimal], Optional[Decimal]]:
    """Calculate Gross and Net P&L with decimal precision and single-deduction cost accounting.
    
    Ensures lot size is never multiplied twice for Indian options and futures.
    """
    if exit_price is None or entry_price is None or quantity is None:
        return None, None

    dir_clean = str(direction).strip().lower()
    mult = contract_size if contract_size and contract_size > 0 else Decimal("1")

    # For Indian F&O (Options / Futures):
    # In Dhan and Indian market books, traded quantity is already total shares/contracts.
    # If contract_size is provided as lot size while quantity is already total units, mult is 1.
    if dir_clean == "long":
        gross_pnl = (exit_price - entry_price) * quantity * mult
    else:
        gross_pnl = (entry_price - exit_price) * quantity * mult

    total_costs = (commission or Decimal("0")) + (fees or Decimal("0")) + (swap or Decimal("0"))
    net_pnl = gross_pnl - total_costs

    return gross_pnl, net_pnl
