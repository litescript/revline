from __future__ import annotations

from sqlalchemy import Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

from typing import TYPE_CHECKING, List

if TYPE_CHECKING:
    from .ro import RepairOrder
    from .vehicle import Vehicle


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String(80), index=True)
    last_name: Mapped[str] = mapped_column(String(80), index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), index=True)

    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="customer")
    ros: Mapped[list["RepairOrder"]] = relationship(back_populates="customer")


Index("ix_customer_name", Customer.first_name, Customer.last_name)
