from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
import httpx

from app.brokers.base import (
    BaseBrokerAdapter,
    BrokerAccountSummary,
    BrokerExecution,
    BrokerPosition,
)
from app.core.exceptions import BadRequestError, UnauthorizedError


from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
import httpx

from app.brokers.base import (
    BaseBrokerAdapter,
    BrokerAccountSummary,
    BrokerExecution,
    BrokerLedgerEntryItem,
    BrokerPosition,
)
from app.core.exceptions import BadRequestError, UnauthorizedError


class DhanBrokerAdapter(BaseBrokerAdapter):
    """Official DhanHQ API v2 Broker Adapter (Read-Only Trade Sync, Ledger & Account Discovery)."""

    BASE_URL = "https://api.dhan.co/v2"

    def _headers(self) -> Dict[str, str]:
        return {
            "client-id": self.client_id,
            "access-token": self.access_token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def test_connection(self) -> BrokerAccountSummary:
        """Validate credentials against /fundlimit and retrieve account balance."""
        url = f"{self.BASE_URL}/fundlimit"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers=self._headers())

                if res.status_code in (401, 403):
                    raise UnauthorizedError("Invalid or expired Dhan Client ID / Access Token")

                if res.status_code != 200:
                    raise BadRequestError(f"Dhan API returned error: HTTP {res.status_code}")

                data = res.json()
                avail_cash = Decimal(str(data.get("availabelBalance", data.get("availableBalance", 0.0))))
                utilized = Decimal(str(data.get("utilizedAmount", 0.0)))

                return BrokerAccountSummary(
                    broker_id="dhan",
                    client_id=self.client_id,
                    available_cash=avail_cash,
                    margin_used=utilized,
                    status="connected",
                    raw_profile=data,
                )
        except httpx.RequestError as e:
            raise BadRequestError(f"Failed to connect to DhanHQ API: {str(e)}")

    def _parse_execution_item(self, item: Dict[str, Any]) -> Optional[BrokerExecution]:
        trade_id = str(item.get("exchangeTradeId") or item.get("orderId") or "")
        if not trade_id:
            return None

        # Parse execution timestamp
        create_time_str = item.get("createTime") or item.get("exchangeTime") or ""
        try:
            executed_at = datetime.fromisoformat(create_time_str.replace("Z", "+00:00"))
        except Exception:
            executed_at = datetime.now(timezone.utc)

        trans_type = str(item.get("transactionType", "BUY")).lower()
        side = "buy" if "buy" in trans_type else "sell"
        qty = Decimal(str(item.get("tradedQuantity", item.get("quantity", 1))))
        price = Decimal(str(item.get("tradedPrice", item.get("price", 0))))

        symbol = str(item.get("tradingSymbol") or item.get("customSymbol") or "DHAN_ASSET")
        segment = str(item.get("exchangeSegment", "NSE_EQ"))
        product_type = str(item.get("productType", ""))
        security_id = str(item.get("securityId", ""))

        # Itemized charges extraction
        brokerage = Decimal(str(item.get("brokerageCharges", item.get("brokerage", 0)) or 0))
        stt = Decimal(str(item.get("stt", 0) or 0))
        exchange_turnover = Decimal(str(item.get("exchangeTransactionCharges", 0) or 0))
        sebi_turnover = Decimal(str(item.get("sebiTax", 0) or 0))
        stamp_duty = Decimal(str(item.get("stampDuty", 0) or 0))
        gst = Decimal(str(item.get("serviceTax", 0) or 0))
        total_charges = brokerage + stt + exchange_turnover + sebi_turnover + stamp_duty + gst

        has_charge_data = any(
            k in item
            for k in (
                "brokerageCharges",
                "brokerage",
                "stt",
                "sebiTax",
                "exchangeTransactionCharges",
                "stampDuty",
                "serviceTax",
            )
        )
        provenance = "broker_reported" if has_charge_data else "unavailable"

        return BrokerExecution(
            external_id=f"dhan_{trade_id}",
            order_id=str(item.get("orderId", "")),
            exchange_order_id=str(item.get("exchangeOrderId", "")),
            symbol=symbol,
            side=side,
            quantity=qty,
            price=price,
            brokerage=brokerage,
            stt=stt,
            exchange_turnover=exchange_turnover,
            sebi_turnover=sebi_turnover,
            stamp_duty=stamp_duty,
            gst=gst,
            other_charges=Decimal("0"),
            total_charges=total_charges,
            charge_provenance=provenance,
            commission=brokerage,
            fees=total_charges - brokerage,
            executed_at=executed_at,
            exchange=segment.split("_")[0] if "_" in segment else "NSE",
            segment=segment,
            product_type=product_type,
            security_id=security_id,
            raw_data=item,
        )

    async def fetch_executions(
        self,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> List[BrokerExecution]:
        """Fetch executed trade book from official /trades endpoints.
        
        If from_date and to_date are supplied, uses the paginated historical endpoint:
        GET /trades/{from-date}/{to-date}/{page}
        Otherwise, falls back to the current trading-day endpoint:
        GET /trades
        """
        raw_items: List[Dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                if from_date and to_date:
                    from_str = from_date.strftime("%Y-%m-%d")
                    to_str = to_date.strftime("%Y-%m-%d")
                    page = 0
                    max_pages = 50  # Safeguard against unexpected infinite loops

                    while page < max_pages:
                        page_url = f"{self.BASE_URL}/trades/{from_str}/{to_str}/{page}"
                        res = await client.get(page_url, headers=self._headers())

                        if res.status_code in (401, 403):
                            raise UnauthorizedError("Dhan authentication failed: Token expired")

                        if res.status_code == 404:
                            break

                        if res.status_code != 200:
                            raise BadRequestError(f"Dhan trades API returned error: HTTP {res.status_code}")

                        page_data = res.json()
                        if isinstance(page_data, dict):
                            page_items = page_data.get("data", page_data.get("trades", []))
                        elif isinstance(page_data, list):
                            page_items = page_data
                        else:
                            break

                        if not page_items:
                            break

                        raw_items.extend(page_items)

                        # Standard page size is 50/100; if fewer items returned, this is the final page
                        if len(page_items) < 50:
                            break

                        page += 1
                else:
                    url = f"{self.BASE_URL}/trades"
                    res = await client.get(url, headers=self._headers())

                    if res.status_code in (401, 403):
                        raise UnauthorizedError("Dhan authentication failed: Token expired")

                    if res.status_code != 200:
                        raise BadRequestError(f"Dhan trades API returned error: HTTP {res.status_code}")

                    data = res.json()
                    if isinstance(data, list):
                        raw_items = data
                    elif isinstance(data, dict):
                        raw_items = data.get("data", data.get("trades", []))

                executions: List[BrokerExecution] = []
                for item in raw_items:
                    parsed = self._parse_execution_item(item)
                    if parsed:
                        executions.append(parsed)

                return executions
        except httpx.RequestError as e:
            raise BadRequestError(f"Network error querying Dhan trades: {str(e)}")

    async def fetch_ledger(
        self,
        from_date: datetime,
        to_date: datetime,
    ) -> List[BrokerLedgerEntryItem]:
        """Fetch account ledger transactions from official GET /ledger endpoint."""
        from_str = from_date.strftime("%Y-%m-%d")
        to_str = to_date.strftime("%Y-%m-%d")
        url = f"{self.BASE_URL}/ledger"
        params = {"from-date": from_str, "to-date": to_str}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, headers=self._headers(), params=params)

                if res.status_code in (401, 403):
                    raise UnauthorizedError("Dhan authentication failed: Token expired")

                if res.status_code != 200:
                    raise BadRequestError(f"Dhan ledger API returned error: HTTP {res.status_code}")

                data = res.json()
                if isinstance(data, list):
                    raw_entries = data
                elif isinstance(data, dict):
                    raw_entries = data.get("data", data.get("ledger", []))
                else:
                    raw_entries = []

                entries: List[BrokerLedgerEntryItem] = []
                for item in raw_entries:
                    voucher_num = str(item.get("voucherNumber", item.get("voucherNo", ""))).strip()
                    narration = str(item.get("narration", item.get("particulars", ""))).strip()
                    date_str = item.get("voucherDate") or item.get("date") or ""

                    try:
                        voucher_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    except Exception:
                        voucher_date = datetime.now(timezone.utc)

                    debit = Decimal(str(item.get("debit", 0) or 0))
                    credit = Decimal(str(item.get("credit", 0) or 0))
                    running_bal = Decimal(str(item.get("runningbalance", item.get("runningBalance", 0)) or 0))
                    exchange = str(item.get("exchange", "NSE"))

                    # Deterministic external id
                    unique_seed = f"{voucher_num}_{voucher_date.strftime('%Y%m%d%H%M')}_{narration[:20]}_{debit}_{credit}"
                    external_id = f"dhan_ledger_{hash(unique_seed) & 0xffffffff:08x}"

                    entries.append(
                        BrokerLedgerEntryItem(
                            external_id=external_id,
                            voucher_date=voucher_date,
                            voucher_number=voucher_num if voucher_num else None,
                            narration=narration,
                            exchange=exchange,
                            debit=debit,
                            credit=credit,
                            running_balance=running_bal,
                            raw_data=item,
                        )
                    )

                return entries
        except httpx.RequestError as e:
            raise BadRequestError(f"Network error querying Dhan ledger: {str(e)}")

    async def fetch_positions(self) -> List[BrokerPosition]:
        """Fetch open positions from official /positions endpoint."""
        url = f"{self.BASE_URL}/positions"
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(url, headers=self._headers())
                if res.status_code != 200:
                    return []

                raw_positions = res.json()
                if not isinstance(raw_positions, list):
                    return []

                positions: List[BrokerPosition] = []
                for p in raw_positions:
                    net_qty = Decimal(str(p.get("netQty", 0)))
                    if net_qty == 0:
                        continue  # Closed intraday position

                    buy_avg = Decimal(str(p.get("buyAvg", p.get("costPrice", 0))))
                    unrealized = Decimal(str(p.get("unrealizedProfit", 0)))

                    positions.append(
                        BrokerPosition(
                            symbol=str(p.get("tradingSymbol", "UNKNOWN")),
                            quantity=net_qty,
                            entry_price=buy_avg,
                            unrealized_pnl=unrealized,
                            exchange=str(p.get("exchangeSegment", "NSE")),
                        )
                    )
                return positions
        except Exception:
            return []
