-- ============================================================================
-- Supabase / PostgreSQL Migration: Subscription Schema & Monthly Usage Quota Engine
-- Migration: 20260825000011_subscription_system.sql
-- Description:
--   1. Extend public.shops table with billing and subscription columns & constraints.
--   2. Create public.shop_usage table for tracking monthly quota consumption.
--   3. Create helper RPC check_order_creation_allowed(p_shop_id UUID) with safe COALESCE.
--   4. Create trigger trg_increment_shop_order_usage on public.garment_orders.
--   5. Enable Row Level Security (RLS) on public.shop_usage.
--   6. Backfill existing usage from garment_orders into shop_usage.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND SHOPS TABLE: SUBSCRIPTION & BILLING COLUMNS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- plan_tier
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'plan_tier'
    ) THEN
        ALTER TABLE public.shops 
        ADD COLUMN plan_tier VARCHAR(20) NOT NULL DEFAULT 'FREE';
    END IF;

    -- billing_cycle
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'billing_cycle'
    ) THEN
        ALTER TABLE public.shops 
        ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'MONTHLY';
    END IF;

    -- subscription_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE public.shops 
        ADD COLUMN subscription_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE';
    END IF;

    -- stripe_customer_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.shops 
        ADD COLUMN stripe_customer_id VARCHAR(255);
    END IF;

    -- stripe_subscription_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE public.shops 
        ADD COLUMN stripe_subscription_id VARCHAR(255);
    END IF;

    -- current_period_start
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'current_period_start'
    ) THEN
        ALTER TABLE public.shops 
        ADD COLUMN current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    -- current_period_end
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'current_period_end'
    ) THEN
        ALTER TABLE public.shops 
        ADD COLUMN current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days');
    END IF;
END $$;

-- Add check constraints if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'shops' 
          AND constraint_name = 'check_valid_plan_tier'
    ) THEN
        ALTER TABLE public.shops 
        ADD CONSTRAINT check_valid_plan_tier 
        CHECK (plan_tier IN ('FREE', 'PRO', 'ENTERPRISE'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'shops' 
          AND constraint_name = 'check_valid_sub_status'
    ) THEN
        ALTER TABLE public.shops 
        ADD CONSTRAINT check_valid_sub_status 
        CHECK (subscription_status IN ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'shops' 
          AND constraint_name = 'check_valid_billing_cycle'
    ) THEN
        ALTER TABLE public.shops 
        ADD CONSTRAINT check_valid_billing_cycle 
        CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL'));
    END IF;
END $$;

-- Indexes for plan_tier and subscription_status lookups
CREATE INDEX IF NOT EXISTS idx_shops_plan_tier ON public.shops(plan_tier);
CREATE INDEX IF NOT EXISTS idx_shops_subscription_status ON public.shops(subscription_status);

-- ----------------------------------------------------------------------------
-- 2. TABLE: SHOP_USAGE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    billing_month DATE NOT NULL,
    orders_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_billing_month UNIQUE (shop_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_shop_usage_lookup ON public.shop_usage(shop_id, billing_month);

-- Attach updated_at trigger if update_updated_at_column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
    ) THEN
        DROP TRIGGER IF EXISTS trg_shop_usage_updated_at ON public.shop_usage;
        CREATE TRIGGER trg_shop_usage_updated_at
            BEFORE UPDATE ON public.shop_usage
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. HELPER RPC: check_order_creation_allowed(p_shop_id UUID)
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
    v_orders_count INT := 0;
BEGIN
    -- Fetch shop tier and status
    SELECT plan_tier, subscription_status 
    INTO v_plan_tier, v_status
    FROM public.shops
    WHERE id = p_shop_id;

    IF NOT FOUND THEN
        -- Default to free tier if shop not explicitly found
        v_plan_tier := 'FREE';
    END IF;

    -- Pro and Enterprise have unlimited order allowances
    IF v_plan_tier IN ('PRO', 'ENTERPRISE') THEN
        RETURN TRUE;
    END IF;

    -- For Free plan: verify current calendar month quota
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
-- 4. TRIGGER FUNCTION: trg_increment_shop_order_usage
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_increment_shop_order_usage()
RETURNS TRIGGER AS $$
DECLARE
    v_month DATE;
BEGIN
    v_month := DATE_TRUNC('month', COALESCE(NEW.booking_date, NOW()))::DATE;

    INSERT INTO public.shop_usage (shop_id, billing_month, orders_count, created_at, updated_at)
    VALUES (NEW.shop_id, v_month, 1, NOW(), NOW())
    ON CONFLICT (shop_id, billing_month)
    DO UPDATE SET
        orders_count = public.shop_usage.orders_count + 1,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_increment_shop_order_usage ON public.garment_orders;
CREATE TRIGGER trg_increment_shop_order_usage
    AFTER INSERT ON public.garment_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_increment_shop_order_usage();

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) ON SHOP_USAGE
-- ----------------------------------------------------------------------------
ALTER TABLE public.shop_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop members can view shop_usage" ON public.shop_usage;
CREATE POLICY "Shop members can view shop_usage" ON public.shop_usage
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = shop_usage.shop_id
              AND sm.user_id = auth.uid()
        )
        OR (
            EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin')
            AND public.is_super_admin()
        )
    );

DROP POLICY IF EXISTS "Super admins and owners can modify shop_usage" ON public.shop_usage;
CREATE POLICY "Super admins and owners can modify shop_usage" ON public.shop_usage
    FOR ALL
    USING (
        (
            EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_shop_owner')
            AND public.is_shop_owner(shop_id)
        )
        OR (
            EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin')
            AND public.is_super_admin()
        )
    )
    WITH CHECK (
        (
            EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_shop_owner')
            AND public.is_shop_owner(shop_id)
        )
        OR (
            EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin')
            AND public.is_super_admin()
        )
    );

-- ----------------------------------------------------------------------------
-- 6. BACKFILL EXISTING USAGE FROM GARMENT_ORDERS
-- ----------------------------------------------------------------------------
INSERT INTO public.shop_usage (shop_id, billing_month, orders_count, created_at, updated_at)
SELECT 
    go.shop_id,
    DATE_TRUNC('month', COALESCE(go.booking_date, NOW()))::DATE AS billing_month,
    COUNT(go.id)::INT AS orders_count,
    NOW(),
    NOW()
FROM public.garment_orders go
GROUP BY go.shop_id, DATE_TRUNC('month', COALESCE(go.booking_date, NOW()))::DATE
ON CONFLICT (shop_id, billing_month)
DO UPDATE SET
    orders_count = EXCLUDED.orders_count,
    updated_at = NOW();
