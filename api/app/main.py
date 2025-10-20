from contextlib import asynccontextmanager
from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from app.routers import auth, customers, vehicles, ros, search, stats
from app.routers import meta as meta_router
from app.routers.ros import router as ros_router
from app.core.db import Base, engine, SessionLocal
from app.core.seed_meta import seed_meta_if_empty
from app.models import meta as _  # ensure models are imported so Base knows them


API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1) Ensure tables exist (idempotent)
    Base.metadata.create_all(bind=engine)

    # 2) Seed if empty
    db = SessionLocal()
    try:
        seed_meta_if_empty(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title="Revline API",
    openapi_url="/openapi.json",
    docs_url="/docs",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["set-cookie"],
)

app.include_router(meta_router.router, prefix="/api/v1")

# Mount all routers under one versioned prefix
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
