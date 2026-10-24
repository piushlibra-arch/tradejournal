# MyTradeJournal

> Trade. Review. Improve.

A professional trading journal and analytics platform for serious traders. Import trades, analyze performance, identify patterns, and develop winning strategies.

## Features

- 📊 **Trade Journal** — Log every trade with detailed entry/exit data
- 📈 **Analytics Dashboard** — Win rate, profit factor, expectancy, drawdown
- 📅 **Trading Calendar** — Visualize daily P&L
- 🎯 **Strategy Playbook** — Define and track strategies
- 🛡️ **Risk Manager** — Daily loss limits, prop-firm rules
- 🔄 **Trade Replay** — Review trades on candlestick charts
- 📥 **CSV Import** — Import trades from brokers

## Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.x, PostgreSQL
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Charts**: Recharts, TradingView Lightweight Charts

## Quick Start

### Prerequisites

- Python 3.11
- Node.js 18+
- Docker & Docker Compose
- uv (Python package manager)

### 1. Clone and Setup

```bash
cd tradejournal
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

Wait for the database to be healthy:
```bash
docker compose ps
```

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

The API will be available at http://localhost:8000
- API docs: http://localhost:8000/api/docs
- Health check: http://localhost:8000/api/health

### 4. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

### 5. Run Tests

```bash
# Backend tests
cd backend
uv run pytest tests/ -v

# Frontend
cd frontend
npm run build  # Type check + build
```

## Project Structure

```
tradejournal/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security, logging
│   │   ├── db/           # Database session, base
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   ├── migrations/       # Alembic migrations
│   ├── tests/            # Backend tests
│   └── pyproject.toml
├── frontend/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── lib/              # Utils, API client, auth
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register new user |
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/auth/me | Current user |
| GET | /api/v1/accounts | List accounts |
| POST | /api/v1/accounts | Create account |
| GET | /api/v1/trades | List trades |
| POST | /api/v1/trades | Create trade |
| PATCH | /api/v1/trades/{id} | Update trade |
| DELETE | /api/v1/trades/{id} | Delete trade |

Full API documentation available at `/api/docs` when the backend is running.

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | Required |
| JWT_SECRET_KEY | Secret key for JWT tokens | Required |
| CORS_ORIGINS | Allowed CORS origins | http://localhost:3000 |

### Frontend (.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:8000 |

## License

Private — All rights reserved.
