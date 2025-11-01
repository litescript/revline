from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import settings

# create a synchronous SQLAlchemy engine
engine = create_engine(settings.database_url, pool_pre_ping=True)

# factory for database sessions
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    """FastAPI dependency for providing a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
