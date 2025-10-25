from sqlalchemy import Column, Integer, String, UniqueConstraint
from .base import Base  # ← import Base from local .base to avoid circulars


class ROStatus(Base):
    __tablename__ = "ro_statuses"
    id = Column(Integer, primary_key=True, index=True)
    status_code = Column(String(64), nullable=False, unique=True, index=True)
    label = Column(String(128), nullable=False)
    role_owner = Column(String(32), nullable=False)  # technician | advisor | parts | foreman
    color = Column(String(32), nullable=False)  # blue | purple | etc.

    __table_args__ = (UniqueConstraint("status_code", name="uq_ro_status_status_code"),)


class ServiceCategory(Base):
    __tablename__ = "service_categories"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(16), nullable=False, unique=True, index=True)  # e.g., "31"
    label = Column(String(128), nullable=False)

    __table_args__ = (UniqueConstraint("code", name="uq_service_category_code"),)
