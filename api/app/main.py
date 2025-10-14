from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, customers, vehicles, ros, search, stats

API_PREFIX = "/api/v1"

app = FastAPI(
    title="Revline API",
    openapi_url="/openapi.json",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under one versioned prefix
app.include_router(auth.router,      prefix=API_PREFIX)
app.include_router(customers.router, prefix=API_PREFIX)
app.include_router(vehicles.router,  prefix=API_PREFIX)
app.include_router(ros.router,       prefix=API_PREFIX)
app.include_router(search.router,    prefix=API_PREFIX)
app.include_router(stats.router,     prefix=API_PREFIX)

@app.get(f"{API_PREFIX}/health")
def health():
    return {"ok": True}
