-- ============================================================================
-- Supabase / PostgreSQL Migration: Zero-Trust Lockdown & Production Purification
-- Migration: 20260825000012_production_lockdown.sql
-- Description:
--   1. Create helper RPC purge_shop_test_data(p_shop_id UUID) with SECURITY DEFINER
--   2. Enforce strict authorization: is_super_admin() OR is_shop_owner(p_shop_id)
--   3. Cascade-safe deletion of khata_transactions, garment_orders,
--      measurement_profiles, customers, and reset of shop_usage
--   4. Safely preserve core workshop records: shops, shop_members, garment_rates,
--      and printer_settings
--   5. Grant EXECUTE permissions to authenticated users
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RPC: purge_shop_test_data()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_shop_test_data(p_shop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_orders INT := 0;
    v_deleted_profiles INT := 0;
    v_deleted_khata INT := 0;
    v_deleted_customers INT := 0;
BEGIN
    -- 1. Strict Security Guard: Caller must be a Super Admin OR the Shop Owner
    IF NOT (public.is_super_admin() OR public.is_shop_owner(p_shop_id)) THEN
        RAISE EXCEPTION 'Unauthorized: Only platform super administrators or the shop owner can purge shop test data';
    END IF;

    -- 2. Delete Khata financial ledger transactions (both direct shop and customer referenced)
    WITH deleted_khata AS (
        DELETE FROM public.khata_transactions
        WHERE shop_id = p_shop_id
           OR customer_id IN (SELECT id FROM public.customers WHERE shop_id = p_shop_id)
        RETURNING id
    )
    SELECT COUNT(*)::INT INTO v_deleted_khata FROM deleted_khata;

    -- 3. Delete garment orders for the target shop
    WITH deleted_orders AS (
        DELETE FROM public.garment_orders
        WHERE shop_id = p_shop_id
        RETURNING id
    )
    SELECT COUNT(*)::INT INTO v_deleted_orders FROM deleted_orders;

    -- 4. Delete measurement profiles for the target shop
    WITH deleted_profiles AS (
        DELETE FROM public.measurement_profiles
        WHERE shop_id = p_shop_id
        RETURNING id
    )
    SELECT COUNT(*)::INT INTO v_deleted_profiles FROM deleted_profiles;

    -- 5. Delete customer directory records for the target shop
    WITH deleted_cust AS (
        DELETE FROM public.customers
        WHERE shop_id = p_shop_id
        RETURNING id
    )
    SELECT COUNT(*)::INT INTO v_deleted_customers FROM deleted_cust;

    -- 6. Reset shop_usage quota count for current billing periods
    UPDATE public.shop_usage
    SET orders_count = 0,
        updated_at = NOW()
    WHERE shop_id = p_shop_id;

    -- Core configuration records are explicitly PRESERVED:
    -- - public.shops (preserves shop profile, NTN, branding notes, subscription tier)
    -- - public.shop_members (preserves staff accounts and login associations)
    -- - public.garment_rates (preserves catalog rates and delivery day matrices)
    -- - public.printer_settings (preserves thermal hardware configurations)

    RETURN jsonb_build_object(
        'success', TRUE,
        'shop_id', p_shop_id,
        'deleted_orders', v_deleted_orders,
        'deleted_profiles', v_deleted_profiles,
        'deleted_khata', v_deleted_khata,
        'deleted_customers', v_deleted_customers,
        'purged_at', NOW()
    );
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.purge_shop_test_data(UUID) TO authenticated;
