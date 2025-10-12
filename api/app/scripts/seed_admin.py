from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def main():
    db: Session = SessionLocal()
    try:
        email="admin@revline.local"
        if not db.query(User).filter(User.email==email).first():
            u=User(email=email, name="Admin", password_hash=hash_password("admin123"))
            db.add(u)
            db.commit()
            print("Seeded admin:", email, "password=admin123")
        else:
            print("Admin already exists")
    finally:
        db.close()

if __name__=="__main__":
    main()
