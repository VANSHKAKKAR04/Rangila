-- Add MRP and Offer Price columns to products table

ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_price NUMERIC(10, 2);
