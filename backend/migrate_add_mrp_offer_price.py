"""
Migration script to add MRP and Offer Price columns to products table.
"""
from sqlalchemy import text
from app.db.session import engine

def migrate():
    """Add MRP and Offer Price columns if they don't exist."""
    with engine.connect() as connection:
        try:
            # Check if columns exist and add them if they don't
            connection.execute(text("""
                ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp NUMERIC(10, 2);
            """))
            
            connection.execute(text("""
                ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_price NUMERIC(10, 2);
            """))
            
            connection.commit()
            print("✅ Migration successful! Added mrp and offer_price columns to products table.")
        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            connection.rollback()
            raise

if __name__ == "__main__":
    migrate()
