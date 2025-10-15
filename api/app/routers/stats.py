from app.core.db import get_db
from app.models.customer import Customer
from app.models.ro import RepairOrder
from app.models.vehicle import Vehicle
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def stats(db: Session = Depends(get_db)):
    total_customers = db.execute(select(func.count()).select_from(Customer)).scalar_one()
    total_vehicles = db.execute(select(func.count()).select_from(Vehicle)).scalar_one()
    open_ros = db.execute(
        select(func.count()).select_from(RepairOrder).where(RepairOrder.status == "OPEN")
    ).scalar_one()
    return {
        "customers": total_customers,
        "vehicles": total_vehicles,
        "open_ros": open_ros,
    }
