# api/app/models/__init__.py
# Single import surface for Alembic and the app. Importing this module should
# load all model classes so Base.metadata has every table.

from .base import Base  # noqa: F401

# Domain models
from .customer import Customer  # noqa: F401
from .vehicle import Vehicle  # noqa: F401
from .part import Part  # noqa: F401

# Repair Order models (legacy schema aligned with current DB)
from .ro import RepairOrder, ROLine  # noqa: F401

# Metadata tables (statuses, service categories)
from .meta import ROStatus, ServiceCategory  # noqa: F401

__all__ = [
    "Base",
    "Customer",
    "Vehicle",
    "Part",
    "RepairOrder",
    "ROLine",
    "ROStatus",
    "ServiceCategory",
]
