# DhanHQ API v2 Integration Guide — MyTradeJournal

This guide details how to connect your personal **Dhan** account to MyTradeJournal for automated, read-only trade history synchronization, itemized regulatory charge tracking, and ledger reconciliation.

---

## 1. Prerequisites & Official Dhan API Access

- A live personal trading account with **Dhan** ([https://dhan.co](https://dhan.co)).
- Access to the Dhan web portal at [https://web.dhan.co](https://web.dhan.co).
- **Cost**: **100% Free**. Dhan provides the DhanHQ Trading APIs free of cost to individual account holders for trade book and order discovery. No paid market-data subscription is required.
- **Exchanges & Segments**: NSE & BSE Equity, Futures, and Options (F&O).

---

## 2. Generating Your Dhan API Credentials

1. Log into your Dhan account at [https://web.dhan.co](https://web.dhan.co).
2. Click your profile icon in the top right corner and navigate to **My Profile on Dhan**.
3. In the left navigation menu, select **DhanHQ Trading APIs**.
4. Locate your **Client ID** (a 10-digit numeric ID, e.g., `1000000001`). Copy this value.
5. Under **Access Token**, click **Generate Token**.
6. Set the token validity (Dhan allows up to **30 days** of validity).
7. Copy the generated JWT token string.

> [!IMPORTANT]
> Dhan access tokens expire every 30 days per Indian regulatory guidelines. When a token expires, simply generate a new token on web.dhan.co and reconnect your account in MyTradeJournal.

---

## 3. Connecting to MyTradeJournal

1. Open MyTradeJournal and navigate to **Trading Accounts** (`/accounts`).
2. Locate the **DhanHQ API v2 Integration** card at the top.
3. Click **Connect Dhan Account**.
4. Enter your:
   - **Dhan Client ID**
   - **Dhan Access Token**
5. Click **Save & Connect**.
6. MyTradeJournal immediately verifies the credentials against Dhan's official `/fundlimit` endpoint. Upon success, your available cash balance is displayed and a confirmation notification is dispatched.

---

## 4. How Synchronization Works

### A. Historical Trade Book Synchronization with Pagination
- **Endpoints Used**:
  - Date-Range History: `GET https://api.dhan.co/v2/trades/{from-date}/{to-date}/{page}`
  - Current Day Session: `GET https://api.dhan.co/v2/trades`
- **Pagination**: Loops starting at page 0 until all trades within the date range are imported.
- **Duplicate Prevention**: Every execution has an `exchangeTradeId`. MyTradeJournal records this as `dhan_{exchangeTradeId}` in the `executions` table with an external ID index. On every sync, any execution already present in the database is automatically skipped.

### B. Position Matching & Lifecycle
- Executions are ordered chronologically.
- When an execution matches an existing open position for the same symbol & account with the opposite direction (e.g. SELL closing a BUY):
  - The trade is automatically marked `closed`.
  - Weighted average exit price is assigned.
  - **Gross P&L** is calculated:
    - Long: `(exit_price - entry_price) * quantity * contract_size`
    - Short: `(entry_price - exit_price) * quantity * contract_size`
  - All regulatory charges from both opening and closing executions are summed.
  - **Net P&L** is calculated via a single verified deduction: `net_pnl = gross_pnl - total_charges`.

### C. Itemized Regulatory Charge Import
Every trade and execution records an itemized charge breakdown:
- **Brokerage**: Broker charges reported by Dhan
- **STT / CTT**: Securities Transaction Tax
- **Exchange Turnover**: NSE / BSE transaction fees
- **GST**: Goods & Services Tax (18% on Brokerage + Turnover)
- **Stamp Duty**: State stamp duty
- **SEBI Turnover**: SEBI regulatory fee
- **Provenance Tracking**: Tagged as `broker_reported` when reported by Dhan API.

### D. Account Ledger Reconciliation
- **Endpoint Used**: `GET https://api.dhan.co/v2/ledger?from-date={YYYY-MM-DD}&to-date={YYYY-MM-DD}`
- Imports voucher dates, narrations, voucher numbers, exchanges, debits, credits, and running balances into `broker_ledger_entries`.
- Allows traders to cross-verify cash deposits, withdrawals, settlement debits, and trade fees against broker ledger records.

---

## 5. Security & Zero Exposure Guarantee

- **AES-256 Backend Encryption**: Tokens are encrypted using Fernet AES-256 before being persisted in PostgreSQL.
- **Zero Token Leakage**: Tokens are never logged, never returned in frontend API responses, and never stored in browser cookies or local storage.
- **Read-Only Operation**: MyTradeJournal will NEVER place, modify, or cancel orders on your broker account.
