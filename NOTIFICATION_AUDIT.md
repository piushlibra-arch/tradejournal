# Notification System Audit & Repair Plan

**Date:** October 25, 2026  
**Auditor:** Senior Full-Stack Engineer  
**Component:** `Notification Center` (Frontend TopBar + Backend API + PostgreSQL)

---

## 1. Problem Statement

The user-facing notification bell in the application header (`frontend/components/layout/topbar.tsx`) displays a static bell icon with a hardcoded unread indicator dot (`<span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />`). Clicking the button does nothing. No notification list renders, no background events generate alerts, and no notification API endpoints exist.

---

## 2. Root Cause Analysis

A full trace through the repository revealed the root causes:

1. **Frontend**:
   - `TopBar.tsx` rendered an interactive `<button>` with no `onClick` handler, no dropdown menu state (`showNotifications`), and no API hook.
   - There was no notification API client in `frontend/lib/api/`.

2. **Backend**:
   - No `Notification` SQLAlchemy model existed in `backend/app/models/`.
   - No notification schema (Pydantic) existed in `backend/app/schemas/`.
   - No notification endpoints existed in `backend/app/api/v1/router.py`.

3. **Database**:
   - No `notifications` table was defined or migrated in PostgreSQL.

---

## 3. Architecture & Data Model

### 3.1 PostgreSQL Schema (`notifications`)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(500) NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_notifications_user_id_created ON notifications(user_id, created_at DESC);
CREATE INDEX ix_notifications_user_id_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

### 3.2 REST Endpoints (`/api/v1/notifications`)
- `GET /notifications`: Fetch paginated notifications with `unread_count`.
- `PATCH /notifications/{id}/read`: Mark an individual notification as read.
- `POST /notifications/read-all`: Mark all notifications as read for current user.
- `DELETE /notifications/{id}`: Delete an individual notification.

### 3.3 Event Triggers
- **Broker Sync**: "Dhan sync completed: 8 executions imported."
- **Sync Failure**: "Dhan sync failed: token expired."
- **Risk Rule Breach**: "Daily loss limit approaching 80%."
- **Replay / Import**: "CSV import processed 45 trades."

---

## 4. Frontend Experience
- Interactive dropdown anchored to the bell icon in `TopBar`.
- Real-time unread badge counter (e.g. `3`).
- Notification item cards displaying icon by type, relative timestamp, title, message, and "Mark as Read" action.
- "Mark all as read" button in the dropdown header.
- Empty state: "No new notifications. You're all caught up!"
