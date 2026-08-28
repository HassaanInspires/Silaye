-- ============================================================================
-- Supabase / PostgreSQL Migration: RLS Infinite Recursion Patch
-- Migration: 20260825000005_rls_recursion_fix.sql
-- Description:
--   1. Define a STABLE, SECURITY DEFINER helper function (is_shop_owner) to
--      securely verify ownership without re-triggering RLS on shop_members.
--   2. Drop the recursive policy "Shop owners can manage memberships".
--   3. Recreate the policy using public.is_shop_owner(shop_id).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SECURITY DEFINER HELPER FUNCTION (STABLE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_shop_owner(p_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM shop_members
        WHERE shop_id = p_shop_id
          AND user_id = auth.uid()
          AND role = 'OWNER'
    );
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_shop_owner(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. RECREATE NON-RECURSIVE RLS POLICY ON SHOP_MEMBERS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Shop owners can manage memberships" ON shop_members;

CREATE POLICY "Shop owners can manage memberships" ON shop_members
    FOR ALL
    USING (public.is_shop_owner(shop_id))
    WITH CHECK (public.is_shop_owner(shop_id));
