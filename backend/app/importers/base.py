import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

# List of Canonical Fields for MyTradeJournal
CANONICAL_FIELDS: Dict[str, Dict[str, Any]] = {
    "symbol": {"label": "Symbol / Ticker", "required": True, "type": "string"},
    "direction": {"label": "Direction (Long/Short)", "required": True, "type": "string"},
    "entry_time": {"label": "Entry Date & Time", "required": True, "type": "datetime"},
    "exit_time": {"label": "Exit Date & Time", "required": False, "type": "datetime"},
    "entry_price": {"label": "Entry Price", "required": True, "type": "decimal"},
    "exit_price": {"label": "Exit Price", "required": False, "type": "decimal"},
    "quantity": {"label": "Quantity / Size", "required": True, "type": "decimal"},
    "contract_size": {"label": "Contract Multiplier", "required": False, "type": "decimal", "default": Decimal("1")},
    "gross_pnl": {"label": "Gross Realized P&L", "required": False, "type": "decimal"},
    "net_pnl": {"label": "Net Realized P&L", "required": False, "type": "decimal"},
    "commission": {"label": "Commission", "required": False, "type": "decimal", "default": Decimal("0")},
    "fees": {"label": "Broker Fees", "required": False, "type": "decimal", "default": Decimal("0")},
    "swap": {"label": "Swap / Overnight Fees", "required": False, "type": "decimal", "default": Decimal("0")},
    "stop_loss_price": {"label": "Stop Loss Price", "required": False, "type": "decimal"},
    "take_profit_price": {"label": "Take Profit Price", "required": False, "type": "decimal"},
    "setup_name": {"label": "Strategy / Setup", "required": False, "type": "string"},
    "notes": {"label": "Trade Notes", "required": False, "type": "string"},
    "external_id": {"label": "Broker Trade ID", "required": False, "type": "string"},
}

# Common column aliases for smart auto-mapping
COLUMN_ALIASES: Dict[str, List[str]] = {
    "symbol": ["symbol", "ticker", "instrument", "contract", "asset", "sec_desc", "underlying"],
    "direction": ["direction", "side", "action", "type", "b/s", "buy/sell", "trans_type"],
    "entry_time": ["entry_time", "entry_date", "open_time", "date", "time", "date_time", "filled_at", "trans_date"],
    "exit_time": ["exit_time", "exit_date", "close_time", "closing_date", "closed_at"],
    "entry_price": ["entry_price", "open_price", "buy_price", "price", "avg_price", "fill_price", "exec_price"],
    "exit_price": ["exit_price", "close_price", "sell_price", "closing_price"],
    "quantity": ["quantity", "qty", "volume", "shares", "contracts", "size", "lots"],
    "contract_size": ["contract_size", "multiplier", "point_value"],
    "gross_pnl": ["gross_pnl", "gross_profit", "gross_p/l", "realized_gross"],
    "net_pnl": ["net_pnl", "net_profit", "net_p/l", "realized_pnl", "pnl", "profit", "p/l", "amount"],
    "commission": ["commission", "comm", "brokerage", "commissions"],
    "fees": ["fees", "fee", "reg_fee", "exchange_fee", "sec_fee"],
    "swap": ["swap", "financing", "interest"],
    "stop_loss_price": ["stop_loss", "sl", "stop_loss_price", "stop_price"],
    "take_profit_price": ["take_profit", "tp", "take_profit_price", "target_price"],
    "setup_name": ["setup", "strategy", "tag", "playbook"],
    "notes": ["notes", "comment", "memo", "description"],
    "external_id": ["external_id", "order_id", "trade_id", "ref_id", "ticket", "exec_id"],
}


def sanitize_decimal(raw_val: Any) -> Optional[Decimal]:
    """Parse string or float numbers into exact Decimal handling currencies, thousands separators, and parentheses."""
    if raw_val is None:
        return None
    val_str = str(raw_val).strip()
    if not val_str or val_str.lower() in ("nan", "none", "null", "-", "--", "n/a"):
        return None

    # Handle negative accounting parentheses like (125.50) -> -125.50
    is_negative = False
    if val_str.startswith("(") and val_str.endswith(")"):
        is_negative = True
        val_str = val_str[1:-1].strip()

    # Remove currency symbols and non-numeric chars except . , - +
    cleaned = re.sub(r"[^\d.,\-+]", "", val_str)
    if not cleaned:
        return None

    # Handle European vs US decimal formats:
    # 1,234.56 -> 1234.56
    # 1.234,56 -> 1234.56
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(".") > cleaned.rfind(","):
            # US standard: comma is thousands
            cleaned = cleaned.replace(",", "")
        else:
            # European: dot is thousands, comma is decimal
            cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned and "." not in cleaned:
        # Check if comma is decimal or thousands: "123,45" vs "1,000"
        parts = cleaned.split(",")
        if len(parts) == 2 and len(parts[1]) in (1, 2, 4, 8):
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")

    try:
        num = Decimal(cleaned)
        return -num if is_negative and num > 0 else num
    except Exception:
        return None


def parse_datetime(raw_val: Any, default_tz: str = "UTC") -> Optional[datetime]:
    """Robust timestamp parsing across common formats."""
    if not raw_val:
        return None
    val_str = str(raw_val).strip()
    if not val_str:
        return None

    formats_to_try = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d",
    ]

    for fmt in formats_to_try:
        try:
            dt = datetime.strptime(val_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue

    # Try ISO parsing directly
    try:
        dt = datetime.fromisoformat(val_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def normalize_direction(raw_val: Any) -> Optional[str]:
    """Normalizes side/direction to 'long' or 'short'."""
    if not raw_val:
        return None
    val = str(raw_val).strip().lower()
    if val in ("long", "buy", "b", "bot", "bought"):
        return "long"
    if val in ("short", "sell", "s", "sld", "sold", "ss"):
        return "short"
    return None
