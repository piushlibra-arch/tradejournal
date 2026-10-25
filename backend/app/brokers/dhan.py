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


class DhanBrokerAdapter(BaseBrokerAdapter):
    """Official DhanHQ API v2 Broker Adapter (Read-Only Trade Sync & Account Discovery)."""

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
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(url, headers=self._headers())

                if res.status_code == 401 or res.status_code == 403:
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

    async def fetch_executions(
        self,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> List[BrokerExecution]:
        """Fetch executed trade book from official /trades endpoint."""
        url = f"{self.BASE_URL}/trades"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers=self._headers())

                if res.status_code == 401 or res.status_code == 403:
                    raise UnauthorizedError("Dhan authentication failed: Token expired")

                if res.status_code != 200:
                    raise BadRequestError(f"Dhan trades API returned error: HTTP {res.status_code}")

                raw_trades = res.json()
                if not isinstance(raw_trades, list):
                    return []

                executions: List[BrokerExecution] = []
                for item in raw_trades:
                    # Unique stable broker execution identifier
                    trade_id = str(item.get("exchangeTradeId") or item.get("orderId") or "")
                    if not trade_id:
                        continue

                    # Parse execution time
                    create_time_str = item.get("createTime") or item.get("exchangeTime") or ""
                    try:
                        executed_at = datetime.fromisoformat(create_time_str)
                    except Exception:
                        executed_at = datetime.now(timezone.utc)

                    trans_type = str(item.get("transactionType", "BUY")).lower()
                    side = "buy" if "buy" in trans_type else "sell"
                    qty = Decimal(str(item.get("tradedQuantity", item.get("quantity", 1))))
                    price = Decimal(str(item.get("tradedPrice", item.get("price", 0))))

                    symbol = str(item.get("tradingSymbol") or item.get("customSymbol") or "DHAN_ASSET")
                    segment = str(item.get("exchangeSegment", "NSE_EQ"))

                    executions.append(
                        BrokerExecution(
                            external_id=f"dhan_{trade_id}",
                            order_id=str(item.get("orderId", "")),
                            symbol=symbol,
                            side=side,
                            quantity=qty,
                            price=price,
                            commission=Decimal("0"),
                            fees=Decimal("0"),
                            executed_at=executed_at,
                            exchange=segment.split("_")[0] if "_" in segment else "NSE",
                            segment=segment,
                            raw_data=item,
                        )
                    )

                return executions
        except httpx.RequestError as e:
            raise BadRequestError(f"Network error querying Dhan trades: {str(e)}")

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
