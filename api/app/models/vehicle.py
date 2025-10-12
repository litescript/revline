from __future__ import annotations
from sqlalchemy import Integer, String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), index=True)
    vin: Mapped[str] = mapped_column(String(17), unique=True, index=True)
    plate: Mapped[str | None] = mapped_column(String(16), index=True)
    year: Mapped[int | None] = mapped_column(Integer)
    make: Mapped[str | None] = mapped_column(String(40))
    model: Mapped[str | None] = mapped_column(String(60))

    customer: Mapped["Customer"] = relationship(back_populates="vehicles")
    ros: Mapped[list["RepairOrder"]] = relationship(back_populates="vehicle")

Index("ix_vehicle_plate", Vehicle.plate)
