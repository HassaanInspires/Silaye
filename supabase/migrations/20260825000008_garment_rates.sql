-- ============================================================================
-- Supabase / PostgreSQL Migration: Garment Catalog & Default Stitching Rates
-- Migration: 20260825000008_garment_rates.sql
-- Description:
--   1. Create garment_rates table for workshop pricing matrix, urgent surcharges,
--      and delivery day timelines per garment category.
--   2. Mathematical integrity CHECK constraints (positive rates, valid standard/urgent days).
--   3. Enable RLS with member SELECT and owner INSERT/UPDATE/DELETE policies.
--   4. Attach update_updated_at_column trigger.
--   5. Create seed_default_garment_rates() and reset_default_garment_rates() functions.
--   6. Update handle_new_user_shop_member() trigger to auto-seed rates on shop creation.
--   7. Backfill default garment rates for all existing shops.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: GARMENT_RATES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.garment_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    garment_type VARCHAR(50) NOT NULL,
    base_stitching_rate NUMERIC(10, 2) NOT NULL DEFAULT 1500.00,
    urgent_surcharge NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    standard_delivery_days INT NOT NULL DEFAULT 7,
    urgent_delivery_days INT NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_garment_rate UNIQUE (shop_id, garment_type),
    CONSTRAINT check_positive_stitching_rate CHECK (base_stitching_rate >= 0.00),
    CONSTRAINT check_positive_urgent_surcharge CHECK (urgent_surcharge >= 0.00),
    CONSTRAINT check_valid_standard_days CHECK (standard_delivery_days > 0),
    CONSTRAINT check_valid_urgent_days CHECK (urgent_delivery_days > 0 AND urgent_delivery_days <= standard_delivery_days)
);

-- Index on (shop_id, garment_type) and shop_id
CREATE INDEX IF NOT EXISTS idx_garment_rates_shop_type ON public.garment_rates(shop_id, garment_type);
CREATE INDEX IF NOT EXISTS idx_garment_rates_shop_id ON public.garment_rates(shop_id);

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS trg_garment_rates_updated_at ON public.garment_rates;
CREATE TRIGGER trg_garment_rates_updated_at
    BEFORE UPDATE ON public.garment_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) ON GARMENT_RATES
-- ----------------------------------------------------------------------------
ALTER TABLE public.garment_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop members can view garment rates" ON public.garment_rates;
CREATE POLICY "Shop members can view garment rates" ON public.garment_rates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = garment_rates.shop_id
              AND sm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Shop owners can insert garment rates" ON public.garment_rates;
CREATE POLICY "Shop owners can insert garment rates" ON public.garment_rates
    FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Shop owners can update garment rates" ON public.garment_rates;
CREATE POLICY "Shop owners can update garment rates" ON public.garment_rates
    FOR UPDATE
    USING (public.is_shop_owner(shop_id))
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Shop owners can delete garment rates" ON public.garment_rates;
CREATE POLICY "Shop owners can delete garment rates" ON public.garment_rates
    FOR DELETE
    USING (public.is_shop_owner(shop_id));

-- ----------------------------------------------------------------------------
-- 3. SEEDING & RESET FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function: Seed default rates if not already present
CREATE OR REPLACE FUNCTION public.seed_default_garment_rates(p_shop_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.garment_rates (
        shop_id,
        garment_type,
        base_stitching_rate,
        urgent_surcharge,
        standard_delivery_days,
        urgent_delivery_days,
        is_active
    )
    VALUES
        (p_shop_id, 'MEN_SHALWAR_KAMEEZ', 1800.00, 500.00, 7, 3, TRUE),
        (p_shop_id, 'MEN_KURTA',          1400.00, 400.00, 7, 3, TRUE),
        (p_shop_id, 'WAISTCOAT',          2200.00, 700.00, 8, 4, TRUE),
        (p_shop_id, 'PRINCE_SUIT',        6500.00, 1500.00, 12, 5, TRUE),
        (p_shop_id, 'TROUSER_SHIRT',      1600.00, 500.00, 7, 3, TRUE),
        (p_shop_id, 'WOMEN_SUIT',         2000.00, 600.00, 7, 3, TRUE)
    ON CONFLICT (shop_id, garment_type) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_garment_rates(UUID) TO authenticated;

-- Function: Reset default rates back to recommended market standards (Shop Owner Only)
CREATE OR REPLACE FUNCTION public.reset_default_garment_rates(p_shop_id UUID)
RETURNS TABLE (
    id UUID,
    shop_id UUID,
    garment_type VARCHAR,
    base_stitching_rate NUMERIC,
    urgent_surcharge NUMERIC,
    standard_delivery_days INT,
    urgent_delivery_days INT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is a verified owner of this shop
    IF auth.uid() IS NULL OR NOT public.is_shop_owner(p_shop_id) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not a verified owner of this shop';
    END IF;

    -- Upsert standard recommended market rates
    INSERT INTO public.garment_rates (
        shop_id,
        garment_type,
        base_stitching_rate,
        urgent_surcharge,
        standard_delivery_days,
        urgent_delivery_days,
        is_active
    )
    VALUES
        (p_shop_id, 'MEN_SHALWAR_KAMEEZ', 1800.00, 500.00, 7, 3, TRUE),
        (p_shop_id, 'MEN_KURTA',          1400.00, 400.00, 7, 3, TRUE),
        (p_shop_id, 'WAISTCOAT',          2200.00, 700.00, 8, 4, TRUE),
        (p_shop_id, 'PRINCE_SUIT',        6500.00, 1500.00, 12, 5, TRUE),
        (p_shop_id, 'TROUSER_SHIRT',      1600.00, 500.00, 7, 3, TRUE),
        (p_shop_id, 'WOMEN_SUIT',         2000.00, 600.00, 7, 3, TRUE)
    ON CONFLICT (shop_id, garment_type) 
    DO UPDATE SET
        base_stitching_rate = EXCLUDED.base_stitching_rate,
        urgent_surcharge = EXCLUDED.urgent_surcharge,
        standard_delivery_days = EXCLUDED.standard_delivery_days,
        urgent_delivery_days = EXCLUDED.urgent_delivery_days,
        is_active = TRUE,
        updated_at = NOW();

    RETURN QUERY
    SELECT 
        gr.id,
        gr.shop_id,
        gr.garment_type::VARCHAR,
        gr.base_stitching_rate::NUMERIC,
        gr.urgent_surcharge::NUMERIC,
        gr.standard_delivery_days,
        gr.urgent_delivery_days,
        gr.is_active,
        gr.created_at,
        gr.updated_at
    FROM public.garment_rates gr
    WHERE gr.shop_id = p_shop_id
    ORDER BY 
        CASE gr.garment_type
            WHEN 'MEN_SHALWAR_KAMEEZ' THEN 1
            WHEN 'MEN_KURTA' THEN 2
            WHEN 'WAISTCOAT' THEN 3
            WHEN 'PRINCE_SUIT' THEN 4
            WHEN 'TROUSER_SHIRT' THEN 5
            WHEN 'WOMEN_SUIT' THEN 6
            ELSE 7
        END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_default_garment_rates(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. UPDATE USER PROVISIONING TRIGGER TO SEED GARMENT RATES
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

    -- 3. Auto-seed default garment rates for the new shop
    PERFORM public.seed_default_garment_rates(v_shop_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 5. BACKFILL GARMENT RATES FOR ALL EXISTING SHOPS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.shops LOOP
        PERFORM public.seed_default_garment_rates(r.id);
    END LOOP;
END $$;
