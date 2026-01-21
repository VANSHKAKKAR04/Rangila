-- Add Razorpay payment fields to orders table
-- Run this SQL script directly in your PostgreSQL database

-- Add payment_method column (with default for existing rows)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
UPDATE orders SET payment_method = 'cod' WHERE payment_method IS NULL;
ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'cod';
ALTER TABLE orders ALTER COLUMN payment_method SET NOT NULL;

-- Add razorpay_order_id column (nullable, can be unique)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);

-- Add unique constraint if needed (optional - only if you want it unique)
-- ALTER TABLE orders ADD CONSTRAINT unique_razorpay_order_id UNIQUE (razorpay_order_id);

-- Add razorpay_payment_id column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);

-- Add razorpay_signature column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(500);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON orders(razorpay_payment_id);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' 
AND column_name IN ('payment_method', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature');
