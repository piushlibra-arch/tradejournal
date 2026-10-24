from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.backtest_service import BacktestEngine, BacktestRequest, BacktestSummary

router = APIRouter(prefix="/backtest", tags=["Backtesting Engine"])


@router.post("/run", response_model=BacktestSummary)
async def run_backtest_simulation(
    req: BacktestRequest,
    current_user: User = Depends(get_current_user),
):
    """Run an out-of-sample backtest simulation without look-ahead bias."""
    return BacktestEngine.run_simulation(req)
