-- ============================================================================
-- Supabase / PostgreSQL Migration: RPC Security Hotfix (NULL Bypass Fix)
-- Migration: 20260825000003_rpc_auth_patch.sql
-- Description:
--   1. Create shop_members table foundation if not yet created.
--   2. Replace append_khata_transaction RPC function to eliminate the NULL session
--      bypass exploit under SECURITY DEFINER.
--   3. Reconcile caller authorization with shop_members table membership lookup.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SHOP MEMBERS TABLE FOUNDATION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'OWNER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_member UNIQUE (shop_id, user_id),
    CONSTRAINT valid_shop_member_role CHECK (
        role IN ('OWNER', 'STAFF', 'MANAGER', 'CUTTING_MASTER', 'STITCHER', 'PRESSMAN', 'COUNTER_CLERK')
    )
);

CREATE INDEX IF NOT EXISTS idx_shop_members_lookup ON shop_members(shop_id, user_id);
CREATE INDEX IF NOT EXISTS idx_shop_members_user_id ON shop_members(user_id);

-- ----------------------------------------------------------------------------
-- 2. HARDENED ATOMIC KHATA RPC WITH SHOP MEMBERSHIP AUTHORIZATION
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
    -- 1. Strict Caller Authorization Guard: Verify caller session & shop membership
    -- Eliminates NULL auth.uid() bypass exploit in SECURITY DEFINER context
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM shop_members 
        WHERE shop_members.shop_id = p_shop_id 
        AND shop_members.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not a verified member of this shop';
    END IF;

    -- 2. Strict Math Exploit Guard: Amount must be strictly greater than zero
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    -- 3. Strict Row-Level Tenant Locking: Lock customer row scoped to target shop
    SELECT khata_balance INTO v_current_balance
    FROM customers
    WHERE id = p_customer_id AND shop_id = p_shop_id
    FOR UPDATE;

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
        COALESCE(p_created_by, auth.uid()),
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
