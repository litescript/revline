"""
Startup integrity checks for the Revline API.
Run these checks during FastAPI lifespan to catch configuration errors early.
"""
from __future__ import annotations

import logging
from collections import defaultdict

from app.models.base import Base

logger = logging.getLogger(__name__)


def check_duplicate_table_mappings() -> None:
    """
    Verify that no SQLAlchemy table is mapped by multiple ORM classes.

    This prevents runtime conflicts where two model classes accidentally
    target the same database table, causing mapper registration errors.

    Raises:
        RuntimeError: If any table has multiple mappers registered.
    """
    table_to_mappers: dict[str, list[str]] = defaultdict(list)

    for mapper in Base.registry.mappers:
        table_name = mapper.persist_selectable.name
        class_name = mapper.class_.__name__
        table_to_mappers[table_name].append(class_name)

    # Find tables with duplicate mappings
    duplicates = {
        table: classes
        for table, classes in table_to_mappers.items()
        if len(classes) > 1
    }

    if duplicates:
        error_lines = ["Duplicate table mappings detected:"]
        for table, classes in duplicates.items():
            error_lines.append(f"  Table '{table}' mapped by: {', '.join(classes)}")
        error_lines.append("")
        error_lines.append("This indicates multiple ORM model classes targeting the same table.")
        error_lines.append("Check for obsolete models or incorrect __tablename__ values.")

        error_msg = "\n".join(error_lines)
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    logger.info(
        "Duplicate table mapping check passed: %d unique tables mapped",
        len(table_to_mappers)
    )


def run_all_startup_checks() -> None:
    """
    Execute all startup integrity checks.
    Call this once during FastAPI lifespan after all models are imported.
    """
    logger.info("Running startup integrity checks...")
    check_duplicate_table_mappings()
    logger.info("All startup checks passed")
