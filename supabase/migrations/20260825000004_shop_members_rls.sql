-- ============================================================================
-- Supabase / PostgreSQL Migration: Future-Proof Multi-Tenant RLS via shop_members
-- Migration: 20260825000004_shop_members_rls.sql
-- Description:
--   1. Create shop_members table with role-based tenancy support.
--   2. Upgrade RLS policies across customers, measurement_profiles, garment_orders,
--      and khata_transactions to use shop_members membership checks (EXISTS).
--   3. Create automatic trigger on auth.users to auto-provision registering users
--      into shop_members as 'OWNER'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: SHOP_MEMBERS
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
CREATE INDEX IF NOT EXISTS idx_shop_members_shop_id ON shop_members(shop_id);

-- Enable RLS on shop_members
ALTER TABLE shop_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop members can view their own memberships" ON shop_members;
CREATE POLICY "Shop members can view their own memberships" ON shop_members
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Shop owners can manage memberships" ON shop_members;
CREATE POLICY "Shop owners can manage memberships" ON shop_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shop_members sm
            WHERE sm.shop_id = shop_members.shop_id
              AND sm.user_id = auth.uid()
              AND sm.role = 'OWNER'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shop_members sm
            WHERE sm.shop_id = shop_members.shop_id
              AND sm.user_id = auth.uid()
              AND sm.role = 'OWNER'
        )
    );

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) UPGRADE TO shop_members MEMBERSHIP
-- ----------------------------------------------------------------------------

-- A. CUSTOMERS
DROP POLICY IF EXISTS "Strict shop isolation for customers" ON customers;
DROP POLICY IF EXISTS "Shop member access for customers" ON customers;

CREATE POLICY "Shop member access for customers" ON customers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = customers.shop_id
              AND shop_members.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = customers.shop_id
              AND shop_members.user_id = auth.uid()
        )
    );

-- B. MEASUREMENT_PROFILES
DROP POLICY IF EXISTS "Strict shop isolation for measurement_profiles" ON measurement_profiles;
DROP POLICY IF EXISTS "Shop member access for measurement_profiles" ON measurement_profiles;

CREATE POLICY "Shop member access for measurement_profiles" ON measurement_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = measurement_profiles.shop_id
              AND shop_members.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = measurement_profiles.shop_id
              AND shop_members.user_id = auth.uid()
        )
    );

-- C. GARMENT_ORDERS
DROP POLICY IF EXISTS "Strict shop isolation for garment_orders" ON garment_orders;
DROP POLICY IF EXISTS "Shop member access for garment_orders" ON garment_orders;

CREATE POLICY "Shop member access for garment_orders" ON garment_orders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = garment_orders.shop_id
              AND shop_members.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = garment_orders.shop_id
              AND shop_members.user_id = auth.uid()
        )
    );

-- D. KHATA_TRANSACTIONS
DROP POLICY IF EXISTS "Strict shop isolation for khata_transactions" ON khata_transactions;
DROP POLICY IF EXISTS "Shop member access for khata_transactions" ON khata_transactions;

CREATE POLICY "Shop member access for khata_transactions" ON khata_transactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = khata_transactions.shop_id
              AND shop_members.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = khata_transactions.shop_id
              AND shop_members.user_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- 3. AUTOMATED USER PROVISIONING TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user_shop_member()
RETURNS TRIGGER AS $$
DECLARE
    v_shop_id UUID;
BEGIN
    -- Extract shop_id from user metadata if provided, otherwise default to user's UID as primary shop
    IF NEW.raw_user_meta_data->>'shop_id' IS NOT NULL THEN
        BEGIN
            v_shop_id := (NEW.raw_user_meta_data->>'shop_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_shop_id := NEW.id;
        END;
    ELSE
        v_shop_id := NEW.id;
    END IF;

    -- Insert new user into shop_members as OWNER
    INSERT INTO public.shop_members (shop_id, user_id, role)
    VALUES (v_shop_id, NEW.id, 'OWNER')
    ON CONFLICT (shop_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to auth.users if auth schema is accessible
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
        CREATE TRIGGER trg_on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION handle_new_user_shop_member();

        -- Backfill any existing users into shop_members as OWNER
        INSERT INTO public.shop_members (shop_id, user_id, role)
        SELECT id, id, 'OWNER'
        FROM auth.users
        ON CONFLICT (shop_id, user_id) DO NOTHING;
    END IF;
END $$;
