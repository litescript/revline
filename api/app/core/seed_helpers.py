"""Idempotent seed helpers for Customer and Vehicle models."""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.vehicle import Vehicle

logger = logging.getLogger(__name__)

def get_or_create_customer(
    db: Session, *, first_name: str, last_name: str, email: str, phone: str | None = None
) -> Customer:
    stmt = select(Customer).where(Customer.email == email)
    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        return existing
    obj = Customer(first_name=first_name, last_name=last_name, email=email, phone=phone)
    db.add(obj)
    try:
        db.flush()
        return obj
    except IntegrityError:
        db.rollback()
        existing = db.execute(stmt).scalar_one_or_none()
        if existing:
            return existing
        raise

def get_or_create_vehicle(
    db: Session, *, vin: str, year: int, make: str, model: str, customer: Customer
) -> Vehicle:
    stmt = select(Vehicle).where(Vehicle.vin == vin)
    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        return existing
    obj = Vehicle(vin=vin, year=year, make=make, model=model, customer_id=customer.id)
    db.add(obj)
    try:
        db.flush()
        return obj
    except IntegrityError:
        db.rollback()
        existing = db.execute(stmt).scalar_one_or_none()
        if existing:
            return existing
        raise
