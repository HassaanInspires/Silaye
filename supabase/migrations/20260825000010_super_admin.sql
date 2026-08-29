-- ============================================================================
-- Supabase / PostgreSQL Migration: Founder Super Admin & Platform Command Center
-- Migration: 20260825000010_super_admin.sql
-- Description:
--   1. Add status column to public.shops table with check constraint.
--   2. Create public.system_admins table for super admin user assignment.
--   3. Create STABLE helper public.is_super_admin() with SECURITY DEFINER.
--   4. Enable RLS on system_admins (super admin access only).
--   5. Create get_platform_metrics() RPC for platform-wide metrics aggregation.
--   6. Create get_all_shops_admin() RPC with distinct join counts.
--   7. Create set_shop_status_admin(p_shop_id, p_status) RPC.
--   8. Bootstrap initial founder super admin from auth.users.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND SHOPS TABLE: STATUS COLUMN & CONSTRAINT
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'shops' 
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.shops 
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'shops' 
          AND constraint_name = 'check_valid_shop_status'
    ) THEN
        ALTER TABLE public.shops 
        ADD CONSTRAINT check_valid_shop_status 
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED'));
    END IF;
END $$;

-- Index on shops status
CREATE INDEX IF NOT EXISTS idx_shops_status ON public.shops(status);

-- ----------------------------------------------------------------------------
-- 2. TABLE: SYSTEM_ADMINS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_system_admin UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_system_admins_user_id ON public.system_admins(user_id);

-- ----------------------------------------------------------------------------
-- 3. HELPER FUNCTION: is_super_admin()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.system_admins
        WHERE user_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) ON SYSTEM_ADMINS
-- ----------------------------------------------------------------------------
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view system_admins" ON public.system_admins;
CREATE POLICY "Super admins can view system_admins" ON public.system_admins
    FOR SELECT
    USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can modify system_admins" ON public.system_admins;
CREATE POLICY "Super admins can modify system_admins" ON public.system_admins
    FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- 5. RPC: get_platform_metrics()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS TABLE (
    total_shops BIGINT,
    active_shops BIGINT,
    suspended_shops BIGINT,
    total_users BIGINT,
    total_orders BIGINT,
    total_khata_volume NUMERIC(12, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super admin privileges required';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::BIGINT FROM public.shops) AS total_shops,
        (SELECT COUNT(*)::BIGINT FROM public.shops WHERE status = 'ACTIVE') AS active_shops,
        (SELECT COUNT(*)::BIGINT FROM public.shops WHERE status = 'SUSPENDED') AS suspended_shops,
        (
            SELECT COUNT(DISTINCT user_id)::BIGINT FROM public.shop_members
        ) AS total_users,
        (SELECT COUNT(*)::BIGINT FROM public.garment_orders) AS total_orders,
        COALESCE(
            (SELECT SUM(khata_balance) FROM public.customers WHERE khata_balance > 0),
            0.00
        )::NUMERIC(12, 2) AS total_khata_volume;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_metrics() TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. RPC: get_all_shops_admin()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_shops_admin()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    city VARCHAR,
    phone VARCHAR,
    status VARCHAR,
    owner_email VARCHAR,
    total_orders BIGINT,
    member_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super admin privileges required';
    END IF;

    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.city,
        s.phone,
        s.status,
        (
            SELECT u.email::VARCHAR
            FROM public.shop_members sm_owner
            JOIN auth.users u ON sm_owner.user_id = u.id
            WHERE sm_owner.shop_id = s.id
              AND sm_owner.role = 'OWNER'
            ORDER BY sm_owner.created_at ASC
            LIMIT 1
        ) AS owner_email,
        COUNT(DISTINCT go.id)::BIGINT AS total_orders,
        COUNT(DISTINCT sm.id)::BIGINT AS member_count,
        s.created_at,
        s.updated_at
    FROM public.shops s
    LEFT JOIN public.garment_orders go ON s.id = go.shop_id
    LEFT JOIN public.shop_members sm ON s.id = sm.shop_id
    GROUP BY s.id, s.name, s.city, s.phone, s.status, s.created_at, s.updated_at
    ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_shops_admin() TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPC: set_shop_status_admin()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_shop_status_admin(
    p_shop_id UUID,
    p_status VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super admin privileges required';
    END IF;

    IF p_status NOT IN ('ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED') THEN
        RAISE EXCEPTION 'Invalid shop status: %', p_status;
    END IF;

    UPDATE public.shops
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_shop_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shop with id % not found', p_shop_id;
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_shop_status_admin(UUID, VARCHAR) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. FOUNDER BOOTSTRAP
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        INSERT INTO public.system_admins (user_id)
        SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;
