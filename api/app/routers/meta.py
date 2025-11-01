import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/meta", tags=["meta"])

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def _read_json(filename: str):
    fp = DATA_DIR / filename
    if not fp.exists():
        raise HTTPException(status_code=500, detail=f"Missing data file: {filename}")
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read {filename}: {e}")


@router.get("/ro-statuses")
def get_ro_statuses():
    """Return canonical RO statuses (code, label, role_owner, color)."""
    return _read_json("ro_statuses.json")


@router.get("/service-categories")
def get_service_categories():
    """Return dealership service categories (code, label)."""
    return _read_json("service_categories.json")
