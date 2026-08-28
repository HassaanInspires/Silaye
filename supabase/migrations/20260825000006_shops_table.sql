-- ============================================================================
-- Supabase / PostgreSQL Migration: Workshop Identity & Shops Table
-- Migration: 20260825000006_shops_table.sql
-- Description:
--   1. Create shops table for workshop settings, contact numbers, address, NTN,
--      and thermal/WhatsApp receipt branding header & footer.
--   2. Enable RLS on shops with member SELECT and owner UPDATE policies.
--   3. Attach update_updated_at_column trigger to shops table.
--   4. Update handle_new_user_shop_member() trigger function to provision
--      default shops record prior to creating shop_members entry.
--   5. Backfill existing shops for all current shop_members.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: SHOPS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT 'Bespoke Tailors',
    phone VARCHAR(32),
    secondary_phone VARCHAR(32),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Wah Cantt',
    ntn_number VARCHAR(64),
    receipt_header TEXT,
    receipt_footer TEXT DEFAULT 'Thank you for your business / آپ کے اعتماد کا شکریہ',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on shops id
CREATE INDEX IF NOT EXISTS idx_shops_id ON public.shops(id);

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS trg_shops_updated_at ON public.shops;
CREATE TRIGGER trg_shops_updated_at
    BEFORE UPDATE ON public.shops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) ON SHOPS
-- ----------------------------------------------------------------------------
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop members can view their shop" ON public.shops;
CREATE POLICY "Shop members can view their shop" ON public.shops
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = shops.id
              AND sm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Shop owners can update their shop" ON public.shops;
CREATE POLICY "Shop owners can update their shop" ON public.shops
    FOR UPDATE
    USING (public.is_shop_owner(id))
    WITH CHECK (public.is_shop_owner(id));

DROP POLICY IF EXISTS "Authenticated users can insert shop" ON public.shops;
CREATE POLICY "Authenticated users can insert shop" ON public.shops
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 3. UPDATED USER PROVISIONING TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_shop_member()
RETURNS TRIGGER AS $$
DECLARE
    v_shop_id UUID;
    v_shop_name TEXT;
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

    v_shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Bespoke Tailors');

    -- 1. Ensure a default shops record exists FIRST
    INSERT INTO public.shops (id, name)
    VALUES (v_shop_id, v_shop_name)
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert new user into shop_members as OWNER
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
            EXECUTE FUNCTION public.handle_new_user_shop_member();
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. BACKFILL EXISTING SHOPS FROM SHOP_MEMBERS
-- ----------------------------------------------------------------------------
INSERT INTO public.shops (id, name)
SELECT DISTINCT shop_id, 'Bespoke Tailors'
FROM public.shop_members
ON CONFLICT (id) DO NOTHING;
