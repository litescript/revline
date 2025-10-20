# api/app/routers/ros.py
from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, or_, select, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.repair_order import RepairOrder
from app.models.ro_status import ROStatus
from app.schemas.ro import ActiveRODTO, ROStatusMeta

router = APIRouter(prefix="/ros", tags=["ros"])

OwnerFilter = Literal["advisor", "technician", "parts", "foreman"]


@router.get("/active", response_model=list[ActiveRODTO])
async def get_active_ros(
    owner: Optional[OwnerFilter] = Query(
        default=None, description="advisor|technician|parts|foreman"
    ),
    waiter: Optional[bool] = Query(default=None),
    search: Optional[str] = Query(
        default=None, description="ro_number|customer_name|vehicle_label"
    ),
    since: Optional[datetime] = Query(default=None),
    sort: Literal["updated_at", "opened_at", "ro_number"] = "updated_at",
    dir: Literal["asc", "desc"] = "desc",
    limit: int = Query(default=200, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    stmt = select(
        RepairOrder.id,
        RepairOrder.ro_number,
        RepairOrder.customer_name,
        RepairOrder.vehicle_label,
        RepairOrder.advisor_name,
        RepairOrder.tech_name,
        RepairOrder.opened_at,
        RepairOrder.updated_at,
        RepairOrder.is_waiter,
        ROStatus.status_code,
        ROStatus.label,
        ROStatus.role_owner,
        ROStatus.color,
    ).join(ROStatus, ROStatus.status_code == RepairOrder.status_code)

    conditions = []
    if owner:
        conditions.append(ROStatus.role_owner == owner)
    if waiter is not None:
        conditions.append(RepairOrder.is_waiter.is_(waiter))
    if since:
        conditions.append(RepairOrder.updated_at >= since)
    if search:
        s = f"%{search.strip()}%"
        conditions.append(
            or_(
                RepairOrder.ro_number.ilike(s),
                RepairOrder.customer_name.ilike(s),
                RepairOrder.vehicle_label.ilike(s),
            )
        )
    if conditions:
        stmt = stmt.where(and_(*conditions))

    colmap = {
        "updated_at": RepairOrder.updated_at,
        "opened_at": RepairOrder.opened_at,
        "ro_number": RepairOrder.ro_number,
    }
    order_col = colmap[sort]
    stmt = stmt.order_by(asc(order_col) if dir == "asc" else desc(order_col)).limit(limit)

    rows = (await db.execute(stmt)).all()

    return [
        ActiveRODTO(
            id=r.id,
            ro_number=r.ro_number,
            customer_name=r.customer_name,
            vehicle_label=r.vehicle_label,
            advisor_name=r.advisor_name,
            tech_name=r.tech_name,
            opened_at=r.opened_at,
            updated_at=r.updated_at,
            is_waiter=bool(r.is_waiter),
            status=ROStatusMeta(
                status_code=r.status_code,
                label=r.label,
                role_owner=r.role_owner,
                color=r.color,
            ),
        )
        for r in rows
    ]
