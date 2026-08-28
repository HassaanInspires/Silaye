-- ============================================================================
-- Supabase / PostgreSQL Function Migration: Atomic Khata Transaction (RPC)
-- Migration: 20260825000001_khata_rpc.sql
-- Description: Zero-trust server-side balance calculation with row-level locking.
-- ============================================================================

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
AS $$
DECLARE
    v_current_balance NUMERIC(12, 2);
    v_delta NUMERIC(12, 2);
    v_new_balance NUMERIC(12, 2);
    v_ret khata_transactions;
BEGIN
    -- 1. Lock customer row to prevent concurrent race conditions
    SELECT khata_balance INTO v_current_balance
    FROM customers
    WHERE id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer with ID % not found', p_customer_id;
    END IF;

    -- Fallback for NULL balance
    v_current_balance := COALESCE(v_current_balance, 0.00);

    -- 2. Server-side math operator determination based on transaction type
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

    -- 3. Calculate authoritative new balance
    v_new_balance := v_current_balance + v_delta;

    -- 4. Insert into immutable khata_transactions ledger
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

    -- 5. Atomically update customer current khata_balance
    UPDATE customers
    SET
        khata_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_customer_id;

    -- 6. Return the newly created ledger transaction record
    RETURN NEXT v_ret;
    RETURN;
END;
$$;
