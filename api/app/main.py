from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging early so seed and startup messages appear in docker logs
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(message)s"
)

from app.middleware.security import SecurityHeadersMiddleware
from app.core.db import Base, engine, SessionLocal
from app.core.seed_meta import seed_meta_if_empty
from app.core.seed_active_ros import seed_active_ros_if_empty
from app.core.startup_checks import run_all_startup_checks
from app.routers import auth, customers, vehicles, ros, search, stats
from app.routers import meta as meta_router

import app.models.meta  # noqa: F401  # ensure models registered

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(api: FastAPI):
    """Create tables and seed demo data for dev environments."""
    Base.metadata.create_all(bind=engine)

    # Run startup integrity checks
    run_all_startup_checks()

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

# Security headers (apply first, before CORS)
api.add_middleware(SecurityHeadersMiddleware)

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
