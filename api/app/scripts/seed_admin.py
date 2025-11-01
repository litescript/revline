from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models.user import User


def main() -> None:
    """Seed a default admin user for dev environments."""
    db: Session = SessionLocal()
    try:
        email = "admin@revline.local"
        existing = db.query(User).filter(User.email == email).first()
        if existing is None:
            user = User(email=email, name="Admin", password_hash=hash_password("admin123"))
            db.add(user)
            db.commit()
            print(f"Seeded admin: {email} (password=admin123)")
        else:
            print("Admin already exists")
    finally:
        db.close()


if __name__ == "__main__":
    main()
