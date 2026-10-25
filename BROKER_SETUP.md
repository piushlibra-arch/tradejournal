# Multi-Broker Architecture & Provider Integration Guide

MyTradeJournal utilizes a provider-independent, typed adapter pattern designed to support multiple broker providers without modifying core journal or calculation logic.

---

## 1. Architecture Overview

```
                                  ┌────────────────────────┐
                                  │   MyTradeJournal Core  │
                                  │  (Trades & Executions) │
                                  └───────────┬────────────┘
                                              │
                                  ┌───────────▼────────────┐
                                  │   BrokerSyncService    │
                                  │ (Deduplication Engine) │
                                  └───────────┬────────────┘
                                              │
                                  ┌───────────▼────────────┐
                                  │     BrokerRegistry     │
                                  │   (Factory Registry)   │
                                  └───────────┬────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
        ┌───────────▼────────────┐┌───────────▼────────────┐┌───────────▼────────────┐
        │    DhanBrokerAdapter   ││       MT5 Gateway      ││  Future Broker Adapters│
        │   (DhanHQ API v2)      ││   (Dedicated Daemon)   ││    (Zerodha, IBKR)     │
        └────────────────────────┘└────────────────────────┘└────────────────────────┘
```

---

## 2. Adapter Contract (`BaseBrokerAdapter`)

Every broker provider implements the abstract base class located at [`backend/app/brokers/base.py`](file:///Users/pisu/Desktop/tradejournal/backend/app/brokers/base.py):

```python
class BaseBrokerAdapter(ABC):
    @abstractmethod
    async def test_connection(self) -> BrokerAccountSummary:
        """Verify API keys and return account cash balance & status."""
        pass

    @abstractmethod
    async def fetch_executions(
        self, from_date: Optional[datetime] = None, to_date: Optional[datetime] = None
    ) -> List[BrokerExecution]:
        """Fetch raw executed orders with exchange IDs."""
        pass

    @abstractmethod
    async def fetch_positions(self) -> List[BrokerPosition]:
        """Fetch current open market positions."""
        pass
```

---

## 3. Supported Broker Providers

### 3.1 Dhan (`dhan`) — **Active & Production Ready**
- Official API: DhanHQ API v2 (`https://api.dhan.co/v2`).
- Capabilities: Live trade book sync, cash balance discovery, position monitoring.
- Implementation: [`backend/app/brokers/dhan.py`](file:///Users/pisu/Desktop/tradejournal/backend/app/brokers/dhan.py).

### 3.2 MetaTrader 5 (`mt5`) — **Planned Gateway Architecture**
- **Hosting Challenge**: The MetaTrader 5 Python SDK (`MetaTrader5`) requires a running, interactive Windows `terminal64.exe` or Linux Wine desktop process. Standard containerized server environments (such as Render or Linux Alpine web services) cannot run the MT5 Windows terminal directly in the same web process.
- **Recommended Gateway Architecture**:
  1. A lightweight Windows VPS or Docker container with Wine runs the official MetaTrader 5 desktop client logged into your broker account.
  2. A local Python daemon runs alongside the terminal, querying `mt5.history_deals_get()` every 60 seconds.
  3. The daemon securely posts raw deal objects to MyTradeJournal's private webhook endpoint (`/api/v1/brokers/mt5/webhook`) authenticated via an HMAC signature.
  4. MyTradeJournal reconciles MT5 deal tickets into trades idempotently.

---

## 4. Security & Credential Storage

1. **Zero Plaintext Tokens**: All broker credentials (access tokens, gateway keys) are encrypted using AES-256 (Fernet) via [`backend/app/core/encryption.py`](file:///Users/pisu/Desktop/tradejournal/backend/app/core/encryption.py) before writing to the `broker_connections` PostgreSQL table.
2. **Key Derivation**: The encryption key is derived securely via SHA-256 from the server's master JWT secret key.
3. **Frontend Isolation**: The frontend client never receives or stores raw access tokens in browser memory.
