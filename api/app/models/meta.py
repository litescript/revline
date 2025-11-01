from sqlalchemy import Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base  # ← import Base from local .base to avoid circulars


class ROStatus(Base):
    __tablename__ = "ro_statuses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    status_code: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    role_owner: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # technician | advisor | parts | foreman
    color: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # blue | purple | etc.

    __table_args__ = (UniqueConstraint("status_code", name="uq_ro_status_status_code"),)


class ServiceCategory(Base):
    __tablename__ = "service_categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(
        String(16), nullable=False, unique=True, index=True
    )  # e.g., "31"
    label: Mapped[str] = mapped_column(String(128), nullable=False)

    __table_args__ = (UniqueConstraint("code", name="uq_service_category_code"),)
