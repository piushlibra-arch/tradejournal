# MyTradeJournal — Comprehensive Project & Architectural Audit

**Date:** October 25, 2026  
**Auditor:** Senior Fintech Software Architect & DevSecOps Reviewer  
**Repository:** `MyTradeJournal` (`https://github.com/piushlibra-arch/tradejournal.git`)  
**Deployment Target:** Render (Web Service: FastAPI, Static/Node Web Service: Next.js 16, Managed PostgreSQL)

---

## 1. Executive Summary

A comprehensive architectural and code audit of the **MyTradeJournal** codebase was performed to evaluate stability, security, broker integration readiness, chart layout rendering, notification infrastructure, and deployment safety.

The application has a modern, modular architecture:
- **Frontend**: Next.js 16.4.3 (Turbopack, App Router), React 19.3.0, Tailwind CSS v4, Lucide icons, Lightweight Charts 5.2.1.
- **Backend**: FastAPI 0.115+, Python 3.11+, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic migrations, Pydantic v2.
- **Database**: PostgreSQL 16 with UUID primary keys, transactional rollbacks, and composite index coverage.
- **Deployment**: Render Blueprint (`render.yaml`) orchestrating managed PostgreSQL, FastAPI backend with automated migration execution, and Next.js frontend.

---

## 2. Component-by-Component Findings

### 2.1 Trading Replay & Chart Layout
- **Initial Defect**: The TradingView chart rendered as a collapsed horizontal strip (~150-180px tall) with squished candles and blank canvas space.
- **Root Cause Verified**:
  1. `embed-widget-advanced-chart.js` was passed `"autosize": true` without explicit percentage height inheritance on `.tradingview-widget-container` and its inner `.tradingview-widget-container__widget`, causing the iframe to size against unconstrained flex layout.
  2. The widget loaded `STD;RSI` and `STD;MACD` by default, splitting the limited height into two separate sub-panes and compressing the candlestick bodies.
  3. `LightweightCandlestickChart` received candle times formatted as ISO strings (`"2024-10-24 09:30:00"`). Lightweight Charts v5 strictly requires integer Unix timestamps in seconds (`Nominal<number, "UTCTimestamp">`), causing candlestick data rejection and a flat price line.
- **Current Status**: Repaired in `frontend/components/replay/tradingview-advanced-chart.tsx` and `lightweight-candlestick-chart.tsx`. Verified in Google Chrome Headless with full 760px responsive container, SMA overlay, and real volume histogram bars.

### 2.2 Notification System
- **Defect Identified**: The bell icon in `frontend/components/layout/topbar.tsx` was a static, non-functional button with a hardcoded unread dot. No dropdown, notification state, or backend API existed.
- **Root Cause Verified**:
  1. Backend has **no Notification model** in `backend/app/models/`.
  2. Backend has **no `/api/v1/notifications` router** in `backend/app/api/v1/router.py`.
  3. Frontend has no notification client, store, or dropdown list component.
- **Remediation Plan**: Full repair in Milestone 1: Create `Notification` SQLAlchemy model, Alembic migration, CRUD service, API endpoints (`GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`), and interactive frontend dropdown with unread badge counter.

### 2.3 Dhan & Multi-Broker Readiness
- **Current State**: The database contains `TradingAccount` with `broker_name` and `Execution` with `external_id`, but has no direct API sync mechanism.
- **DhanHQ API v2 Evaluation**:
  - Endpoint: `https://api.dhan.co/v2/trades` (official trade book).
  - Authentication: Requires `client-id` and `access-token` headers.
  - Read-Only Scope: Trade history synchronization does not require order placement permissions.
  - Security Requirement: Dhan credentials must be stored encrypted (AES-256-GCM / Fernet) or via environment variables, never plain-text, never exposed in browser JavaScript or logs.
- **Remediation Plan**: Milestone 2 will implement `BaseBrokerAdapter`, `DhanBrokerAdapter`, broker credential encryption, and duplicate-safe execution reconciliation (`POST /api/v1/brokers/dhan/sync`).

### 2.4 Market Data Pipeline
- **Current State**: `backend/app/api/v1/market_data.py` provides `GET /instruments` and `GET /candles`.
- **Capability**: Currently fetches live crypto klines via Binance public API and generates high-fidelity market ticks for equities, futures, and commodities.
- **Remediation Plan**: Milestone 3 will establish a WebSocket streaming endpoint (`/api/v1/market-data/ws`) to deliver live tick updates, candle aggregation, and stale-data indicators.

---

## 3. Database Schema Integrity & Migration Strategy

Existing tables verified:
- `users`: User authentication, hashed passwords.
- `trading_accounts`: Accounts isolated per user.
- `trades`: Journal trades with net P&L, fees, contract size, psychology tags.
- `executions`: Raw partial fills associated with trades.
- `tags` / `trade_tags`: Custom tagging taxonomy.
- `strategies`: Strategy attribution.
- `import_jobs` / `import_row_errors`: CSV batch imports.
- `daily_journal_entries`: Calendar & daily logupsert.
- `risk_rules`: Account risk management limits.

New tables required:
1. `notifications`: Persistent user notifications (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `data`, `created_at`).
2. `broker_connections`: Encrypted broker credentials and sync tracking (`id`, `user_id`, `broker_id`, `account_id`, `client_id`, `encrypted_access_token`, `last_sync_at`, `sync_status`).

---

## 4. Test Baseline & Build Health

- **Backend Pytest**: `12 passed in 0.09s` ([`test_market_data.py`](file:///Users/pisu/Desktop/tradejournal/backend/tests/test_market_data.py), [`test_config_security.py`](file:///Users/pisu/Desktop/tradejournal/backend/tests/test_config_security.py)).
- **Frontend Build**: Next.js 16.4.3 compiled in `523ms` across all 23 routes without TypeScript errors.
- **Linting**: 0 ESLint errors.
