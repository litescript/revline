from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.customer import Customer
from app.core.seed_helpers import get_or_create_customer

TEST_DATABASE_URL = "sqlite:///:memory:"

def test_get_or_create_customer_idempotent():
    engine = create_engine(TEST_DATABASE_URL, future=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, future=True)
    with Session() as db:
        c1 = get_or_create_customer(db, first_name="Jane", last_name="Doe", email="jane.doe@example.com", phone="555")
        c2 = get_or_create_customer(db, first_name="Jane", last_name="Doe", email="jane.doe@example.com", phone="555")
        assert c1.id == c2.id
