"""
Startup integrity checks for the Revline API.
Run these checks during FastAPI lifespan to catch configuration errors early.
"""
from __future__ import annotations

import logging
import os
import sys
from collections import defaultdict
from typing import Any

from app.core.config import settings
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
        # persist_selectable can be a Table, Subquery, or other selectable
        # For mapped classes, it's typically a Table with a .name attribute
        selectable: Any = mapper.persist_selectable
        table_name = getattr(selectable, "name", str(selectable))
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


def check_jwt_production_config() -> None:
    """
    Ensure JWT issuer/audience are set in production.

    Fails fast if ENV=production and either JWT_ISSUER or JWT_AUDIENCE missing.
    """
    env = os.getenv("ENV", "development").lower()

    if env == "production":
        if not settings.jwt_issuer:
            logger.error("❌ JWT_ISSUER is required in production")
            sys.exit(1)

        if not settings.jwt_audience:
            logger.error("❌ JWT_AUDIENCE is required in production")
            sys.exit(1)

        logger.info(
            "✓ JWT production config validated (iss=%s, aud=%s)",
            settings.jwt_issuer,
            settings.jwt_audience,
        )
    else:
        logger.info("✓ JWT config optional in %s environment", env)


def run_all_startup_checks() -> None:
    """
    Execute all startup integrity checks.
    Call this once during FastAPI lifespan after all models are imported.
    """
    logger.info("Running startup integrity checks...")
    check_duplicate_table_mappings()
    check_jwt_production_config()
    logger.info("All startup checks passed")
