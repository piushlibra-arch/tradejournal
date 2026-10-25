# Master Implementation Plan — MyTradeJournal

**Date:** October 25, 2026  
**Scope:** Multi-Milestone Architecture Overhaul

---

## Milestone 1: Defect Repair & Notification Center
- [x] Repair TradingView chart layout, vertical squishing, and responsive sizing.
- [x] Fix Lightweight Charts integer Unix timestamp candlestick rendering.
- [ ] Create `Notification` SQLAlchemy model in `backend/app/models/notification.py`.
- [ ] Create `NotificationService`, Pydantic schemas, and endpoints (`GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`).
- [ ] Register notification router in `backend/app/api/v1/router.py`.
- [ ] Add unit and API tests in `backend/tests/test_notifications.py`.
- [ ] Implement interactive notification dropdown and unread badge in `frontend/components/layout/topbar.tsx`.
- [ ] Create frontend notification API client in `frontend/lib/api/notifications.ts`.

---

## Milestone 2: Personal Dhan Account Integration & Multi-Broker Engine
- [ ] Research and establish DhanHQ API v2 client contracts:
  - Base URL: `https://api.dhan.co/v2`
  - Headers: `client-id`, `access-token`
  - Trade Book Endpoint: `GET /trades`
  - Orders Endpoint: `GET /orders`
  - Fund Limit Endpoint: `GET /fundlimit`
- [ ] Design provider-independent broker architecture:
  - Base adapter interface: `backend/app/brokers/base.py` (`BaseBrokerAdapter`)
  - Dhan implementation: `backend/app/brokers/dhan.py` (`DhanBrokerAdapter`)
  - Provider Registry: `backend/app/brokers/registry.py` (`BrokerRegistry`)
- [ ] Create `BrokerConnection` SQLAlchemy model for secure, encrypted token persistence:
  - Token encryption utility using Fernet / AES-256 (`backend/app/core/encryption.py`).
  - No plain-text secrets in database or logs.
- [ ] Build execution-to-trade reconciliation logic (`backend/app/services/broker_sync_service.py`):
  - Ingestion of raw Dhan executions.
  - Aggregation of fills into journal trades using `external_id` (e.g. `dhan_{exchangeTradeId}`).
  - Duplicate-safe idempotent upsert logic (repeated syncs produce zero duplicates).
  - Automated trigger of user notification upon sync completion.
- [ ] Add backend endpoints:
  - `POST /api/v1/brokers/dhan/connect` (test connection and store credentials safely)
  - `POST /api/v1/brokers/dhan/sync` (trigger manual sync)
  - `GET /api/v1/brokers/dhan/status` (inspect connection health & last sync timestamp)
- [ ] Build Frontend Dhan Sync Panel in Settings / Accounts page:
  - "Connect Dhan Account" modal with Client ID & Access Token inputs.
  - "Sync Dhan Trades" button with real-time feedback toast and sync summary.

---

## Milestone 3: Live Market-Data Pipeline
- [ ] Establish WebSocket / streaming server in FastAPI (`/api/v1/market-data/ws`).
- [ ] Connect client to genuine market-data ticks and OHLC aggregation.
- [ ] Provide stale-data detection and clear connection status indicator (Connected, Reconnecting, Offline).

---

## Milestone 4: TradingView-Style Interactive Workspace
- [ ] Add indicator toggle menu (SMA, EMA, RSI with separate oscillator subpane or overlay, Volume).
- [ ] Add Instrument Watchlist panel on the chart terminal displaying live bid/ask, last price, and update timestamps.
- [ ] Add Journal Trade Overlays: clicking a trade highlights its historical entry/exit markers, stop loss, and take profit directly on the chart canvas.
- [ ] Full responsiveness across desktop, tablet, and mobile.

---

## Milestone 5: Multi-Broker Expansion & Documentation
- [ ] Create `DHAN_SETUP.md` with step-by-step instructions to obtain Dhan Client ID & Access Token from web.dhan.co.
- [ ] Create `BROKER_SETUP.md` documenting the multi-broker adapter specification.
- [ ] Detail the MetaTrader 5 (MT5) gateway architecture (Windows/Linux Wine terminal daemon worker with secure gRPC/REST bridge).
- [ ] Create `NOTIFICATION_SETUP.md`.
- [ ] Update `DEPLOYMENT_SAFETY_CHECKLIST.md`.
