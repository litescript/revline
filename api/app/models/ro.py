from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from decimal import Decimal

if TYPE_CHECKING:  # type-only imports; avoids circulars at runtime
    from app.models.customer import Customer
    from app.models.vehicle import Vehicle


class RepairOrder(Base):
    __tablename__ = "repair_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # legacy RO number
    status: Mapped[str] = mapped_column(
        String(24), index=True
    )  # legacy status code (joins ro_statuses.status_code)

    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), index=True
    )
    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), index=True
    )

    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    is_waiter: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # relationships
    customer: Mapped["Customer"] = relationship(back_populates="ros")
    vehicle: Mapped["Vehicle"] = relationship(back_populates="ros")
    lines: Mapped[list["ROLine"]] = relationship(
        back_populates="ro",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


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

    # ---------- Convenience properties for 4C mapping ----------
    @property
    def line_type(self) -> str:
        # If there's a part_id or part_qty set, treat as a parts line; otherwise labor
        if self.part_id is not None or (self.part_qty and float(self.part_qty) > 0):
            return "part"
        return "labor"

    @property
    def description(self) -> str:
        # Prefer labor_desc; if you later add a joined Part, you can fall back to part.name
        return self.labor_desc

    @staticmethod
    def _to_float(val: Decimal | float | int | None) -> float | None:
        if val is None:
            return None
        try:
            return float(val)
        except Exception:
            return None

    @property
    def qty(self) -> float | None:
        # labor → hours; parts → qty
        if self.line_type == "labor":
            return self._to_float(self.labor_hours)
        return self._to_float(self.part_qty)

    @property
    def unit_price(self) -> float | None:
        # Not modeled yet. Return None now; wire up when you add pricing.
        return None

    @property
    def line_total(self) -> float | None:
        # Not modeled yet. You can implement when you add pricing or rates.
        return None
