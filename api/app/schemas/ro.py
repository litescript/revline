from datetime import datetime
from pydantic import BaseModel

class ROLineOut(BaseModel):
    id: int
    line_no: int
    labor_desc: str
    labor_hours: float
    part_id: int | None
    part_qty: float

    class Config:
        from_attributes = True

class ROOut(BaseModel):
    id: int
    number: str
    status: str
    customer_id: int | None
    vehicle_id: int | None
    opened_at: datetime
    closed_at: datetime | None
    lines: list[ROLineOut] = []

    class Config:
        from_attributes = True
