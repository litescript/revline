# api/app/routers/ros.py
from __future__ import annotations
from typing import Any, Optional, Literal

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import (
    select,
    or_,
    desc,
    String,
    cast,
    func,
)
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.ro import RepairOrder
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.meta import ROStatus
from app.schemas.ro import ActiveRODTO, ROStatusMeta, RODetailDTO

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


@router.get("/{id}", response_model=RODetailDTO)
def get_ro_detail(id: int, db: Session = Depends(get_db)):
    # Build the same vehicle label used in /ros/active
    vehicle_label = func.trim(
        func.concat_ws(
            " ",
            cast(Vehicle.year, String),
            Vehicle.make,
            Vehicle.model,
        )
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
        .join(Customer, Customer.id == RepairOrder.customer_id, isouter=True)
        .join(Vehicle, Vehicle.id == RepairOrder.vehicle_id, isouter=True)
        .join(ROStatus, ROStatus.status_code == RepairOrder.status, isouter=True)
        .where(RepairOrder.id == id)
        .limit(1)
    )

    row = db.execute(stmt).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"RO {id} not found")

    # Defensive optional notes: only query if the column exists on this model
    notes_val: Optional[str] = None
    notes_attr: Any = getattr(RepairOrder, "notes", None)
    if notes_attr is not None:
        try:
            notes_val = db.execute(
                select(notes_attr).where(RepairOrder.id == id).limit(1)
            ).scalar_one_or_none()
        except Exception:
            notes_val = None

    return RODetailDTO(
        id=row.id,
        ro_number=row.ro_number or "",
        customer_name=(row.customer_name or "").strip(),
        vehicle_label=row.vehicle_label or "",
        opened_at=row.opened_at,
        updated_at=row.updated_at or row.opened_at,
        is_waiter=bool(row.is_waiter),
        status=ROStatusMeta(
            status_code=row.status_code or "",
            label=row.label or "Unknown",
            role_owner=row.role_owner or "advisor",
            color=row.color or "gray",
        ),
        notes=notes_val,
    )
