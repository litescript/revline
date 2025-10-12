from app.core.db import get_db
from app.models.ro import RepairOrder
from app.schemas.ro import ROOut
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ros", tags=["ros"])


@router.get("/", response_model=list[ROOut])
def list_ros(db: Session = Depends(get_db)):
    res = db.execute(select(RepairOrder).limit(100))
    return res.scalars().unique().all()


@router.get("/{ro_id}", response_model=ROOut)
def get_ro(ro_id: int, db: Session = Depends(get_db)):
    res = db.execute(select(RepairOrder).where(RepairOrder.id == ro_id))
    ro = res.scalar_one()
    return ro
