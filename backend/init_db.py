"""
Database initialization script.
Creates all database tables defined in the models.
"""
from app.db.base import Base
from app.db.session import engine
from app.db.models import user, product, cart, order  # Import all models to register them

if __name__ == "__main__":
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")
    print("\nCreated tables:")
    for table_name in Base.metadata.tables.keys():
        print(f"  - {table_name}")
