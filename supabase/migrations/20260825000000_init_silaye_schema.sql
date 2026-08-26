-- ============================================================================
-- Supabase / PostgreSQL Schema Migration: Silaye Master Workshop OS
-- Migration: 20260825000000_init_silaye_schema.sql
-- Description: Core schema definition for multi-tenant tailor management,
--              measurement profiles, orders, and append-only Khata ledger.
-- Target DB: PostgreSQL 14+ / Supabase / Neon Serverless
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'garment_type') THEN
        CREATE TYPE garment_type AS ENUM (
            'MEN_SHALWAR_KAMEEZ',
            'MEN_KURTA',
            'WAISTCOAT',
            'PRINCE_SUIT',
            'TROUSER_SHIRT',
            'WOMEN_SUIT'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'BOOKED',
            'FABRIC_RECEIVED',
            'IN_CUTTING',
            'IN_STITCHING',
            'KAJ_BUTTON',
            'PRESSING',
            'READY_FOR_TRIAL',
            'READY_FOR_DELIVERY',
            'COMPLETED',
            'CANCELLED'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'UNPAID',
            'PARTIALLY_PAID',
            'FULLY_PAID'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM (
            'ORDER_ADVANCE',
            'ORDER_FINAL_PAYMENT',
            'MANUAL_CREDIT',
            'MANUAL_DEBIT',
            'DISCOUNT_ADJUSTMENT'
        );
    END IF;
END $$;

-- 3. TABLE: CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    secondary_phone VARCHAR(32),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Wah Cantt',
    khata_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    total_orders_count INT NOT NULL DEFAULT 0,
    total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_customer_phone UNIQUE (shop_id, phone)
);

-- 4. TABLE: MEASUREMENT_PROFILES
CREATE TABLE IF NOT EXISTS measurement_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    profile_name VARCHAR(100) NOT NULL DEFAULT 'Standard Fit',
    garment_type VARCHAR(50) NOT NULL DEFAULT 'MEN_SHALWAR_KAMEEZ',
    measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    style_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLE: GARMENT_ORDERS
CREATE TABLE IF NOT EXISTS garment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    order_number VARCHAR(64) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    measurement_profile_id UUID REFERENCES measurement_profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'BOOKED',
    garment_type VARCHAR(50) NOT NULL DEFAULT 'MEN_SHALWAR_KAMEEZ',
    quantity INT NOT NULL DEFAULT 1,
    
    -- Dates & Deadlines
    booking_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_date DATE,
    delivery_date DATE NOT NULL,
    actual_delivery_date TIMESTAMPTZ,
    
    -- JSONB Structured Specs
    fabric_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot_measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot_styles JSONB NOT NULL DEFAULT '{}'::jsonb,
    pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Fast Flat Query Columns (Mirrored / Indexed)
    stitching_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fabric_charges NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    addons_charges NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    advance_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
    
    -- Workshop Assignments
    assigned_cutter_id UUID,
    assigned_stitcher_id UUID,
    
    -- Tracking & Barcodes
    barcode_token VARCHAR(64),
    public_tracking_key UUID NOT NULL DEFAULT gen_random_uuid(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_order_number UNIQUE (shop_id, order_number)
);

-- 6. TABLE: KHATA_TRANSACTIONS (Append-Only Financial Ledger)
CREATE TABLE IF NOT EXISTS khata_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES garment_orders(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    previous_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    new_balance NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PERFORMANCE & LOOKUP INDEXES
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_secondary_phone ON customers(secondary_phone);
CREATE INDEX IF NOT EXISTS idx_customers_shop_phone ON customers(shop_id, phone);

CREATE INDEX IF NOT EXISTS idx_measurement_profiles_shop_id ON measurement_profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_measurement_profiles_customer_id ON measurement_profiles(customer_id);

CREATE INDEX IF NOT EXISTS idx_garment_orders_shop_id ON garment_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_garment_orders_customer_id ON garment_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_garment_orders_measurement_profile_id ON garment_orders(measurement_profile_id);
CREATE INDEX IF NOT EXISTS idx_garment_orders_status ON garment_orders(status);
CREATE INDEX IF NOT EXISTS idx_garment_orders_shop_status ON garment_orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_garment_orders_order_number ON garment_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_garment_orders_public_tracking_key ON garment_orders(public_tracking_key);
CREATE INDEX IF NOT EXISTS idx_garment_orders_delivery_date ON garment_orders(delivery_date);

CREATE INDEX IF NOT EXISTS idx_khata_transactions_shop_id ON khata_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_khata_transactions_customer_id ON khata_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_khata_transactions_order_id ON khata_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_khata_transactions_created_at ON khata_transactions(created_at DESC);

-- GIN indexes for rapid JSONB query lookups
CREATE INDEX IF NOT EXISTS idx_measurement_profiles_measurements_gin ON measurement_profiles USING GIN (measurements);
CREATE INDEX IF NOT EXISTS idx_garment_orders_snapshot_measurements_gin ON garment_orders USING GIN (snapshot_measurements);
CREATE INDEX IF NOT EXISTS idx_garment_orders_pricing_gin ON garment_orders USING GIN (pricing);

-- 8. AUTOMATIC TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_measurement_profiles_updated_at ON measurement_profiles;
CREATE TRIGGER trg_measurement_profiles_updated_at
    BEFORE UPDATE ON measurement_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_garment_orders_updated_at ON garment_orders;
CREATE TRIGGER trg_garment_orders_updated_at
    BEFORE UPDATE ON garment_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. ROW LEVEL SECURITY (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE garment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE khata_transactions ENABLE ROW LEVEL SECURITY;

-- Initial permissive policies for shop isolation / beta operations
DROP POLICY IF EXISTS "Permissive customer access by shop" ON customers;
CREATE POLICY "Permissive customer access by shop" ON customers
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive measurement profile access by shop" ON measurement_profiles;
CREATE POLICY "Permissive measurement profile access by shop" ON measurement_profiles
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive garment orders access by shop" ON garment_orders;
CREATE POLICY "Permissive garment orders access by shop" ON garment_orders
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive khata transactions access by shop" ON khata_transactions;
CREATE POLICY "Permissive khata transactions access by shop" ON khata_transactions
    FOR ALL USING (true) WITH CHECK (true);
