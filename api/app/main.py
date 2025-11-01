import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging early so seed and startup messages appear in docker logs
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(message)s"
)

import app.models.meta  # noqa: E402, F401  # logging must be configured first
from app.core.db import SessionLocal, engine  # noqa: E402
from app.models.base import Base  # noqa: E402
from app.core.rate_limit import init_rate_limiter  # noqa: E402
from app.core.seed_active_ros import seed_active_ros_if_empty  # noqa: E402
from app.core.seed_meta import seed_meta_if_empty  # noqa: E402
from app.core.startup_checks import run_all_startup_checks  # noqa: E402
from app.routers import (  # noqa: E402
    auth,
    customers,
    meta as meta_router,
    ros,
    search,
    stats,
    vehicles,
)
from app.services.redis import get_redis  # noqa: E402

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(api: FastAPI):
    """Create tables and seed demo data for dev environments."""
    Base.metadata.create_all(bind=engine)

    # Run startup integrity checks
    run_all_startup_checks()

    # Initialize rate limiter with Redis
    redis_client = await get_redis()
    init_rate_limiter(redis_client)

    db = SessionLocal()
    try:
        # Meta seed — safe but isolated from Active RO seed
        try:
            seed_meta_if_empty(db)
        except Exception as e:
            logging.getLogger(__name__).exception("Meta seeding failed; continuing startup: %s", e)

        # Active RO seed — now idempotent, but still guarded for safety
        try:
            seed_active_ros_if_empty(db)
        except Exception as e:
            logging.getLogger(__name__).exception(
                "Active RO seeding failed; continuing startup: %s", e
            )
    finally:
        db.close()
    yield
    # teardown placeholder


api = FastAPI(title="Revline API", lifespan=lifespan)

api.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api.include_router(auth.router, prefix=API_PREFIX)
api.include_router(customers.router, prefix=API_PREFIX)
api.include_router(vehicles.router, prefix=API_PREFIX)
api.include_router(ros.router, prefix=API_PREFIX)
api.include_router(search.router, prefix=API_PREFIX)
api.include_router(stats.router, prefix=API_PREFIX)
api.include_router(meta_router.router, prefix=API_PREFIX)


@api.get(f"{API_PREFIX}/health")
def health() -> dict[str, bool]:
    """Simple health check endpoint."""
    return {"ok": True}
