from contextlib import asynccontextmanager
from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore

from app.core.db import Base, engine, SessionLocal
from app.core.seed_meta import seed_meta_if_empty
from app.core.seed_active_ros import seed_active_ros_if_empty
from app.routers import auth, customers, vehicles, ros, search, stats
from app.routers import meta as meta_router

# Ensure models (including meta tables) are registered with Base
import app.models.meta  # noqa: F401


API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist (dev/dev-like environments)
    Base.metadata.create_all(bind=engine)

    # Seed metadata and demo Active ROs if empty
    db = SessionLocal()
    try:
        seed_meta_if_empty(db)
        seed_active_ros_if_empty(db)
    finally:
        db.close()

    yield
    # teardown: nothing yet


app = FastAPI(title="Revline API", lifespan=lifespan)

# CORS (dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers (versioned)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(customers.router, prefix=API_PREFIX)
app.include_router(vehicles.router, prefix=API_PREFIX)
app.include_router(ros.router, prefix=API_PREFIX)
app.include_router(search.router, prefix=API_PREFIX)
app.include_router(stats.router, prefix=API_PREFIX)
app.include_router(meta_router.router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health")
def health():
    return {"ok": True}
