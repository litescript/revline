from pathlib import Path
import json
from sqlalchemy.orm import Session  # type: ignore
from sqlalchemy import select, func  # type: ignore
from app.models.meta import ROStatus, ServiceCategory

# Resolve data dir robustly for both layouts:
#   a) /app/app/data  (repo: api/app/data)
#   b) /app/data      (if the "app" package is flattened in container)
_BASE = Path(__file__).resolve().parents[1]  # .../app
_CANDIDATES = [_BASE / "data", _BASE.parent / "data"]
for _d in _CANDIDATES:
    if _d.exists():
        DATA_DIR = _d
        break
else:
    # fall back to repo-relative guess to help debugging
    DATA_DIR = _BASE / "data"


def _read_json(filename: str):
    fp = DATA_DIR / filename
    return json.loads(fp.read_text(encoding="utf-8"))


def seed_meta_if_empty(db: Session) -> None:
    # RO statuses
    if db.execute(select(func.count(ROStatus.id))).scalar_one() == 0:
        rows = _read_json("ro_statuses.json")
        db.add_all([ROStatus(**r) for r in rows])
        db.commit()
    # Service categories
    if db.execute(select(func.count(ServiceCategory.id))).scalar_one() == 0:
        rows = _read_json("service_categories.json")
        db.add_all([ServiceCategory(**r) for r in rows])
        db.commit()
