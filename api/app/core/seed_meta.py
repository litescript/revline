"""Seed metadata tables with initial data."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.meta import ROStatus, ServiceCategory

logger = logging.getLogger(__name__)

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


# Canonical baseline RO status codes that must always exist
CANONICAL_STATUS_CODES = [
    {
        "status_code": "OPEN",
        "label": "Open",
        "role_owner": "advisor",
        "color": "green",
    },
    {
        "status_code": "DIAG",
        "label": "Diagnosis",
        "role_owner": "technician",
        "color": "yellow",
    },
    {
        "status_code": "PARTS",
        "label": "Awaiting Parts",
        "role_owner": "parts",
        "color": "purple",
    },
    {
        "status_code": "READY",
        "label": "Ready for Pickup",
        "role_owner": "advisor",
        "color": "teal",
    },
]


def _read_json(filename: str) -> list[dict[str, Any]]:
    """Read and parse a JSON file from the data directory."""
    fp = DATA_DIR / filename
    content = fp.read_text(encoding="utf-8")
    data = json.loads(content)
    # Ensure we return a list for type safety
    if not isinstance(data, list):
        raise TypeError(f"Expected list in {filename}, got {type(data).__name__}")
    return data


def _upsert_ro_status(
    db: Session, status_code: str, label: str, role_owner: str, color: str
) -> ROStatus:
    """
    Idempotently insert or update an ROStatus row by status_code.
    Returns the ROStatus instance (existing or newly created).
    """
    stmt = select(ROStatus).where(ROStatus.status_code == status_code)
    existing = db.execute(stmt).scalar_one_or_none()

    if existing:
        # Update existing
        existing.label = label
        existing.role_owner = role_owner
        existing.color = color
        db.flush()
        return existing
    else:
        # Insert new
        obj = ROStatus(status_code=status_code, label=label, role_owner=role_owner, color=color)
        db.add(obj)
        try:
            db.flush()
            return obj
        except IntegrityError:
            # Race condition: another transaction inserted it
            db.rollback()
            existing = db.execute(stmt).scalar_one_or_none()
            if existing:
                return existing
            raise


def seed_meta_if_empty(db: Session) -> None:
    """Seed metadata tables if they are empty."""
    # RO statuses - always ensure canonical codes exist first
    for entry in CANONICAL_STATUS_CODES:
        _upsert_ro_status(
            db,
            status_code=entry["status_code"],
            label=entry["label"],
            role_owner=entry["role_owner"],
            color=entry["color"]
        )
    db.commit()
    logger.info("Upserted %d canonical RO status codes", len(CANONICAL_STATUS_CODES))

    # Load additional statuses from JSON if needed
    count_stmt = select(func.count(ROStatus.id))
    current_count = db.execute(count_stmt).scalar_one()

    if current_count == len(CANONICAL_STATUS_CODES):
        # Only canonical codes exist, load the full set
        rows = _read_json("ro_statuses.json")
        for row in rows:
            _upsert_ro_status(
                db,
                status_code=row["status_code"],
                label=row["label"],
                role_owner=row["role_owner"],
                color=row["color"]
            )
        db.commit()
        logger.info("Loaded additional RO statuses from ro_statuses.json")

    # Service categories
    cat_count_stmt = select(func.count(ServiceCategory.id))
    cat_count = db.execute(cat_count_stmt).scalar_one()

    if cat_count == 0:
        rows = _read_json("service_categories.json")
        db.add_all([ServiceCategory(**r) for r in rows])
        db.commit()
        logger.info("Loaded %d service categories", len(rows))
