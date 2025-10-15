from app.core.db import get_db
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    like = f"%{q.lower()}%"
    custs = (
        db.execute(
            select(Customer)
            .where(
                or_(
                    Customer.first_name.ilike(like),
                    Customer.last_name.ilike(like),
                    Customer.email.ilike(like),
                    Customer.phone.ilike(like),
                )
            )
            .limit(20)
        )
        .scalars()
        .all()
    )

    vehs = (
        db.execute(
            select(Vehicle).where(or_(Vehicle.vin.ilike(like), Vehicle.plate.ilike(like))).limit(20)
        )
        .scalars()
        .all()
    )

    return {"customers": custs, "vehicles": vehs}
