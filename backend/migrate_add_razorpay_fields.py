"""
Migration script to add Razorpay payment fields to orders table.
Run this after updating the Order model.
"""
from sqlalchemy import text
from app.db.session import engine


def add_razorpay_fields():
    """Add Razorpay payment fields to orders table."""
    with engine.connect() as conn:
        try:
            # Check if columns already exist
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='orders' AND column_name='razorpay_order_id'
            """)
            result = conn.execute(check_query).fetchone()
            
            if result:
                print("✅ Razorpay fields already exist in orders table")
                return
            
            # Add new columns
            print("Adding Razorpay payment fields to orders table...")
            
            # Add razorpay_order_id (unique, indexed)
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255) UNIQUE
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id 
                ON orders(razorpay_order_id)
            """))
            
            # Add razorpay_payment_id (indexed)
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id 
                ON orders(razorpay_payment_id)
            """))
            
            # Add razorpay_signature
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(500)
            """))
            
            # Add payment_method with default value
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cod' NOT NULL
            """))
            
            # Update existing orders to have 'cod' as payment_method
            conn.execute(text("""
                UPDATE orders 
                SET payment_method = 'cod' 
                WHERE payment_method IS NULL
            """))
            
            conn.commit()
            print("✅ Successfully added Razorpay payment fields to orders table")
            
        except Exception as e:
            print(f"❌ Error adding Razorpay fields: {e}")
            conn.rollback()
            raise


if __name__ == "__main__":
    print("Migrating orders table to add Razorpay fields...")
    add_razorpay_fields()
    print("Done!")
