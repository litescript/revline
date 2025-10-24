from __future__ import annotations
from datetime import datetime, timedelta
import random

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.ro import RepairOrder
from app.models.meta import ROStatus

FIRST_NAMES = [
    "Jane",
    "Alex",
    "Chris",
    "Sam",
    "Taylor",
    "Morgan",
    "Jordan",
    "Casey",
    "Riley",
    "Quinn",
    "Avery",
    "Drew",
]
LAST_NAMES = [
    "Miller",
    "Gomez",
    "Patel",
    "Nguyen",
    "Reed",
    "Lee",
    "King",
    "Shaw",
    "Price",
    "Khan",
    "Young",
    "Green",
]
MAKES = ["BMW", "MINI", "BMW", "BMW", "BMW", "MINI"]
MODELS = ["X3 xDrive30i", "Cooper S", "330i", "i4 eDrive40", "X5 50i", "M340i", "X1", "530e"]


def _ensure_min_customers_vehicles(db: Session, n: int = 12) -> list[tuple[Customer, Vehicle]]:
    # materialize as lists to avoid Sequence typing complaints
    custs: list[Customer] = list(db.execute(select(Customer)).scalars())
    vehs: list[Vehicle] = list(db.execute(select(Vehicle)).scalars())

    while len(custs) < n:
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        c = Customer(
            first_name=fn,
            last_name=ln,
            email=f"{fn.lower()}.{ln.lower()}@example.com",
            phone="555-555-1212",
        )
        db.add(c)
        db.flush()
        custs.append(c)

    while len(vehs) < n:
        owner = random.choice(custs)
        year = random.randint(2015, 2025)
        make = random.choice(MAKES)
        model = random.choice(MODELS)
        v = Vehicle(
            customer_id=owner.id,
            vin=f"TESTVIN{random.randint(100000,999999)}",
            plate=None,
            year=year,
            make=make,
            model=model,
        )
        db.add(v)
        db.flush()
        vehs.append(v)

    db.commit()
    return [(custs[i % len(custs)], vehs[i % len(vehs)]) for i in range(n)]


def seed_active_ros_if_empty(db: Session, min_rows: int = 12) -> None:
    # if any RO exists, do nothing
    if db.execute(select(RepairOrder.id).limit(1)).first():
        return

    status_codes: list[str] = list(db.execute(select(ROStatus.status_code)).scalars())
    if not status_codes:
        # meta should be seeded earlier
        return

    pairs = _ensure_min_customers_vehicles(db, n=min_rows)
    now = datetime.utcnow()

    rows: list[RepairOrder] = []
    for i, (c, v) in enumerate(pairs, start=1):
        opened = now - timedelta(hours=random.randint(4, 96))
        updated = opened + timedelta(minutes=random.randint(0, 180))
        rows.append(
            RepairOrder(
                number=f"{1000 + i}",
                status=random.choice(status_codes),
                customer_id=c.id,
                vehicle_id=v.id,
                opened_at=opened,
                updated_at=updated,
                is_waiter=(i % 3 == 0),
            )
        )

    db.add_all(rows)
    db.commit()
