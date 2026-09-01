-- ============================================================================
-- Supabase / PostgreSQL Migration: Founder Super Admin Email Lock & Auto-Provision
-- Migration: 20260825000013_admin_email_lock.sql
-- Description:
--   1. Create trigger function public.assign_super_admin_by_email() with SECURITY DEFINER
--   2. Auto-assign SUPER_ADMIN status to founder@silaye.pk or raw_user_meta_data->>'is_platform_founder' = 'true'
--   3. Attach trigger trg_assign_super_admin_by_email AFTER INSERT ON auth.users
--   4. Backfill existing users matching founder criteria into public.system_admins
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TRIGGER FUNCTION: assign_super_admin_by_email()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_super_admin_by_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IN ('founder@silaye.pk', 'hassaanm737@gmail.com') OR NEW.raw_user_meta_data->>'is_platform_founder' = 'true' THEN
        INSERT INTO public.system_admins (user_id, role)
        VALUES (NEW.id, 'SUPER_ADMIN')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 2. ATTACH TRIGGER TO auth.users
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        DROP TRIGGER IF EXISTS trg_assign_super_admin_by_email ON auth.users;
        CREATE TRIGGER trg_assign_super_admin_by_email
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.assign_super_admin_by_email();
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. BACKFILL EXISTING FOUNDER ACCOUNTS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        INSERT INTO public.system_admins (user_id, role)
        SELECT id, 'SUPER_ADMIN'
        FROM auth.users
        WHERE email IN ('founder@silaye.pk', 'hassaanm737@gmail.com')
           OR raw_user_meta_data->>'is_platform_founder' = 'true'
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;
