from pathlib import Path
import json
from sqlalchemy.orm import Session  # type: ignore
from sqlalchemy import select, func  # type: ignore
from app.models.meta import ROStatus, ServiceCategory

DATA_DIR = Path(__file__).resolve().parents[1] / "data"  # /app/app/data


def _read_json(filename: str):
    fp = DATA_DIR / filename
    return json.loads(fp.read_text(encoding="utf-8"))


def seed_meta_if_empty(db: Session):
    # RO statuses
    ro_count = db.scalar(select(func.count()).select_from(ROStatus))
    if not ro_count:
        rows = _read_json("ro_statuses.json")
        for r in rows:
            db.add(
                ROStatus(
                    status_code=r["status_code"],
                    label=r["label"],
                    role_owner=r["role_owner"],
                    color=r["color"],
                )
            )

    # Service categories
    sc_count = db.scalar(select(func.count()).select_from(ServiceCategory))
    if not sc_count:
        rows = _read_json("service_categories.json")
        for r in rows:
            db.add(ServiceCategory(code=r["code"], label=r["label"]))

    if (not ro_count) or (not sc_count):
        db.commit()
