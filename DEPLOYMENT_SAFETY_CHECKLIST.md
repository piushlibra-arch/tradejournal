# Production Deployment Safety Checklist — MyTradeJournal

**Target Environment:** Render Cloud Platform  
**Services:** `mytradejournal-backend` (FastAPI), `mytradejournal-frontend` (Next.js 16), `mytradejournal-db` (PostgreSQL)

---

## Pre-Deployment Verification Protocol

- [ ] **No Secrets in Git**: Confirm `.env`, private tokens, Dhan access tokens, and JWT secret keys are not committed to Git.
- [ ] **Alembic Migration Verification**:
  - All new models (`notifications`, `broker_connections`) have dedicated migration scripts in `backend/migrations/versions/`.
  - Migrations are strictly additive: zero destructive `DROP COLUMN` or `DROP TABLE` operations on historical journal data.
  - Test migration head locally or against staging before production.
- [ ] **Database Integrity**:
  - `trades` and `executions` tables remain intact with preserved historical user records.
  - Foreign keys to `users.id` enforce cascade deletions cleanly without orphaned records.
- [ ] **Backward Compatibility**:
  - Existing trade logging (`POST /api/v1/trades`), calendar queries, and analytics dashboards continue functioning without breaking changes.
  - Dhan trade sync writes into the existing schema using stable `external_id` deduplication.
- [ ] **Render Service Settings**:
  - `RUN_MIGRATIONS_ON_START: "true"` runs `alembic upgrade head` safely on backend service startup.
  - Frontend build command: `npm install && npm run build` compiles with 0 TypeScript/ESLint errors.
- [ ] **Security Boundaries**:
  - Dhan API credentials stored encrypted in the database; never returned in client API responses.
  - Notification endpoints scoped strictly to `current_user.id`.
  - Market data WebSocket authenticated via JWT token.
