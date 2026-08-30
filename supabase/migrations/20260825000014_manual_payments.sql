-- ============================================================================
-- Supabase / PostgreSQL Migration: Manual Pakistani Bank Payment & Receipt System
-- Migration: 20260825000014_manual_payments.sql
-- Description:
--   1. Create public.manual_payment_requests table for Pakistani manual payments
--      (Bank Transfer, Raast, JazzCash, EasyPaisa).
--   2. Add partial unique index enforcing only 1 pending payment request per shop.
--   3. Enable Row Level Security (RLS) with shop member & super admin policies.
--   4. Provision Supabase Storage Bucket 'payment-receipts' with upload policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: MANUAL_PAYMENT_REQUESTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manual_payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('PRO', 'ENTERPRISE')),
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
    amount_pkr NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('BANK_TRANSFER', 'RAAST', 'JAZZCASH', 'EASYPAISA')),
    transaction_reference VARCHAR(100) NOT NULL,
    receipt_image_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_payments_shop ON public.manual_payment_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON public.manual_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_manual_payments_created ON public.manual_payment_requests(created_at DESC);

-- Partial Unique Index: Only 1 PENDING request per shop at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_request_per_shop 
ON public.manual_payment_requests(shop_id) 
WHERE status = 'PENDING';

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Shop members and Super Admins can SELECT requests
DROP POLICY IF EXISTS "Shop members can view their shop payment requests" ON public.manual_payment_requests;
CREATE POLICY "Shop members can view their shop payment requests" ON public.manual_payment_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = manual_payment_requests.shop_id
              AND sm.user_id = auth.uid()
        )
        OR (
            EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin')
            AND public.is_super_admin()
        )
    );

-- Policy 2: Shop members can INSERT requests for their own shop
DROP POLICY IF EXISTS "Shop members can insert payment requests" ON public.manual_payment_requests;
CREATE POLICY "Shop members can insert payment requests" ON public.manual_payment_requests
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = manual_payment_requests.shop_id
              AND sm.user_id = auth.uid()
        )
        OR (
            EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin')
            AND public.is_super_admin()
        )
    );

-- Policy 3: Super Admins have full ALL access to manage and review
DROP POLICY IF EXISTS "Super admins have full access to manual payment requests" ON public.manual_payment_requests;
CREATE POLICY "Super admins have full access to manual payment requests" ON public.manual_payment_requests
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin')
        AND public.is_super_admin()
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin')
        AND public.is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- 3. SUPABASE STORAGE BUCKET: payment-receipts
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- Check if storage schema exists in PostgreSQL instance
    IF EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage'
    ) THEN
        -- Insert bucket if not already present
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('payment-receipts', 'payment-receipts', true)
        ON CONFLICT (id) DO NOTHING;

        -- Storage Objects INSERT policy: Authenticated users can upload payment receipts
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'storage' 
              AND tablename = 'objects' 
              AND policyname = 'Authenticated users can upload payment receipts'
        ) THEN
            CREATE POLICY "Authenticated users can upload payment receipts"
            ON storage.objects
            FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = 'payment-receipts');
        END IF;

        -- Storage Objects SELECT policy: Public and authenticated read
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'storage' 
              AND tablename = 'objects' 
              AND policyname = 'Public read for payment receipts'
        ) THEN
            CREATE POLICY "Public read for payment receipts"
            ON storage.objects
            FOR SELECT
            USING (bucket_id = 'payment-receipts');
        END IF;
    END IF;
END $$;
