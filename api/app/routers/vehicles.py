from app.core.db import get_db
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleOut
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("/", response_model=list[VehicleOut])
def list_vehicles(db: Session = Depends(get_db)):
    res = db.execute(select(Vehicle).limit(200))
    return res.scalars().all()


@router.get("/by", response_model=list[VehicleOut])
def find_vehicle(
    vin: str | None = Query(default=None),
    plate: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = select(Vehicle)
    if vin:
        stmt = stmt.where(Vehicle.vin == vin)
    if plate:
        stmt = stmt.where(Vehicle.plate == plate)
    res = db.execute(stmt.limit(50))
    return res.scalars().all()


@router.post("/", response_model=VehicleOut, status_code=201)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    obj = Vehicle(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
