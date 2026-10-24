#!/usr/bin/env bash
set -e

# Production startup script for MyTradeJournal Backend on Render

echo "=== Starting MyTradeJournal Backend ==="

# If RUN_MIGRATIONS_ON_START is set to true, execute migrations before launching server
# (Useful when preDeployCommand is not available, e.g. on Render Free plan)
if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
    echo "Applying database migrations with Alembic..."
    uv run alembic upgrade head
    echo "Database migrations applied successfully."
fi

# Launch ASGI server with Uvicorn
PORT="${PORT:-8000}"
echo "Binding Uvicorn to 0.0.0.0:${PORT}"
exec uv run uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
