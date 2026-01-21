-- Add payment_method column to orders table
-- Run this in psql connected to the rangila database

-- Step 1: Add the column (nullable first)
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50);

-- Step 2: Set default value for existing rows
UPDATE orders SET payment_method = 'cod' WHERE payment_method IS NULL;

-- Step 3: Set default for future rows
ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'cod';

-- Step 4: Make it NOT NULL (now that all rows have values)
ALTER TABLE orders ALTER COLUMN payment_method SET NOT NULL;

-- Verify it was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' 
AND column_name = 'payment_method';
