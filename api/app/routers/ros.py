# api/app/routers/ros.py
from __future__ import annotations
from typing import Optional, Literal, List

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, or_, desc, String, cast, func
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.models.ro import RepairOrder
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.meta import ROStatus
from app.schemas.ro import (
    ActiveRODTO,
    ROStatusMeta,
    RODetailDTO,
    ROLineDTO,
)

router = APIRouter(prefix="/ros", tags=["ros"])

OwnerFilter = Literal["advisor", "technician", "parts", "foreman"]


@router.get("/active", response_model=List[ActiveRODTO])
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


@router.get("/{ro_id}", response_model=RODetailDTO)
def get_ro_detail(
    ro_id: int,
    db: Session = Depends(get_db),
):
    """
    ORM-loaded detail view with eager relationships.
    Maps existing model fields to RODetailDTO and synthesizes line shapes.
    """
    ro = (
        db.query(RepairOrder)
        .options(
            selectinload(RepairOrder.customer),
            selectinload(RepairOrder.vehicle),
            selectinload(RepairOrder.lines),
        )
        .filter(RepairOrder.id == ro_id)
        .first()
    )
    if not ro:
        raise HTTPException(status_code=404, detail="RO not found")

    # Status label fallback (until/unless you join ROStatus here)
    status_label = (ro.status or "").replace("_", " ").title()

    cust = ro.customer
    veh = ro.vehicle

    # Customer name safely built from optional fields
    first = (getattr(cust, "first_name", None) or "").strip()
    last = (getattr(cust, "last_name", None) or "").strip()
    customer_name = (f"{first} {last}").strip()

    # Build vehicle label parts as strict strings (no Nones)
    parts: List[str] = []
    year_val = getattr(veh, "year", None)
    if year_val is not None:
        parts.append(str(year_val))
    make_val = getattr(veh, "make", None)
    if isinstance(make_val, str) and make_val.strip():
        parts.append(make_val.strip())
    model_val = getattr(veh, "model", None)
    if isinstance(model_val, str) and model_val.strip():
        parts.append(model_val.strip())
    vehicle_label = " ".join(parts).strip()
    plate_val = getattr(veh, "license_plate", None) or getattr(veh, "plate", None)
    if isinstance(plate_val, str) and plate_val.strip():
        vehicle_label = (
            f"{vehicle_label} • {plate_val.strip()}" if vehicle_label else plate_val.strip()
        )

    # Normalize lines (derive type/qty from current columns)
    line_items: List[ROLineDTO] = []
    for line_row in ro.lines or []:
        part_id = getattr(line_row, "part_id", None)
        part_qty = getattr(line_row, "part_qty", None)
        labor_hours = getattr(line_row, "labor_hours", None)
        labor_desc = getattr(line_row, "labor_desc", "") or ""

        is_part = (part_id is not None) or (part_qty is not None and float(part_qty) > 0)
        qty_val = (
            float(part_qty)
            if is_part and part_qty is not None
            else float(labor_hours) if labor_hours is not None else None
        )

        line_items.append(
            ROLineDTO(
                id=line_row.id,
                line_type="part" if is_part else "labor",
                description=labor_desc,
                qty=qty_val,
                unit_price=None,  # not modeled yet
                line_total=None,  # not modeled yet
            )
        )

    return RODetailDTO(
        id=ro.id,
        ro_number=ro.number or "",
        status_code=ro.status or "",
        status_label=status_label or (ro.status or ""),
        opened_at=ro.opened_at,
        updated_at=ro.updated_at or ro.opened_at,
        customer_id=getattr(cust, "id", 0) if cust else 0,
        customer_name=customer_name,
        customer_phone=getattr(cust, "phone", None) if cust else None,
        customer_email=getattr(cust, "email", None) if cust else None,
        vehicle_id=getattr(veh, "id", 0) if veh else 0,
        vehicle_label=vehicle_label,
        vin=getattr(veh, "vin", None) if veh else None,
        year=getattr(veh, "year", None) if veh else None,
        make=getattr(veh, "make", None) if veh else None,
        model=getattr(veh, "model", None) if veh else None,
        license_plate=plate_val if isinstance(plate_val, str) else None,
        lines=line_items,
    )
