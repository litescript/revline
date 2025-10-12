from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, customers, vehicles, ros, search
from app.routers import stats

app = FastAPI(title="Revline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(vehicles.router,  prefix="/api/v1")
app.include_router(ros.router,       prefix="/api/v1")
app.include_router(search.router,    prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")

@app.get("/api/v1/health")
def health():
    return {"ok": True}
