-- ============================================================================
-- Supabase / PostgreSQL Migration: Super Admin Approvals & Promotional Trial Campaign Engine
-- Migration: 20260825000015_admin_approvals_and_trials.sql
-- Description:
--   1. Create public.approve_manual_subscription(p_request_id UUID, p_admin_notes TEXT) RPC
--      with row-locking (FOR UPDATE) and atomic shop tier upgrade.
--   2. Create public.reject_manual_subscription(p_request_id UUID, p_rejection_reason TEXT) RPC.
--   3. Create public.grant_promotional_trial(p_shop_id UUID, p_plan_tier VARCHAR, p_days INT, p_custom_date TIMESTAMPTZ) RPC
--      with type-safe interval math.
--   4. Grant EXECUTE on all 3 functions to authenticated users.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RPC: approve_manual_subscription
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_manual_subscription(
    p_request_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_duration INTERVAL;
BEGIN
    -- 1. Verify caller has Super Admin privileges
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super admin privileges required';
    END IF;

    -- 2. Fetch and lock pending payment request row
    SELECT id, shop_id, plan_tier, billing_cycle, status
    INTO v_request
    FROM public.manual_payment_requests
    WHERE id = p_request_id AND status = 'PENDING'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending payment request with id % not found or already processed', p_request_id;
    END IF;

    -- 3. Determine billing duration interval
    IF v_request.billing_cycle = 'ANNUAL' THEN
        v_duration := INTERVAL '365 days';
    ELSE
        v_duration := INTERVAL '30 days';
    END IF;

    -- 4. Update manual_payment_requests table
    UPDATE public.manual_payment_requests
    SET status = 'APPROVED',
        reviewed_at = NOW(),
        reviewed_by = auth.uid(),
        admin_notes = p_admin_notes
    WHERE id = p_request_id;

    -- 5. Update target workshop subscription status and tier
    UPDATE public.shops
    SET plan_tier = v_request.plan_tier,
        billing_cycle = v_request.billing_cycle,
        subscription_status = 'ACTIVE',
        current_period_start = NOW(),
        current_period_end = NOW() + v_duration,
        updated_at = NOW()
    WHERE id = v_request.shop_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_manual_subscription(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. RPC: reject_manual_subscription
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_manual_subscription(
    p_request_id UUID,
    p_rejection_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_exists BOOLEAN;
BEGIN
    -- 1. Verify caller has Super Admin privileges
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super admin privileges required';
    END IF;

    -- 2. Check pending request existence
    SELECT EXISTS (
        SELECT 1 FROM public.manual_payment_requests
        WHERE id = p_request_id AND status = 'PENDING'
    ) INTO v_request_exists;

    IF NOT v_request_exists THEN
        RAISE EXCEPTION 'Pending payment request with id % not found or already processed', p_request_id;
    END IF;

    -- 3. Update manual_payment_requests table
    UPDATE public.manual_payment_requests
    SET status = 'REJECTED',
        reviewed_at = NOW(),
        reviewed_by = auth.uid(),
        admin_notes = p_rejection_reason
    WHERE id = p_request_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_manual_subscription(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. RPC: grant_promotional_trial
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_promotional_trial(
    p_shop_id UUID,
    p_plan_tier VARCHAR DEFAULT 'PRO',
    p_days INT DEFAULT 14,
    p_custom_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_end TIMESTAMPTZ;
    v_tier VARCHAR(20);
BEGIN
    -- 1. Verify caller has Super Admin privileges
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super admin privileges required';
    END IF;

    -- 2. Validate plan tier
    v_tier := COALESCE(NULLIF(p_plan_tier, ''), 'PRO');
    IF v_tier NOT IN ('PRO', 'ENTERPRISE') THEN
        RAISE EXCEPTION 'Invalid trial plan tier: %. Must be PRO or ENTERPRISE', v_tier;
    END IF;

    -- 3. Determine target trial end timestamp
    IF p_custom_date IS NOT NULL THEN
        v_target_end := p_custom_date;
    ELSE
        v_target_end := NOW() + (COALESCE(p_days, 14) * INTERVAL '1 day');
    END IF;

    -- 4. Update target workshop subscription status and tier
    UPDATE public.shops
    SET plan_tier = v_tier,
        subscription_status = 'TRIALING',
        current_period_start = NOW(),
        current_period_end = v_target_end,
        status = 'ACTIVE',
        updated_at = NOW()
    WHERE id = p_shop_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shop with id % not found', p_shop_id;
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_promotional_trial(UUID, VARCHAR, INT, TIMESTAMPTZ) TO authenticated;
