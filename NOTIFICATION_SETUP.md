# Notification Center Setup & Architecture — MyTradeJournal

This document describes the design, database persistence, event triggers, and frontend integration for the MyTradeJournal Notification Center.

---

## 1. Overview

The notification system provides user-scoped alerts for key trading and synchronization events:
- Broker sync completed (e.g. Dhan trade imports).
- Broker authentication failures or token expirations.
- Risk management rule warnings and daily drawdown alerts.
- CSV import batch completions.

---

## 2. Architecture & Data Flow

```
[Background / Sync Event] ──► NotificationService.create_notification(...)
                                           │
                                           ▼
                                 [PostgreSQL: notifications]
                                           │
                                           ▼
[FastAPI: GET /notifications] ◄── [Polling / SWR in TopBar (30s)]
                                           │
                                           ▼
                             [Interactive Dropdown UI & Badge]
```

---

## 3. Database Model (`notifications`)

Defined in [`backend/app/models/notification.py`](file:///Users/pisu/Desktop/tradejournal/backend/app/models/notification.py):

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key |
| `user_id` | `UUID` | Foreign key referencing `users.id` (CASCADE) |
| `title` | `VARCHAR(200)` | Brief alert headline (e.g. "DHAN Sync Complete") |
| `message` | `TEXT` | Detailed description of the event |
| `type` | `VARCHAR(50)` | `"info"`, `"success"`, `"warning"`, `"error"` |
| `is_read` | `BOOLEAN` | Read status (default `false`) |
| `action_url` | `VARCHAR(500)` | Optional deep link (e.g. `"/journal"`, `"/accounts"`) |
| `extra_data` | `JSONB` | Optional metadata payload |
| `created_at` | `TIMESTAMP` | Event timestamp (UTC) |

---

## 4. REST API Endpoints

- `GET /api/v1/notifications`: Returns paginated notifications and real-time `unread_count`.
- `PATCH /api/v1/notifications/{id}/read`: Marks a single notification as read.
- `POST /api/v1/notifications/read-all`: Marks all notifications as read for the user.
- `DELETE /api/v1/notifications/{id}`: Deletes a specific notification.

---

## 5. Frontend TopBar Component

Implemented in [`frontend/components/layout/topbar.tsx`](file:///Users/pisu/Desktop/tradejournal/frontend/components/layout/topbar.tsx):
- **Unread Badge**: Red counter badge showing `1-9` or `9+` unread notifications.
- **Dropdown List**: Displays status icon (check, alert, info), title, relative timestamp ("2m ago"), message, and action link.
- **Mark All Read**: Instant single-click action to clear unread counts.
- **Auto-Refresh**: Polls `/api/v1/notifications` every 30 seconds for non-intrusive updates.
