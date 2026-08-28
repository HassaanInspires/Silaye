-- ============================================================================
-- Supabase / PostgreSQL Migration: Staff Management & Role Access Control
-- Migration: 20260825000007_staff_management.sql
-- Description:
--   1. Helper RPC get_shop_members(p_shop_id UUID): Returns staff member details
--      with user email from auth.users for any verified member of the shop.
--   2. Helper RPC add_shop_staff_member(p_shop_id UUID, p_email VARCHAR, p_role VARCHAR):
--      Allows shop owners to invite/assign craftsmen by email with role validation.
--   3. Helper RPC remove_shop_member(p_shop_id UUID, p_member_id UUID):
--      Allows shop owners to remove staff members, guarding against self-removal of OWNER.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HELPER RPC: GET SHOP MEMBERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_shop_members(p_shop_id UUID)
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
BEGIN
    -- Verify caller is an active member of this shop
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.shop_members 
        WHERE shop_members.shop_id = p_shop_id 
          AND shop_members.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not a verified member of this shop';
    END IF;

    RETURN QUERY
    SELECT 
        sm.id,
        sm.shop_id,
        sm.user_id,
        sm.role::VARCHAR,
        u.email::VARCHAR,
        sm.created_at,
        sm.updated_at
    FROM public.shop_members sm
    LEFT JOIN auth.users u ON u.id = sm.user_id
    WHERE sm.shop_id = p_shop_id
    ORDER BY 
        CASE sm.role 
            WHEN 'OWNER' THEN 1 
            WHEN 'MANAGER' THEN 2 
            WHEN 'CUTTING_MASTER' THEN 3 
            WHEN 'STITCHER' THEN 4 
            WHEN 'PRESSMAN' THEN 5 
            WHEN 'COUNTER_CLERK' THEN 6 
            ELSE 7 
        END, 
        sm.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shop_members(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. HELPER RPC: ADD / ASSIGN SHOP STAFF MEMBER
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
BEGIN
    -- Verify caller is a verified OWNER of this shop
    IF auth.uid() IS NULL OR NOT public.is_shop_owner(p_shop_id) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not a verified owner of this shop';
    END IF;

    -- Validate role argument
    IF p_role NOT IN ('OWNER', 'STAFF', 'MANAGER', 'CUTTING_MASTER', 'STITCHER', 'PRESSMAN', 'COUNTER_CLERK') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be a valid ShopMemberRole.', p_role;
    END IF;

    -- Resolve user ID from auth.users (case-insensitive email matching)
    SELECT u.id INTO v_user_id 
    FROM auth.users u
    WHERE LOWER(u.email) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. The craftsman must register an account first.', p_email;
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

-- ----------------------------------------------------------------------------
-- 3. HELPER RPC: REMOVE SHOP MEMBER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_shop_member(
    p_shop_id UUID,
    p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user_id UUID;
    v_target_role VARCHAR;
BEGIN
    -- Verify caller is a verified OWNER of this shop
    IF auth.uid() IS NULL OR NOT public.is_shop_owner(p_shop_id) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not a verified owner of this shop';
    END IF;

    -- Retrieve target membership record
    SELECT sm.user_id, sm.role INTO v_target_user_id, v_target_role
    FROM public.shop_members sm
    WHERE sm.id = p_member_id AND sm.shop_id = p_shop_id;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Shop member not found';
    END IF;

    -- Guard against self-removal of the primary OWNER
    IF v_target_role = 'OWNER' AND v_target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot remove the primary shop owner';
    END IF;

    DELETE FROM public.shop_members
    WHERE id = p_member_id AND shop_id = p_shop_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_shop_member(UUID, UUID) TO authenticated;
