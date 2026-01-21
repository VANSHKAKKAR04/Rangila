"""
Script to fix the order status column length in the database.
This alters the column to allow longer status values like "out_for_delivery".
"""
from sqlalchemy import text
from app.db.session import engine


def fix_status_column():
    """Alter the orders.status column to VARCHAR(20) to accommodate longer status values."""
    with engine.connect() as conn:
        try:
            # Alter the column type
            conn.execute(text("ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(20)"))
            conn.commit()
            print("✅ Successfully updated orders.status column to VARCHAR(20)")
        except Exception as e:
            print(f"❌ Error updating column: {e}")
            conn.rollback()
            raise


if __name__ == "__main__":
    print("Fixing orders.status column length...")
    fix_status_column()
    print("Done!")
