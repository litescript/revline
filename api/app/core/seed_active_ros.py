from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from random import randint, choice
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.customer import Customer
from app.models.vehicle import Vehicle
from app.models.ro import RepairOrder, ROStatusCode
from app.core.seed_helpers import get_or_create_customer, get_or_create_vehicle

logger = logging.getLogger(__name__)

def _ensure_min_customers_vehicles(db: Session, *, n: int = 6) -> list[tuple[Customer, Vehicle]]:
    demo = [
        ("Alex", "Young", "alex.young@example.com", "555-555-1212", "WBA1A9C57FV000001", 2015, "BMW", "228i"),
        ("Sam", "Miller", "sam.miller@example.com", "555-555-3434", "WBA3A5C57DF000002", 2013, "BMW", "328i"),
        ("Jamie", "Tran", "jamie.tran@example.com", "555-555-8989", "WBA8E1C57GK000003", 2016, "BMW", "428i"),
        ("Taylor", "Nguyen", "taylor.nguyen@example.com", "555-555-7777", "WBS3C9C50FP000004", 2015, "BMW", "M3"),
        ("Jordan", "Lee", "jordan.lee@example.com", "555-555-2323", "WBY1Z2C56FV000005", 2015, "BMW", "i3"),
        ("Riley", "Chen", "riley.chen@example.com", "555-555-0101", "WBAYE8C53DD000006", 2013, "BMW", "535i"),
    ]
    pairs = []
    for i in range(n):
        first, last, email, phone, vin, year, make, model = demo[i % len(demo)]
        cust = get_or_create_customer(db, first_name=first, last_name=last, email=email, phone=phone)
        veh = get_or_create_vehicle(db, vin=vin, year=year, make=make, model=model, customer=cust)
        pairs.append((cust, veh))
    return pairs

def seed_active_ros_if_empty(db: Session, *, min_rows: int = 6) -> None:
    has_ro = db.execute(select(RepairOrder.id).limit(1)).first()
    if has_ro:
        logger.info("RepairOrders already present; skipping RO seed")
        return
    pairs = _ensure_min_customers_vehicles(db, n=min_rows)
    for idx, (cust, veh) in enumerate(pairs):
        opened = datetime.now(timezone.utc) - timedelta(days=randint(0, 10))
        # Ensure at least one OPEN RO for demonstration
        if idx == 0:
            status = ROStatusCode.OPEN
        else:
            status = choice(ROStatusCode.all_statuses())
        ro = RepairOrder(
            customer_id=cust.id,
            vehicle_id=veh.id,
            number=str(randint(100000, 999999)),
            status=status,
            opened_at=opened,
            updated_at=opened,
            is_waiter=choice([True, False]),
        )
        db.add(ro)
    db.commit()
    logger.info("Seeded %d demo RepairOrders", min_rows)
