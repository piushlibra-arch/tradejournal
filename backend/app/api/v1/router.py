from fastapi import APIRouter

from app.api.v1 import accounts, analytics, assistant, auth, backtest, dashboard, imports, journal, risk, strategies, trades

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
api_router.include_router(trades.router, prefix="/trades", tags=["Trades"])
api_router.include_router(imports.router, prefix="/imports", tags=["Imports"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(journal.router, prefix="", tags=["Daily Journal"])
api_router.include_router(strategies.router, prefix="", tags=["Strategies"])
api_router.include_router(risk.router, prefix="", tags=["Risk Manager"])
api_router.include_router(backtest.router, prefix="", tags=["Backtesting Engine"])
api_router.include_router(assistant.router, prefix="", tags=["AI Trading Assistant"])
