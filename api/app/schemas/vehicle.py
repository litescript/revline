from pydantic import BaseModel

class VehicleBase(BaseModel):
    customer_id: int
    vin: str
    plate: str | None = None
    year: int | None = None
    make: str | None = None
    model: str | None = None

class VehicleCreate(VehicleBase):
    pass

class VehicleOut(VehicleBase):
    id: int

    class Config:
        from_attributes = True
