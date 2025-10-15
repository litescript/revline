from app.core.db import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerOut
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    res = db.execute(select(Customer).limit(200))
    return res.scalars().all()


@router.post("/", response_model=CustomerOut, status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    obj = Customer(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
