# api/app/schemas/ro.py
from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


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


class RODetailDTO(BaseModel):
    id: int
    ro_number: str
    customer_name: str
    vehicle_label: str
    opened_at: datetime
    updated_at: datetime
    is_waiter: bool
    status: ROStatusMeta
    notes: Optional[str] = None
