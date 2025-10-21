# api/app/routers/ros.py
from __future__ import annotations
from typing import Optional, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import (
    select,
    or_,
    desc,
    String,
    cast,
    func,
)  # case <- commented out, vscode notes not used. left as backup.
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.ro import RepairOrder
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.meta import ROStatus
from app.schemas.ro import ActiveRODTO, ROStatusMeta

router = APIRouter(prefix="/ros", tags=["ros"])

OwnerFilter = Literal["advisor", "technician", "parts", "foreman"]


@router.get("/active", response_model=list[ActiveRODTO])
def get_active_ros(
    owner: Optional[OwnerFilter] = Query(
        default=None, description="advisor|technician|parts|foreman"
    ),
    waiter: Optional[bool] = Query(default=None, description="filter by waiter=true"),
    search: Optional[str] = Query(default=None, description="search ro#, customer, vehicle"),
    db: Session = Depends(get_db),
):
    # Compose "vehicle_label" = "<year> <make> <model>"
    vehicle_label = func.trim(
        func.concat_ws(" ", cast(Vehicle.year, String), Vehicle.make, Vehicle.model)
    )

    stmt = (
        select(
            RepairOrder.id.label("id"),
            RepairOrder.number.label("ro_number"),
            func.trim(
                func.concat_ws(
                    " ",
                    func.coalesce(Customer.first_name, ""),
                    func.coalesce(Customer.last_name, ""),
                )
            ).label("customer_name"),
            vehicle_label.label("vehicle_label"),
            RepairOrder.opened_at,
            RepairOrder.updated_at,
            RepairOrder.is_waiter,
            ROStatus.status_code,
            ROStatus.label,
            ROStatus.role_owner,
            ROStatus.color,
        )
        .select_from(RepairOrder)
        .join(Customer, Customer.id == RepairOrder.customer_id, isouter=True)
        .join(Vehicle, Vehicle.id == RepairOrder.vehicle_id, isouter=True)
        .join(ROStatus, ROStatus.status_code == RepairOrder.status, isouter=True)
    )

    if owner:
        stmt = stmt.where(ROStatus.role_owner == owner)
    if waiter is not None:
        stmt = stmt.where(RepairOrder.is_waiter.is_(True if waiter else False))
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                RepairOrder.number.ilike(s),
                func.concat_ws(" ", Customer.first_name, Customer.last_name).ilike(s),
                Vehicle.make.ilike(s),
                Vehicle.model.ilike(s),
                cast(Vehicle.year, String).ilike(s),
            )
        )

    stmt = stmt.order_by(desc(RepairOrder.updated_at), desc(RepairOrder.opened_at)).limit(200)

    rows = db.execute(stmt).all()

    return [
        ActiveRODTO(
            id=r.id,
            ro_number=r.ro_number or "",
            customer_name=(r.customer_name or "").strip(),
            vehicle_label=(r.vehicle_label or "").strip(),
            advisor_name=None,
            tech_name=None,
            opened_at=r.opened_at,
            updated_at=r.updated_at or r.opened_at,
            is_waiter=bool(r.is_waiter),
            status=ROStatusMeta(
                status_code=r.status_code or "",
                label=r.label or "Unknown",
                role_owner=r.role_owner or "advisor",
                color=r.color or "gray",
            ),
        )
        for r in rows
    ]
