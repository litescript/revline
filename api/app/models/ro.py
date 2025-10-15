from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class RepairOrder(Base):
    __tablename__ = "repair_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(24), index=True, default="OPEN")
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closed_at: Mapped[datetime | None]

    customer: Mapped["Customer"] = relationship(back_populates="ros")
    vehicle: Mapped["Vehicle"] = relationship(back_populates="ros")
    lines: Mapped[list["ROLine"]] = relationship(back_populates="ro", cascade="all, delete-orphan")


class ROLine(Base):
    __tablename__ = "ro_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ro_id: Mapped[int] = mapped_column(
        ForeignKey("repair_orders.id", ondelete="CASCADE"), index=True
    )
    line_no: Mapped[int] = mapped_column(Integer)
    labor_desc: Mapped[str] = mapped_column(String(255))
    labor_hours: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    part_id: Mapped[int | None] = mapped_column(ForeignKey("parts.id"))
    part_qty: Mapped[float] = mapped_column(Numeric(8, 2), default=0)

    ro: Mapped["RepairOrder"] = relationship(back_populates="lines")
