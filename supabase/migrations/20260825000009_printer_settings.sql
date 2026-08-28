-- ============================================================================
-- Supabase / PostgreSQL Migration: Thermal Printer & Hardware Preferences
-- Migration: 20260825000009_printer_settings.sql
-- Description:
--   1. Create printer_settings table for workshop paper roll width, auto-print,
--      barcode/QR toggles, Urdu dual-script label toggles, and line feed controls.
--   2. Integrity CHECK constraints (valid paper width '58mm'|'80mm', feed lines 0-10).
--   3. Enable RLS with member SELECT and owner INSERT/UPDATE/DELETE policies.
--   4. Attach update_updated_at_column trigger.
--   5. Create seed_default_printer_settings() function.
--   6. Update handle_new_user_shop_member() trigger to sequentially seed
--      shops, shop_members, garment rates, and printer settings.
--   7. Backfill default printer settings for all existing shops.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: PRINTER_SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.printer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    paper_width VARCHAR(10) NOT NULL DEFAULT '80mm',
    auto_print_on_booking BOOLEAN NOT NULL DEFAULT FALSE,
    show_barcode BOOLEAN NOT NULL DEFAULT TRUE,
    show_qr_tracking BOOLEAN NOT NULL DEFAULT TRUE,
    show_urdu_labels BOOLEAN NOT NULL DEFAULT TRUE,
    feed_lines INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_printer_settings UNIQUE (shop_id),
    CONSTRAINT check_valid_paper_width CHECK (paper_width IN ('58mm', '80mm')),
    CONSTRAINT check_valid_feed_lines CHECK (feed_lines >= 0 AND feed_lines <= 10)
);

-- Index on shop_id
CREATE INDEX IF NOT EXISTS idx_printer_settings_shop_id ON public.printer_settings(shop_id);

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS trg_printer_settings_updated_at ON public.printer_settings;
CREATE TRIGGER trg_printer_settings_updated_at
    BEFORE UPDATE ON public.printer_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) ON PRINTER_SETTINGS
-- ----------------------------------------------------------------------------
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop members can view printer settings" ON public.printer_settings;
CREATE POLICY "Shop members can view printer settings" ON public.printer_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = printer_settings.shop_id
              AND sm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Shop owners can insert printer settings" ON public.printer_settings;
CREATE POLICY "Shop owners can insert printer settings" ON public.printer_settings
    FOR INSERT
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Shop owners can update printer settings" ON public.printer_settings;
CREATE POLICY "Shop owners can update printer settings" ON public.printer_settings
    FOR UPDATE
    USING (public.is_shop_owner(shop_id))
    WITH CHECK (public.is_shop_owner(shop_id));

DROP POLICY IF EXISTS "Shop owners can delete printer settings" ON public.printer_settings;
CREATE POLICY "Shop owners can delete printer settings" ON public.printer_settings
    FOR DELETE
    USING (public.is_shop_owner(shop_id));

-- ----------------------------------------------------------------------------
-- 3. SEEDING FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_printer_settings(p_shop_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.printer_settings (
        shop_id,
        paper_width,
        auto_print_on_booking,
        show_barcode,
        show_qr_tracking,
        show_urdu_labels,
        feed_lines
    )
    VALUES (
        p_shop_id,
        '80mm',
        FALSE,
        TRUE,
        TRUE,
        TRUE,
        3
    )
    ON CONFLICT (shop_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_printer_settings(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. UNIFIED USER PROVISIONING TRIGGER
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

    -- 4. Auto-seed default printer settings for the new shop
    PERFORM public.seed_default_printer_settings(v_shop_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 5. BACKFILL PRINTER SETTINGS FOR ALL EXISTING SHOPS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.shops LOOP
        PERFORM public.seed_default_printer_settings(r.id);
    END LOOP;
END $$;
