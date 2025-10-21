from __future__ import annotations
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String  # type: ignore
from sqlalchemy.orm import relationship  # type: ignore

from app.core.db import Base


class RepairOrder(Base):
    __tablename__ = "repair_orders"

    id = Column(Integer, primary_key=True, index=True)
    ro_number = Column(String(32), nullable=False, unique=True)
    customer_name = Column(String(128), nullable=False)
    vehicle_label = Column(String(128), nullable=False)

    # FK to ro_statuses.status_code (assumes your ROStatus model/table already seeded)
    status_code = Column(String(64), ForeignKey("ro_statuses.status_code"), nullable=False)

    advisor_name = Column(String(128), nullable=True)
    tech_name = Column(String(128), nullable=True)

    opened_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    is_waiter = Column(Boolean, nullable=False, default=False)

    status = relationship("ROStatus", back_populates="repair_orders")


# Helpful indexes for our filters/sorts
Index("ix_repair_orders_status_code", RepairOrder.status_code)
Index("ix_repair_orders_updated_at", RepairOrder.updated_at.desc())
Index("ix_repair_orders_ro_number", RepairOrder.ro_number)
