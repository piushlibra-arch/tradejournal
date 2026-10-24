import csv
import io
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from app.importers.base import (
    CANONICAL_FIELDS,
    COLUMN_ALIASES,
    normalize_direction,
    parse_datetime,
    sanitize_decimal,
)


class GenericCSVImporter:
    """Generic CSV Importer Adapter with delimiter detection, column auto-mapping, and row validation."""

    def detect_delimiter(self, content_sample: str) -> str:
        sniffer = csv.Sniffer()
        try:
            dialect = sniffer.sniff(content_sample, delimiters=",\t;|")
            return dialect.delimiter
        except Exception:
            return ","

    def auto_map_columns(self, headers: List[str]) -> Dict[str, Optional[str]]:
        """Map canonical field names to detected CSV column names."""
        mapping: Dict[str, Optional[str]] = {}
        normalized_headers = {re_clean(h): h for h in headers}

        for canonical_field, aliases in COLUMN_ALIASES.items():
            matched_header = None
            for alias in aliases:
                clean_alias = re_clean(alias)
                if clean_alias in normalized_headers:
                    matched_header = normalized_headers[clean_alias]
                    break
            mapping[canonical_field] = matched_header

        return mapping

    def parse_preview(self, csv_content: str, max_rows: int = 10) -> Dict[str, Any]:
        """Reads CSV content and returns headers, sample preview rows, and suggested mappings."""
        delimiter = self.detect_delimiter(csv_content[:2048])
        reader = csv.reader(io.StringIO(csv_content), delimiter=delimiter)

        headers: List[str] = []
        rows: List[List[str]] = []
        for i, row in enumerate(reader):
            if not row or all(c.strip() == "" for c in row):
                continue
            if not headers:
                headers = [col.strip() for col in row]
            else:
                rows.append([col.strip() for col in row])
                if len(rows) >= max_rows:
                    break

        suggested_mapping = self.auto_map_columns(headers)
        return {
            "delimiter": delimiter,
            "headers": headers,
            "sample_rows": rows,
            "suggested_mapping": suggested_mapping,
            "canonical_fields": CANONICAL_FIELDS,
        }

    def validate_and_parse_rows(
        self,
        csv_content: str,
        column_mapping: Dict[str, str],
        existing_external_ids: Optional[set] = None,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Parses full CSV content according to user-confirmed column mapping.
        Returns:
            - valid_trades: list of standardized trade dicts ready for insertion
            - duplicate_trades: rows whose external_id already exists in database
            - error_rows: malformed rows with row number and explicit validation error
        """
        existing_ids = existing_external_ids or set()
        delimiter = self.detect_delimiter(csv_content[:2048])
        reader = csv.DictReader(io.StringIO(csv_content), delimiter=delimiter)

        valid_trades: List[Dict[str, Any]] = []
        duplicate_trades: List[Dict[str, Any]] = []
        error_rows: List[Dict[str, Any]] = []

        # Reverse mapping: canonical_field -> header_in_csv
        # Invert to map: header_in_csv -> canonical_field
        for row_idx, raw_row in enumerate(reader, start=2):  # row 1 is header
            if not any(raw_row.values()):
                continue

            extracted: Dict[str, Any] = {}
            row_errors: List[str] = []

            # Extract fields based on mapping
            for canonical_key, mapped_header in column_mapping.items():
                if mapped_header and mapped_header in raw_row:
                    extracted[canonical_key] = raw_row[mapped_header]
                else:
                    extracted[canonical_key] = None

            # 1. Validate Symbol
            symbol = str(extracted.get("symbol") or "").strip().upper()
            if not symbol:
                row_errors.append("Missing required field: symbol")

            # 2. Validate Direction
            direction = normalize_direction(extracted.get("direction"))
            if not direction:
                row_errors.append(f"Invalid direction: '{extracted.get('direction')}'. Must be long/short/buy/sell")

            # 3. Validate Entry Time
            entry_time = parse_datetime(extracted.get("entry_time"))
            if not entry_time:
                row_errors.append(f"Invalid entry timestamp: '{extracted.get('entry_time')}'")

            # Exit Time (optional)
            exit_time = parse_datetime(extracted.get("exit_time"))

            # 4. Validate Entry Price
            entry_price = sanitize_decimal(extracted.get("entry_price"))
            if entry_price is None or entry_price <= Decimal("0"):
                row_errors.append(f"Invalid entry price: '{extracted.get('entry_price')}'. Must be > 0")

            # Exit Price (optional)
            exit_price = sanitize_decimal(extracted.get("exit_price"))

            # 5. Validate Quantity
            quantity = sanitize_decimal(extracted.get("quantity"))
            if quantity is None or quantity <= Decimal("0"):
                row_errors.append(f"Invalid quantity: '{extracted.get('quantity')}'. Must be > 0")

            # Contract size
            contract_size = sanitize_decimal(extracted.get("contract_size")) or Decimal("1")
            commission = sanitize_decimal(extracted.get("commission")) or Decimal("0")
            fees = sanitize_decimal(extracted.get("fees")) or Decimal("0")
            swap = sanitize_decimal(extracted.get("swap")) or Decimal("0")
            stop_loss = sanitize_decimal(extracted.get("stop_loss_price"))
            take_profit = sanitize_decimal(extracted.get("take_profit_price"))
            external_id = str(extracted.get("external_id") or "").strip() or None
            notes = str(extracted.get("notes") or "").strip() or None
            setup_name = str(extracted.get("setup_name") or "").strip() or None

            # Gross and Net PnL policy:
            # If broker provided net_pnl, use it, or calculate from prices
            gross_pnl = sanitize_decimal(extracted.get("gross_pnl"))
            net_pnl = sanitize_decimal(extracted.get("net_pnl"))

            if exit_price is not None and entry_price is not None and quantity is not None:
                if gross_pnl is None:
                    if direction == "long":
                        gross_pnl = (exit_price - entry_price) * quantity * contract_size
                    else:
                        gross_pnl = (entry_price - exit_price) * quantity * contract_size

                if net_pnl is None:
                    net_pnl = gross_pnl - commission - fees - swap

            if row_errors:
                error_rows.append(
                    {
                        "row_number": row_idx,
                        "raw_data": raw_row,
                        "error_message": "; ".join(row_errors),
                    }
                )
                continue

            # Duplicate check
            if external_id and external_id in existing_ids:
                duplicate_trades.append(
                    {
                        "row_number": row_idx,
                        "external_id": external_id,
                        "symbol": symbol,
                        "entry_time": entry_time.isoformat() if entry_time else None,
                    }
                )
                continue

            # Track external_id to prevent duplicates within the same CSV batch
            if external_id:
                existing_ids.add(external_id)

            trade_record = {
                "symbol": symbol,
                "direction": direction,
                "entry_time": entry_time,
                "exit_time": exit_time,
                "entry_price": entry_price,
                "exit_price": exit_price,
                "quantity": quantity,
                "contract_size": contract_size,
                "gross_pnl": gross_pnl,
                "commission": commission,
                "fees": fees,
                "swap": swap,
                "net_pnl": net_pnl,
                "stop_loss_price": stop_loss,
                "take_profit_price": take_profit,
                "setup_name": setup_name,
                "notes": notes,
                "external_id": external_id,
                "status": "closed" if exit_price is not None else "open",
                "import_source": "csv_import",
            }
            valid_trades.append(trade_record)

        return valid_trades, duplicate_trades, error_rows


def re_clean(s: str) -> str:
    """Normalize string for alias comparison: lowercase and only alphanumeric."""
    import re

    return re.sub(r"[^a-z0-9]", "", s.lower())


def generate_canonical_template_csv() -> str:
    """Generates an example canonical CSV template for download."""
    headers = [
        "symbol",
        "direction",
        "entry_time",
        "exit_time",
        "entry_price",
        "exit_price",
        "quantity",
        "contract_size",
        "commission",
        "fees",
        "net_pnl",
        "stop_loss_price",
        "take_profit_price",
        "setup_name",
        "notes",
        "external_id",
    ]
    rows = [
        [
            "AAPL",
            "long",
            "2024-03-01 14:30:00",
            "2024-03-01 15:45:00",
            "180.50",
            "182.25",
            "100",
            "1",
            "1.50",
            "0.50",
            "173.00",
            "179.00",
            "183.00",
            "15m Breakout",
            "Followed entry rule after volume surge",
            "TRAD-1001",
        ],
        [
            "NQ",
            "short",
            "2024-03-02 10:00:00",
            "2024-03-02 11:15:00",
            "18250.00",
            "18200.00",
            "2",
            "20",
            "8.00",
            "2.40",
            "1989.60",
            "18275.00",
            "18180.00",
            "FVG Liquidity Sweep",
            "Target hit at morning session low",
            "TRAD-1002",
        ],
        [
            "EURUSD",
            "long",
            "2024-03-03 08:30:00",
            "2024-03-03 12:00:00",
            "1.08500",
            "1.08900",
            "1.0",
            "100000",
            "4.00",
            "0.00",
            "396.00",
            "1.08300",
            "1.09000",
            "Asian Range Reversal",
            "Clean sweep of Asian Low at London open",
            "TRAD-1003",
        ],
    ]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(r)
    return output.getvalue()
