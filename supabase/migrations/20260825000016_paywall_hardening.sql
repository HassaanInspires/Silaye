-- ============================================================================
-- Supabase / PostgreSQL Migration: Paywall Enforcer, Quota Wall & Trial Expiration Hardening
-- Migration: 20260825000016_paywall_hardening.sql
-- Description:
--   1. Update public.check_order_creation_allowed(p_shop_id UUID) RPC:
--      - Checks if workshop subscription_status = 'TRIALING' AND current_period_end < NOW().
--      - If trial expired, falls back to effective tier 'FREE' and enforces strict 50 suits/mo limit.
--      - If active ('PRO', 'ENTERPRISE', or active 'TRIALING' with current_period_end >= NOW()), returns TRUE.
--   2. Update public.add_shop_staff_member(p_shop_id UUID, p_email VARCHAR, p_role VARCHAR) RPC:
--      - Verifies caller is shop owner via is_shop_owner(p_shop_id).
--      - Checks effective workshop tier (demoting expired trials to 'FREE').
--      - If effective tier is 'FREE' and workshop already has >= 1 staff member (the owner),
--        rejects adding new members: 'Free tier is limited to 1 craftsman account. Upgrade to Pro to add staff.'
--   3. Grant EXECUTE permissions on both functions to authenticated users.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HARDENED RPC: CHECK ORDER CREATION ALLOWED (TRIAL EXPIRATION FALLBACK)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_order_creation_allowed(p_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_tier VARCHAR(20);
    v_status VARCHAR(30);
    v_period_end TIMESTAMPTZ;
    v_effective_tier VARCHAR(20);
    v_orders_count INT := 0;
BEGIN
    -- Fetch shop tier, subscription status, and period end
    SELECT plan_tier, subscription_status, current_period_end
    INTO v_plan_tier, v_status, v_period_end
    FROM public.shops
    WHERE id = p_shop_id;

    IF NOT FOUND THEN
        v_plan_tier := 'FREE';
        v_status := 'ACTIVE';
    END IF;

    -- If TRIALING and current_period_end is in the past, trial has expired => demote to 'FREE'
    IF v_status = 'TRIALING' AND (v_period_end IS NOT NULL AND v_period_end < NOW()) THEN
        v_effective_tier := 'FREE';
    ELSE
        v_effective_tier := COALESCE(v_plan_tier, 'FREE');
    END IF;

    -- Pro and Enterprise have unlimited order allowances
    IF v_effective_tier IN ('PRO', 'ENTERPRISE') THEN
        RETURN TRUE;
    END IF;

    -- For Free plan: verify current calendar month quota (50 max orders/month)
    SELECT COALESCE(orders_count, 0) INTO v_orders_count
    FROM public.shop_usage
    WHERE shop_id = p_shop_id 
      AND billing_month = DATE_TRUNC('month', CURRENT_DATE)::DATE;

    IF COALESCE(v_orders_count, 0) >= 50 THEN
        RAISE EXCEPTION 'Monthly order quota reached (50/50). Upgrade to Pro for unlimited suits.';
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_order_creation_allowed(UUID) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 2. HARDENED RPC: ADD SHOP STAFF MEMBER (FREE TIER 1-CRAFTSMAN LIMIT)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_shop_staff_member(
    p_shop_id UUID,
    p_email VARCHAR,
    p_role VARCHAR
)
RETURNS TABLE (
    id UUID,
    shop_id UUID,
    user_id UUID,
    role VARCHAR,
    email VARCHAR,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_member_id UUID;
    v_created_at TIMESTAMPTZ;
    v_updated_at TIMESTAMPTZ;
    v_plan_tier VARCHAR(20);
    v_status VARCHAR(30);
    v_period_end TIMESTAMPTZ;
    v_effective_tier VARCHAR(20);
    v_staff_count INT := 0;
BEGIN
    -- Verify caller is a verified OWNER of this shop
    IF auth.uid() IS NULL OR NOT public.is_shop_owner(p_shop_id) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not a verified owner of this shop';
    END IF;

    -- Validate role argument
    IF p_role NOT IN ('OWNER', 'STAFF', 'MANAGER', 'CUTTING_MASTER', 'STITCHER', 'PRESSMAN', 'COUNTER_CLERK') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be a valid ShopMemberRole.', p_role;
    END IF;

    -- Fetch shop tier, subscription status, and period end
    SELECT plan_tier, subscription_status, current_period_end
    INTO v_plan_tier, v_status, v_period_end
    FROM public.shops
    WHERE id = p_shop_id;

    IF NOT FOUND THEN
        v_plan_tier := 'FREE';
        v_status := 'ACTIVE';
    END IF;

    -- Determine effective tier (accounting for expired promotional trial)
    IF v_status = 'TRIALING' AND (v_period_end IS NOT NULL AND v_period_end < NOW()) THEN
        v_effective_tier := 'FREE';
    ELSE
        v_effective_tier := COALESCE(v_plan_tier, 'FREE');
    END IF;

    -- Resolve user ID from auth.users (case-insensitive email matching)
    SELECT u.id INTO v_user_id 
    FROM auth.users u
    WHERE LOWER(u.email) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. The craftsman must register an account first.', p_email;
    END IF;

    -- For FREE tier: enforce 1 craftsman account limit (Owner only)
    IF v_effective_tier = 'FREE' THEN
        SELECT COUNT(*)::INT INTO v_staff_count
        FROM public.shop_members sm
        WHERE sm.shop_id = p_shop_id;

        -- If target user is NOT already a member and staff_count >= 1, reject addition
        IF NOT EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = p_shop_id AND sm.user_id = v_user_id
        ) AND v_staff_count >= 1 THEN
            RAISE EXCEPTION 'Free tier is limited to 1 craftsman account. Upgrade to Pro to add staff.';
        END IF;
    END IF;

    -- Upsert membership
    INSERT INTO public.shop_members (shop_id, user_id, role)
    VALUES (p_shop_id, v_user_id, p_role)
    ON CONFLICT (shop_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
    RETURNING shop_members.id, shop_members.created_at, shop_members.updated_at 
    INTO v_member_id, v_created_at, v_updated_at;

    RETURN QUERY
    SELECT 
        v_member_id,
        p_shop_id,
        v_user_id,
        p_role::VARCHAR,
        p_email::VARCHAR,
        v_created_at,
        v_updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_shop_staff_member(UUID, VARCHAR, VARCHAR) TO authenticated;
