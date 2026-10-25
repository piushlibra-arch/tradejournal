# MyTradeJournal — Environment Configuration & Secrets Management Guide

> **Audience:** Beginner to Intermediate Full-Stack Developers & DevOps  
> **Applicable Stack:** Next.js 16 + FastAPI + PostgreSQL 16 on Render  
> **Core Principle:** Never commit real secrets. Validate at startup. Separate public from private.

---

## 1. Environment Variables Explained from First Principles

### What is an Environment Variable?
An **environment variable** is a dynamic key-value pair provided by the operating system or hosting platform to a running program. Instead of writing credentials directly into your source code:

```python
# ❌ DANGEROUS: Hardcoded credentials committed to GitHub
JWT_SECRET_KEY = "my-secret-key-12345"
DATABASE_URL = "postgres://admin:RealPassword123@db.com:5432/tradejournal"
```

You read them from the environment at runtime:

```python
# ✅ SECURE: Loaded dynamically from the host environment
import os
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL")
```

### Why Secrets Must NEVER Be Hardcoded
1. **Source Code Exposure**: Once a commit is pushed to GitHub, GitLab, or Docker Hub, anyone with read access (or if the repo is made public) can see your passwords, API keys, and database credentials.
2. **Git History Permanence**: Deleting a password in a subsequent commit does **NOT** erase it from Git history. Attackers routinely scan Git commit logs for leaked keys.
3. **Multi-Environment Flexibility**: Local development, staging, and production all use different databases, ports, and domains. Environment variables allow the exact same codebase to run anywhere without modification.

---

## 2. `.env` vs. `.env.example`: The Golden Rule

| File | Contains | Committed to Git? | Purpose |
|---|---|---|---|
| **`.env`** / **`.env.local`** | **REAL** passwords, private keys, database URLs | ❌ **NEVER** (strictly in `.gitignore`) | Used locally by your development server on your machine. |
| **`.env.example`** | **PLACEHOLDER** examples (e.g., `user:pass@localhost`) | ✅ **YES** (tracked in Git) | Documentation for other developers showing what variables exist. |

> [!CAUTION]
> If Git ever shows `git status` with `backend/.env` or `frontend/.env.local` as an untracked or modified file, **STOP**. Do not run `git add .` until you verify `.gitignore` is ignoring them.

---

## 3. Architecture Boundary: Frontend vs. Backend Variables

```
┌──────────────────────────────────────────────┐
│  Browser / Client-Side (Next.js)             │
│  Only NEXT_PUBLIC_* variables are bundled!   │
│  - NEXT_PUBLIC_API_URL                       │
│  - NEXT_PUBLIC_APP_NAME                      │
└──────────────────────┬───────────────────────┘
                       │ (HTTP Requests)
                       ▼
┌──────────────────────────────────────────────┐
│  FastAPI Backend (Python)                    │
│  Private server-side variables only!         │
│  - DATABASE_URL (Contains DB credentials)    │
│  - JWT_SECRET_KEY (Signs authentication)     │
│  - CORS_ORIGINS                              │
└──────────────────────────────────────────────┘
```

### Why Next.js Variables Use `NEXT_PUBLIC_`
Next.js compiles code that runs in two places:
1. On the **Node.js server** (Server Components).
2. Inside the **User's Browser** (Client Components).

To prevent accidental leaks, Next.js **blocks** all environment variables from being bundled into client-side JavaScript unless they begin with `NEXT_PUBLIC_`.

- `DATABASE_URL`: **Private**. Never prefix with `NEXT_PUBLIC_`.
- `JWT_SECRET_KEY`: **Private**. Never prefix with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_API_URL`: **Public**. Tells the browser where to send API requests.

---

## 4. Complete Variable Reference

### Backend Variables (`backend/.env`)

| Variable Name | Purpose | Example / Format | Required in Prod? |
|---|---|---|---|
| `ENVIRONMENT` | Runtime mode (`development`, `test`, `production`) | `production` | Yes |
| `DATABASE_URL` | Asynchronous PostgreSQL connection string | `postgresql+asyncpg://user:pass@host:5432/dbname` | Yes |
| `DATABASE_URL_SYNC` | Synchronous PostgreSQL connection string (auto-derived) | `postgresql://user:pass@host:5432/dbname` | Optional |
| `JWT_SECRET_KEY` | 256-bit cryptographic signing key for JWTs | Random 32+ character string | Yes |
| `JWT_ALGORITHM` | Algorithm used for JWT encoding | `HS256` | Yes (default: HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan | `60` | Yes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan | `7` | Yes |
| `CORS_ORIGINS` | Permitted frontend origins (comma-separated) | `https://mytradejournal-frontend.onrender.com` | Yes |
| `FRONTEND_URL` | Canonical frontend domain URL | `https://mytradejournal-frontend.onrender.com` | Yes |
| `RUN_MIGRATIONS_ON_START` | Runs `alembic upgrade head` before Uvicorn | `true` | Recommended for Render Free |
| `LOG_LEVEL` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`) | `INFO` | Yes |

### Frontend Variables (`frontend/.env.local`)

| Variable Name | Purpose | Example / Format | Required in Prod? |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public HTTPS backend REST API base URL | `https://mytradejournal-backend.onrender.com` | Yes |
| `NEXT_PUBLIC_APP_NAME`| Application branding title | `MyTradeJournal` | Optional |

---

## 5. Local Development Setup (Step-by-Step)

### Step 1: Clone the Repository
```bash
git clone https://github.com/piushlibra-arch/tradejournal.git
cd tradejournal
```

### Step 2: Start the Local PostgreSQL Database
The repository includes a [`docker-compose.yml`](file:///Users/pisu/Desktop/tradejournal/docker-compose.yml) file configured to run PostgreSQL 16 on port `5433`:
```bash
docker compose up -d
```
*(Verify it is running with `docker compose ps`)*

### Step 3: Configure the Backend Environment
1. Copy the example file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Verify `backend/.env` contents:
   ```dotenv
   ENVIRONMENT=development
   DATABASE_URL=postgresql+asyncpg://tradejournal:tradejournal_dev@localhost:5433/tradejournal
   JWT_SECRET_KEY=mytradejournal-super-secret-development-key-32chars
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   REFRESH_TOKEN_EXPIRE_DAYS=7
   CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   FRONTEND_URL=http://localhost:3000
   RUN_MIGRATIONS_ON_START=true
   LOG_LEVEL=INFO
   ```
3. Install backend dependencies and run database migrations:
   ```bash
   cd backend
   uv sync
   uv run alembic upgrade head
   ```
4. Start the FastAPI development server:
   ```bash
   uv run uvicorn app.main:app --reload --port 8000
   ```
   *(API documentation will be available at `http://localhost:8000/api/docs`)*

### Step 4: Configure the Frontend Environment
1. Open a new terminal window:
   ```bash
   cd frontend
   cp .env.example .env.local
   ```
2. Verify `frontend/.env.local`:
   ```dotenv
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_APP_NAME=MyTradeJournal
   ```
3. Install dependencies and start Next.js:
   ```bash
   npm install
   npm run dev
   ```
   *(Open `http://localhost:3000` in your browser)*

---

## 6. How to Generate a Secure Cryptographic Secret

In production, `JWT_SECRET_KEY` must have high entropy (at least 256 bits / 32 characters).

**Using OpenSSL (Terminal):**
```bash
openssl rand -hex 32
```
*Output example:* `9f2b88e1a76c8d45129ef40b8a134d1933a268158c3db08f37dc1c1f516a8d0e`

**Using Python:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 7. Render Production Configuration

In your Render Blueprint ([`render.yaml`](file:///Users/pisu/Desktop/tradejournal/render.yaml)), environment variables are handled automatically without manual typing:

```yaml
services:
  - type: web
    name: mytradejournal-backend
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: mytradejournal-db
          property: connectionString
      - key: JWT_SECRET_KEY
        generateValue: true # Render automatically creates a unique 256-bit secret!
      - key: CORS_ORIGINS
        value: http://localhost:3000,https://mytradejournal-frontend.onrender.com
      - key: RUN_MIGRATIONS_ON_START
        value: "true"

  - type: web
    name: mytradejournal-frontend
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://mytradejournal-backend.onrender.com
```

- **`generateValue: true`**: Instructs Render's secrets engine to generate a cryptographically secure random string.
- **`fromDatabase: connectionString`**: Injects the private database URI directly into the backend container.

---

## 8. How to Rotate Credentials Safely

If a secret is ever exposed or compromised:

### 1. Rotating `JWT_SECRET_KEY`
1. Go to [Render Dashboard](https://dashboard.render.com) $\to$ **`mytradejournal-backend`** $\to$ **Environment**.
2. Click **Edit** next to `JWT_SECRET_KEY` and paste a new 64-character random string (or delete it so Render regenerates a fresh one).
3. Click **Save Changes**. Render will redeploy the service.
4. *Effect*: All currently logged-in users will receive an HTTP 401 on their next request and will be redirected to `/login`. User accounts and trade data remain completely unharmed.

### 2. Rotating PostgreSQL Password
1. Go to Render Dashboard $\to$ **`mytradejournal-db`** $\to$ **Settings** $\to$ **Access Control** $\to$ **Rotate Password**.
2. Confirm the rotation. Render updates the database password and automatically restarts `mytradejournal-backend` with the new `DATABASE_URL`.

---

## 9. Common Configuration Errors & Solutions

### 1. `ValueError: Production configuration error: JWT_SECRET_KEY is using an insecure or default placeholder value`
- **Cause**: The application is running with `ENVIRONMENT=production`, but `JWT_SECRET_KEY` was either left empty, uses a known development default, or is shorter than 32 characters.
- **Solution**: Set `JWT_SECRET_KEY` in your environment or Render dashboard to a secure 32+ character random string.

### 2. `ValueError: Production configuration error: DATABASE_URL points to localhost/127.0.0.1`
- **Cause**: Production mode detected that `DATABASE_URL` is pointing to a local development database.
- **Solution**: Provide a managed cloud PostgreSQL connection string (such as Render's internal database URL).

### 3. `CORS Policy: No 'Access-Control-Allow-Origin' header is present`
- **Cause**: The frontend URL requesting the API is not listed in `CORS_ORIGINS`.
- **Solution**: In `backend` environment variables, add your exact frontend URL to `CORS_ORIGINS` (e.g. `CORS_ORIGINS=https://mytradejournal-frontend.onrender.com`). Make sure there is no trailing slash.

### 4. `ModuleNotFoundError: No module named 'psycopg'`
- **Cause**: Asynchronous SQLAlchemy with asyncpg requires connection strings starting with `postgresql+asyncpg://`.
- **Solution**: The application includes an automatic validator that normalizes `postgres://` and `postgresql://` into `postgresql+asyncpg://`. If overriding manually, ensure the scheme is `postgresql+asyncpg://`.
