import uuid
from datetime import datetime, time, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.risk_rule import RiskRule
from app.models.trade import Trade
from app.schemas.risk import RiskEvaluationItem, RiskRuleCreate, RiskRuleUpdate, RiskStatusReport


class RiskService:
    @staticmethod
    async def create_rule(
        db: AsyncSession,
        user_id: uuid.UUID,
        data: RiskRuleCreate,
    ) -> RiskRule:
        rule = RiskRule(
            user_id=user_id,
            account_id=data.account_id,
            rule_type=data.rule_type,
            threshold=data.threshold,
            action=data.action,
            is_active=data.is_active,
        )
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def get_rule(
        db: AsyncSession,
        user_id: uuid.UUID,
        rule_id: uuid.UUID,
    ) -> RiskRule:
        stmt = select(RiskRule).where(
            and_(
                RiskRule.id == rule_id,
                RiskRule.user_id == user_id,
            )
        )
        res = await db.execute(stmt)
        rule = res.scalar_one_or_none()
        if not rule:
            raise NotFoundError(f"Risk rule {rule_id} not found")
        return rule

    @staticmethod
    async def list_rules(
        db: AsyncSession,
        user_id: uuid.UUID,
        account_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[RiskRule], int]:
        filters = [RiskRule.user_id == user_id]
        if account_id:
            filters.append(RiskRule.account_id == account_id)
        if is_active is not None:
            filters.append(RiskRule.is_active == is_active)

        stmt = select(RiskRule).where(and_(*filters)).order_by(RiskRule.created_at.desc())
        res = await db.execute(stmt)
        items = list(res.scalars().all())
        return items, len(items)

    @staticmethod
    async def update_rule(
        db: AsyncSession,
        user_id: uuid.UUID,
        rule_id: uuid.UUID,
        data: RiskRuleUpdate,
    ) -> RiskRule:
        rule = await RiskService.get_rule(db, user_id, rule_id)
        for key, val in data.model_dump(exclude_unset=True).items():
            setattr(rule, key, val)
        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def delete_rule(
        db: AsyncSession,
        user_id: uuid.UUID,
        rule_id: uuid.UUID,
    ) -> None:
        rule = await RiskService.get_rule(db, user_id, rule_id)
        stmt = delete(RiskRule).where(and_(RiskRule.id == rule.id, RiskRule.user_id == user_id))
        await db.execute(stmt)
        await db.commit()

    @staticmethod
    async def evaluate_risk(
        db: AsyncSession,
        user_id: uuid.UUID,
        account_id: Optional[uuid.UUID] = None,
    ) -> RiskStatusReport:
        # Fetch active rules for user
        rule_filters = [RiskRule.user_id == user_id, RiskRule.is_active.is_(True)]
        if account_id:
            rule_filters.append((RiskRule.account_id == account_id) | (RiskRule.account_id.is_(None)))
        rule_stmt = select(RiskRule).where(and_(*rule_filters))
        rule_res = await db.execute(rule_stmt)
        rules = list(rule_res.scalars().all())

        if not rules:
            return RiskStatusReport(
                overall_status="safe",
                evaluations=[],
                rules_checked=0,
                breaches_count=0,
                warnings_count=0,
            )

        # Get today's trades
        now = datetime.now(timezone.utc)
        today_start = datetime.combine(now.date(), time.min).replace(tzinfo=timezone.utc)

        trade_filters = [Trade.user_id == user_id, Trade.entry_time >= today_start]
        if account_id:
            trade_filters.append(Trade.account_id == account_id)
        trade_stmt = select(Trade).where(and_(*trade_filters))
        trade_res = await db.execute(trade_stmt)
        today_trades = list(trade_res.scalars().all())

        evaluations: List[RiskEvaluationItem] = []
        breaches = 0
        warnings = 0

        for r in rules:
            rule_type = r.rule_type
            thresh = Decimal(str(r.threshold))
            current_val = Decimal("0")
            status = "safe"
            msg = "Rule limits respected"

            if rule_type == "max_daily_loss":
                # Sum today's net pnl
                today_pnl = sum((t.net_pnl for t in today_trades if t.net_pnl is not None), Decimal("0"))
                observed_loss = abs(today_pnl) if today_pnl < Decimal("0") else Decimal("0")
                current_val = observed_loss

                if observed_loss >= thresh:
                    status = "breached"
                    msg = f"Daily loss of ${observed_loss:,.2f} reached or exceeded limit of ${thresh:,.2f}"
                elif observed_loss >= (thresh * Decimal("0.80")):
                    status = "warning"
                    msg = f"Daily loss of ${observed_loss:,.2f} is within 80% of ${thresh:,.2f} limit"
                else:
                    msg = f"Daily loss ${observed_loss:,.2f} well within ${thresh:,.2f} threshold"

            elif rule_type == "max_trades_per_day":
                trade_count = Decimal(len(today_trades))
                current_val = trade_count

                if trade_count >= thresh:
                    status = "breached"
                    msg = f"Executed {int(trade_count)} trades today, exceeding daily maximum of {int(thresh)}"
                elif trade_count >= (thresh * Decimal("0.80")):
                    status = "warning"
                    msg = f"Executed {int(trade_count)} trades today, near limit of {int(thresh)}"
                else:
                    msg = f"Executed {int(trade_count)} trades of {int(thresh)} max permitted"

            elif rule_type == "max_loss_per_trade":
                losses = [t.net_pnl for t in today_trades if t.net_pnl is not None and t.net_pnl < Decimal("0")]
                max_loss = abs(min(losses)) if losses else Decimal("0")
                current_val = max_loss

                if max_loss >= thresh:
                    status = "breached"
                    msg = f"Single trade loss of ${max_loss:,.2f} breached max loss limit of ${thresh:,.2f}"
                elif max_loss >= (thresh * Decimal("0.80")):
                    status = "warning"
                    msg = f"Single trade loss of ${max_loss:,.2f} approached limit of ${thresh:,.2f}"
                else:
                    msg = f"Max single trade loss ${max_loss:,.2f} safely under ${thresh:,.2f}"

            elif rule_type == "max_position_size":
                max_qty = max((t.quantity for t in today_trades), default=Decimal("0"))
                current_val = max_qty

                if max_qty > thresh:
                    status = "breached"
                    msg = f"Position size {max_qty} exceeded maximum allowed of {thresh}"
                else:
                    msg = f"Position size {max_qty} within maximum allowed of {thresh}"

            elif rule_type == "max_drawdown":
                # Use current daily loss as conservative intraday drawdown
                today_pnl = sum((t.net_pnl for t in today_trades if t.net_pnl is not None), Decimal("0"))
                drawdown = abs(today_pnl) if today_pnl < Decimal("0") else Decimal("0")
                current_val = drawdown

                if drawdown >= thresh:
                    status = "breached"
                    msg = f"Drawdown of ${drawdown:,.2f} breached threshold of ${thresh:,.2f}"
                elif drawdown >= (thresh * Decimal("0.80")):
                    status = "warning"
                    msg = f"Drawdown of ${drawdown:,.2f} is within 80% of limit ${thresh:,.2f}"
                else:
                    msg = f"Drawdown ${drawdown:,.2f} within limit ${thresh:,.2f}"

            if status == "breached":
                breaches += 1
            elif status == "warning":
                warnings += 1

            evaluations.append(
                RiskEvaluationItem(
                    rule_id=r.id,
                    rule_type=rule_type,
                    threshold=thresh,
                    current_value=current_val,
                    status=status,
                    message=msg,
                    account_id=r.account_id,
                )
            )

        overall = "breached" if breaches > 0 else ("warning" if warnings > 0 else "safe")

        return RiskStatusReport(
            overall_status=overall,
            evaluations=evaluations,
            rules_checked=len(evaluations),
            breaches_count=breaches,
            warnings_count=warnings,
        )
