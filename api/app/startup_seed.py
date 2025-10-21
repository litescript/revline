from __future__ import annotations
from datetime import datetime, timedelta
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.repair_order import RepairOrder
from app.models.ro_status import ROStatus

CUSTOMERS = [
    ("1001", "Jane Miller", "2020 BMW X3 xDrive30i", "advisor_working"),
    ("1002", "Alex Gomez", "2018 MINI Cooper S", "ready_for_advisor"),
    ("1003", "Chris Patel", "2017 BMW 330i", "tech_working"),
    ("1004", "Sam Nguyen", "2024 BMW i4 eDrive40", "ready_for_tech_review"),
    ("1005", "Taylor Reed", "2015 BMW X5 50i", "parts_working"),
    ("1006", "Morgan Lee", "2022 BMW M340i", "advisor_working"),
    ("1007", "Jordan King", "2019 BMW X1", "ready_for_advisor"),
    ("1008", "Riley Chen", "2016 BMW 528i", "tech_working"),
    ("1009", "Avery Park", "2013 BMW 135i", "parts_enroute_to_tech"),
    ("1010", "Casey Fox", "2021 BMW X5 45e", "foreman_working_solution"),
    ("1011", "Jamie Cruz", "2018 BMW M2", "advisor_working"),
    ("1012", "Devin Price", "2023 BMW 330e", "ready_for_advisor"),
    ("1013", "Parker Hale", "2014 BMW 535d", "ready_for_tech_review"),
    ("1014", "Quinn Wolfe", "2020 BMW X7 xDrive40i", "advisor_working"),
    ("1015", "Pat Jordan", "2017 BMW 440i", "parts_working"),
]

OWNER_HINTS = {
    "advisor_working": "advisor",
    "ready_for_advisor": "advisor",
    "tech_working": "technician",
    "ready_for_tech_review": "technician",
    "parts_working": "parts",
    "parts_enroute_to_tech": "parts",
    "foreman_working_solution": "foreman",
}

ADVISORS = ["Peter B.", "J. Smith", "L. Carter"]
TECHS = ["M. Diaz", "H. Patel", "R. Young", "E. Tran"]


async def seed_repair_orders(db: AsyncSession):
    # ensure statuses exist
    sts = (await db.execute(select(ROStatus.status_code))).scalars().all()
    stset = set(sts)
    if not stset:
        return  # status seeding runs elsewhere

    existing = (await db.execute(select(RepairOrder.id))).first()
    if existing:
        return  # already seeded

    now = datetime.utcnow()
    rows = []
    # make 15 rows with varied waiter + timestamps last 0-48h
    waiter_targets = set(random.sample(range(len(CUSTOMERS)), k=4))
    for idx, (ro, cust, veh, code) in enumerate(CUSTOMERS):
        if code not in stset:
            # fallback if status list changed
            code = list(stset)[idx % len(stset)]

        hours_ago_open = random.randint(6, 48)
        hours_ago_update = random.randint(0, hours_ago_open)
        opened_at = now - timedelta(hours=hours_ago_open)
        updated_at = now - timedelta(hours=hours_ago_update)

        rows.append(
            RepairOrder(
                ro_number=ro,
                customer_name=cust,
                vehicle_label=veh,
                status_code=code,
                advisor_name=(
                    random.choice(ADVISORS)
                    if OWNER_HINTS.get(code) in ("advisor", "foreman")
                    else None
                ),
                tech_name=(
                    random.choice(TECHS)
                    if OWNER_HINTS.get(code) in ("technician", "foreman")
                    else None
                ),
                opened_at=opened_at,
                updated_at=updated_at,
                is_waiter=(idx in waiter_targets),
            )
        )

    db.add_all(rows)
    await db.commit()
