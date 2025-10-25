from __future__ import annotations
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from app.core.db import Base

if TYPE_CHECKING:
    from .customer import Customer
    from .vehicle import Vehicle

    # We do NOT import ROStatus because it does not exist yet.


class RepairOrder(Base):
    __tablename__ = "repair_orders"

    id = Column(Integer, primary_key=True, index=True)
    ro_number = Column(String(32), nullable=False, unique=True)

    customer_name = Column(String(128), nullable=False)
    vehicle_label = Column(String(128), nullable=False)

    status_code = Column(String(64), ForeignKey("ro_statuses.status_code"), nullable=False)

    advisor_name = Column(String(128), nullable=True)
    tech_name = Column(String(128), nullable=True)

    opened_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    is_waiter = Column(Boolean, nullable=False, default=False)

    # keep this relationship for runtime, but do NOT try to type it to ROStatus yet
    status = relationship("ROStatus", back_populates="repair_orders")

    # OPTIONAL, if you’ve got back_populates="ros" on Customer/Vehicle:
    # customer = relationship("Customer", back_populates="ros")
    # vehicle = relationship("Vehicle", back_populates="ros")


Index("ix_repair_orders_status_code", RepairOrder.status_code)
Index("ix_repair_orders_updated_at", RepairOrder.updated_at.desc())
Index("ix_repair_orders_ro_number", RepairOrder.ro_number)
