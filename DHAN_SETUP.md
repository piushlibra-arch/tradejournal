# DhanHQ API v2 Integration Guide — MyTradeJournal

This guide details how to connect your personal **Dhan** account to MyTradeJournal for automated, read-only trade history synchronization.

---

## 1. Prerequisites & Official Dhan API Access

- A live personal trading account with **Dhan** ([https://dhan.co](https://dhan.co)).
- Access to the Dhan web portal at [https://web.dhan.co](https://web.dhan.co).
- **Cost**: **100% Free**. Dhan provides the DhanHQ Trading APIs free of cost to individual account holders for trade book and order discovery. No paid market-data subscription is required.

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

- **Endpoint Used**: Official DhanHQ v2 Trade Book (`GET https://api.dhan.co/v2/trades`).
- **Duplicate Prevention**: Every execution has an `exchangeTradeId`. MyTradeJournal records this as `dhan_{exchangeTradeId}` in the `executions` table. On every sync, any execution already present in the database is automatically skipped.
- **Trade Reconciliation**: New executions are automatically linked to a journal trade with the correct symbol, asset class, direction (BUY/SELL), executed price, and timestamp.
- **Calendar & Journal Sync**: Synced trades immediately appear on your **Calendar** and **Daily Journal** views.
- **Security**: The access token is encrypted in the database using AES-256 (Fernet) derived from the server's master key. It is never logged or exposed in browser JavaScript.
