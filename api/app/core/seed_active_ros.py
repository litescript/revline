from __future__ import annotations
from datetime import datetime, timedelta
import random

from sqlalchemy.orm import Session
from sqlalchemy import select  # func
from sqlalchemy.exc import IntegrityError

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


# ---------- helpers: idempotent get-or-create ----------


def _get_or_create_customer(
    db: Session, *, email: str, first: str, last: str, phone: str | None
) -> Customer:
    existing = db.execute(select(Customer).where(Customer.email == email)).scalar_one_or_none()
    if existing:
        return existing
    obj = Customer(first_name=first, last_name=last, email=email, phone=phone)
    db.add(obj)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        obj = db.execute(select(Customer).where(Customer.email == email)).scalar_one()
    return obj


def _get_or_create_vehicle(
    db: Session,
    *,
    vin: str,
    year: int,
    make: str,
    model: str,
    plate: str | None,
    owner_id: int | None,
) -> Vehicle:
    existing = db.execute(select(Vehicle).where(Vehicle.vin == vin)).scalar_one_or_none()
    if existing:
        return existing
    obj = Vehicle(
        customer_id=owner_id,
        vin=vin,
        plate=plate,  # <-- use 'plate'
        year=year,
        make=make,
        model=model,
    )
    db.add(obj)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        obj = db.execute(select(Vehicle).where(Vehicle.vin == vin)).scalar_one()
    return obj


def _ensure_min_customers_vehicles(db: Session, n: int = 12) -> list[tuple[Customer, Vehicle]]:
    # materialize current rows
    custs: list[Customer] = list(db.execute(select(Customer)).scalars())
    vehs: list[Vehicle] = list(db.execute(select(Vehicle)).scalars())

    # --- ensure customers ---
    # generate unique emails deterministically if we exceed the base combos
    while len(custs) < n:
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        base_email = f"{fn.lower()}.{ln.lower()}@example.com"

        email = base_email
        suffix = 1
        # if email exists, add +suffix before @
        while db.execute(select(Customer.id).where(Customer.email == email)).first():
            local, at, domain = base_email.partition("@")
            email = f"{local}+{suffix}@{domain}"
            suffix += 1

        c = _get_or_create_customer(
            db,
            email=email,
            first=fn,
            last=ln,
            phone="555-555-1212",
        )
        custs.append(c)

    # --- ensure vehicles ---
    while len(vehs) < n:
        owner = random.choice(custs) if custs else None
        year = random.randint(2015, 2025)
        make = random.choice(MAKES)
        model = random.choice(MODELS)
        # VIN uniqueness: regenerate until free (short, cheap loop in dev)
        vin = f"TESTVIN{random.randint(100000, 999999)}"
        while db.execute(select(Vehicle.id).where(Vehicle.vin == vin)).first():
            vin = f"TESTVIN{random.randint(100000, 999999)}"

        v = _get_or_create_vehicle(
            db,
            vin=vin,
            year=year,
            make=make,
            model=model,
            plate=None,  # keep None unless you want random plates
            owner_id=owner.id if owner else None,
        )
        vehs.append(v)

    db.commit()
    return [(custs[i % len(custs)], vehs[i % len(vehs)]) for i in range(n)]


def seed_active_ros_if_empty(db: Session, min_rows: int = 12) -> None:
    # If any ROs already exist, do nothing (your original behavior)
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
