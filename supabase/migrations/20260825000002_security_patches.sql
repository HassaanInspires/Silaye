-- ============================================================================
-- Supabase / PostgreSQL Migration: Security Patches, RLS Lockdown & Zero-Trust RPC
-- Migration: 20260825000002_security_patches.sql
-- Description:
--   1. Replace cascading customer deletes with RESTRICT on financial/order history.
--   2. Enforce strict cross-tenant authorization, search_path isolation,
--      row-level tenant locking, and positive amount guards in append_khata_transaction RPC.
--   3. Lockdown Row Level Security (RLS) across all tables to auth.uid() (shop_id = auth.uid()).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FOREIGN KEY INTEGRITY: RESTRICT ON DELETE FOR CUSTOMER FOREIGN KEYS
-- ----------------------------------------------------------------------------
-- Drop existing cascading constraints if present and recreate with ON DELETE RESTRICT
DO $$
BEGIN
    -- Drop garment_orders customer_id FK if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'garment_orders_customer_id_fkey'
          AND table_name = 'garment_orders'
    ) THEN
        ALTER TABLE garment_orders DROP CONSTRAINT garment_orders_customer_id_fkey;
    END IF;

    -- Drop khata_transactions customer_id FK if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'khata_transactions_customer_id_fkey'
          AND table_name = 'khata_transactions'
    ) THEN
        ALTER TABLE khata_transactions DROP CONSTRAINT khata_transactions_customer_id_fkey;
    END IF;
END $$;

-- Recreate foreign keys with ON DELETE RESTRICT (preventing accidental deletion of financial history)
ALTER TABLE garment_orders
    ADD CONSTRAINT garment_orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

ALTER TABLE khata_transactions
    ADD CONSTRAINT khata_transactions_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

-- ----------------------------------------------------------------------------
-- 2. ZERO-TRUST & CROSS-TENANT AUTHORIZED ATOMIC KHATA RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION append_khata_transaction(
    p_shop_id UUID,
    p_customer_id UUID,
    p_order_id UUID DEFAULT NULL,
    p_type VARCHAR(50) DEFAULT 'MANUAL_CREDIT',
    p_amount NUMERIC(12, 2) DEFAULT 0.00,
    p_payment_method VARCHAR(50) DEFAULT 'CASH',
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS SETOF khata_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance NUMERIC(12, 2);
    v_delta NUMERIC(12, 2);
    v_new_balance NUMERIC(12, 2);
    v_ret khata_transactions;
BEGIN
    -- 1. Strict Caller Authorization Guard: Verify caller session matches target shop
    -- (auth.uid() is provided by Supabase JWT in authenticated execution context)
    IF auth.uid() IS NOT NULL AND p_shop_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Caller shop_id does not match authenticated user session';
    END IF;

    -- 2. Strict Math Exploit Guard: Amount must be strictly greater than zero
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    -- 3. Strict Row-Level Tenant Locking: Lock customer row scoped to authenticated shop
    IF auth.uid() IS NOT NULL THEN
        SELECT khata_balance INTO v_current_balance
        FROM customers
        WHERE id = p_customer_id AND shop_id = auth.uid()
        FOR UPDATE;
    ELSE
        SELECT khata_balance INTO v_current_balance
        FROM customers
        WHERE id = p_customer_id AND shop_id = p_shop_id
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer with ID % not found for shop %', p_customer_id, p_shop_id;
    END IF;

    -- Fallback for NULL balance
    v_current_balance := COALESCE(v_current_balance, 0.00);

    -- 4. Server-side math operator determination based on transaction type
    -- Positive khata_balance = Customer owes shop (Udhaar / Debt)
    -- Negative khata_balance = Advance credit held
    IF p_type = 'MANUAL_DEBIT' THEN
        -- Debit increases customer debt (positive delta)
        v_delta := p_amount;
    ELSIF p_type IN ('ORDER_ADVANCE', 'ORDER_FINAL_PAYMENT', 'MANUAL_CREDIT', 'DISCOUNT_ADJUSTMENT') THEN
        -- Credit / Payment / Discount reduces customer debt (negative delta)
        v_delta := -p_amount;
    ELSE
        RAISE EXCEPTION 'Invalid transaction type: %', p_type;
    END IF;

    -- 5. Calculate authoritative new balance
    v_new_balance := v_current_balance + v_delta;

    -- 6. Insert into immutable khata_transactions ledger
    INSERT INTO khata_transactions (
        shop_id,
        customer_id,
        order_id,
        type,
        amount,
        previous_balance,
        new_balance,
        payment_method,
        notes,
        created_by,
        created_at
    ) VALUES (
        p_shop_id,
        p_customer_id,
        p_order_id,
        p_type,
        p_amount,
        v_current_balance,
        v_new_balance,
        COALESCE(p_payment_method, 'CASH'),
        p_notes,
        p_created_by,
        NOW()
    )
    RETURNING * INTO v_ret;

    -- 7. Atomically update customer current khata_balance
    UPDATE customers
    SET
        khata_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_customer_id;

    -- 8. Return the newly created ledger transaction record
    RETURN NEXT v_ret;
    RETURN;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) LOCKDOWN TO auth.uid()
-- ----------------------------------------------------------------------------
-- Ensure RLS is enabled on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE garment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE khata_transactions ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive beta policies
DROP POLICY IF EXISTS "Permissive customer access by shop" ON customers;
DROP POLICY IF EXISTS "Permissive measurement profile access by shop" ON measurement_profiles;
DROP POLICY IF EXISTS "Permissive garment orders access by shop" ON garment_orders;
DROP POLICY IF EXISTS "Permissive khata transactions access by shop" ON khata_transactions;

-- Drop strict policies if they already exist to ensure idempotent migrations
DROP POLICY IF EXISTS "Strict shop isolation for customers" ON customers;
DROP POLICY IF EXISTS "Strict shop isolation for measurement_profiles" ON measurement_profiles;
DROP POLICY IF EXISTS "Strict shop isolation for garment_orders" ON garment_orders;
DROP POLICY IF EXISTS "Strict shop isolation for khata_transactions" ON khata_transactions;

-- Create strict tenant isolation policies tied to auth.uid()
CREATE POLICY "Strict shop isolation for customers" ON customers
    FOR ALL
    USING (shop_id = auth.uid())
    WITH CHECK (shop_id = auth.uid());

CREATE POLICY "Strict shop isolation for measurement_profiles" ON measurement_profiles
    FOR ALL
    USING (shop_id = auth.uid())
    WITH CHECK (shop_id = auth.uid());

CREATE POLICY "Strict shop isolation for garment_orders" ON garment_orders
    FOR ALL
    USING (shop_id = auth.uid())
    WITH CHECK (shop_id = auth.uid());

CREATE POLICY "Strict shop isolation for khata_transactions" ON khata_transactions
    FOR ALL
    USING (shop_id = auth.uid())
    WITH CHECK (shop_id = auth.uid());
