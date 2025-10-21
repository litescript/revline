# api/app/schemas/ro.py
from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional


class ROStatusMeta(BaseModel):
    status_code: str
    label: str
    role_owner: str
    color: str


class ActiveRODTO(BaseModel):
    id: int
    ro_number: str
    customer_name: str
    vehicle_label: str
    advisor_name: str | None
    tech_name: str | None
    opened_at: datetime
    updated_at: datetime
    is_waiter: bool
    status: ROStatusMeta


class ROLineDTO(BaseModel):
    id: int
    line_type: str  # "labor" | "part"
    description: str
    qty: Optional[float] = None
    unit_price: Optional[float] = None
    line_total: Optional[float] = None

    class Config:
        orm_mode = True


class RODetailDTO(BaseModel):
    id: int
    ro_number: str
    status_code: str
    status_label: str
    opened_at: datetime
    updated_at: datetime

    customer_id: int
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None

    vehicle_id: int
    vehicle_label: str
    vin: Optional[str] = None
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    license_plate: Optional[str] = None

    lines: List[ROLineDTO] = []

    class Config:
        orm_mode = True
