from decimal import Decimal
from typing import List, Optional, Tuple


def calculate_realized_pnl(
    direction: str,
    entry_price: Decimal,
    exit_price: Decimal,
    quantity: Decimal,
    contract_size: Decimal = Decimal("1"),
    commission: Decimal = Decimal("0"),
    fees: Decimal = Decimal("0"),
    swap: Decimal = Decimal("0"),
) -> Tuple[Decimal, Decimal]:
    """Calculates (gross_pnl, net_pnl) with exact Decimal precision."""
    if direction.lower() == "long":
        gross = (exit_price - entry_price) * quantity * contract_size
    else:
        gross = (entry_price - exit_price) * quantity * contract_size
    net = gross - commission - fees - swap
    return gross, net


def calculate_win_rate(net_pnls: List[Decimal]) -> Tuple[float, int, int, int]:
    """
    Returns (win_rate, wins_count, losses_count, breakeven_count).
    Per prompt specifications: Breakeven trades (net_pnl == 0) are excluded from win-rate denominator.
    """
    wins = sum(1 for p in net_pnls if p > 0)
    losses = sum(1 for p in net_pnls if p < 0)
    breakeven = sum(1 for p in net_pnls if p == 0)
    decisive_trades = wins + losses
    if decisive_trades == 0:
        return 0.0, wins, losses, breakeven
    return round((wins / decisive_trades) * 100, 2), wins, losses, breakeven


def calculate_profit_factor(net_pnls: List[Decimal]) -> Optional[Decimal]:
    """
    Profit factor = Gross winning P&L / abs(Gross losing P&L).
    Returns None (representing infinite or undefined) if no losses.
    """
    gross_wins = sum((p for p in net_pnls if p > 0), Decimal("0"))
    gross_losses = abs(sum((p for p in net_pnls if p < 0), Decimal("0")))
    if gross_losses == Decimal("0"):
        return None if gross_wins == Decimal("0") else Decimal("Infinity")
    return round(gross_wins / gross_losses, 4)


def calculate_expectancy(net_pnls: List[Decimal]) -> Decimal:
    """Expectancy = Total Net PnL / Total Completed Trades."""
    if not net_pnls:
        return Decimal("0")
    total_net = sum(net_pnls, Decimal("0"))
    return round(total_net / Decimal(len(net_pnls)), 4)


def calculate_peak_to_trough_drawdown(equity_curve: List[Decimal]) -> Tuple[Decimal, Decimal]:
    """
    Returns (max_drawdown_amount, max_drawdown_percentage).
    """
    if not equity_curve:
        return Decimal("0"), Decimal("0")

    peak = equity_curve[0]
    max_dd = Decimal("0")
    max_dd_pct = Decimal("0")

    for value in equity_curve:
        if value > peak:
            peak = value
        dd = peak - value
        if dd > max_dd:
            max_dd = dd
            if peak > Decimal("0"):
                max_dd_pct = round((max_dd / peak) * 100, 2)

    return max_dd, max_dd_pct


def calculate_r_multiple(
    direction: str,
    entry_price: Decimal,
    exit_price: Decimal,
    stop_loss_price: Optional[Decimal],
) -> Optional[Decimal]:
    """
    R-multiple = (exit - entry) / (entry - stop_loss) for longs
    Returns None if stop loss is missing or invalid (risk <= 0).
    """
    if stop_loss_price is None:
        return None

    if direction.lower() == "long":
        planned_risk = entry_price - stop_loss_price
        if planned_risk <= Decimal("0"):
            return None
        return round((exit_price - entry_price) / planned_risk, 2)
    else:
        planned_risk = stop_loss_price - entry_price
        if planned_risk <= Decimal("0"):
            return None
        return round((entry_price - exit_price) / planned_risk, 2)


# Test suite verifying exact financial specifications
def test_financial_long_and_short_calculations():
    # Long test
    gross, net = calculate_realized_pnl(
        direction="long",
        entry_price=Decimal("100.00"),
        exit_price=Decimal("110.00"),
        quantity=Decimal("50"),
        commission=Decimal("5.00"),
        fees=Decimal("2.50"),
    )
    assert gross == Decimal("500.00")
    assert net == Decimal("492.50")

    # Short test
    gross_s, net_s = calculate_realized_pnl(
        direction="short",
        entry_price=Decimal("150.00"),
        exit_price=Decimal("140.00"),
        quantity=Decimal("20"),
        commission=Decimal("4.00"),
    )
    assert gross_s == Decimal("200.00")
    assert net_s == Decimal("196.00")


def test_breakeven_exclusion_in_win_rate():
    pnls = [
        Decimal("250.00"),  # win
        Decimal("-100.00"),  # loss
        Decimal("0.00"),  # breakeven
        Decimal("150.00"),  # win
    ]
    rate, wins, losses, breakeven = calculate_win_rate(pnls)
    assert wins == 2
    assert losses == 1
    assert breakeven == 1
    # Win rate must be 2 / (2 + 1) = 66.67%, NOT 2 / 4 (50%)
    assert rate == 66.67


def test_profit_factor_and_zero_losses():
    # Normal case: wins 600, losses 200 -> PF = 3.0
    pnls = [Decimal("300.00"), Decimal("300.00"), Decimal("-200.00")]
    pf = calculate_profit_factor(pnls)
    assert pf == Decimal("3.0000")

    # Zero losses case -> does not crash with ZeroDivisionError, returns Infinity
    pnls_all_wins = [Decimal("100.00"), Decimal("200.00")]
    assert calculate_profit_factor(pnls_all_wins) == Decimal("Infinity")


def test_drawdown_peak_to_trough():
    # Balance trajectory: 10000 -> 12000 -> 9000 -> 11000 -> 8000 -> 13000
    curve = [
        Decimal("10000"),
        Decimal("12000"),
        Decimal("9000"),  # DD of 3000 from peak 12000 (25%)
        Decimal("11000"),
        Decimal("8000"),  # DD of 4000 from peak 12000 (33.33%)
        Decimal("13000"),
    ]
    max_dd, max_dd_pct = calculate_peak_to_trough_drawdown(curve)
    assert max_dd == Decimal("4000")
    assert max_dd_pct == Decimal("33.33")


def test_r_multiple_calculation():
    # Long: Entry 100, Stop 95, Exit 115 -> Risk 5, Profit 15 -> 3R
    assert calculate_r_multiple("long", Decimal("100"), Decimal("115"), Decimal("95")) == Decimal("3.00")

    # Short: Entry 200, Stop 205, Exit 190 -> Risk 5, Profit 10 -> 2R
    assert calculate_r_multiple("short", Decimal("200"), Decimal("190"), Decimal("205")) == Decimal("2.00")

    # Missing stop loss returns None safely
    assert calculate_r_multiple("long", Decimal("100"), Decimal("115"), None) is None
