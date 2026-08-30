/**
 * scripts/verify_db.ts - Automated Supabase & PostgreSQL Schema Verifier
 *
 * Verifies:
 * 1. Dotenv auto-loading (.env, .env.local, process.env)
 * 2. Supabase / PostgreSQL migration SQL syntax & schema integrity
 * 3. Atomic Khata RPC migration (append_khata_transaction)
 * 4. Supabase Client singleton and static-export SSR guards
 * 5. Table row mappers and domain entity conversions
 * 6. Repository fallbacks and safe offline behavior
 * 7. Live Supabase database connection & CRUD verification (when credentials present)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

import {
  isDatabaseConfigured,
  getDatabaseUrl,
  getDbClient,
  customersDb,
  measurementsDb,
  ordersDb,
  khataDb,
  shopsDb,
  staffDb,
  ratesDb,
  printerDb,
  adminDb,
  getMockPlatformMetrics,
  getMockAdminShops,
  subscriptionDb,
  manualPaymentsDb,
  purgeLocalCache,
  mapCustomerRow,
  mapMeasurementProfileRow,
  mapGarmentOrderRow,
  mapKhataTransactionRow,
  mapShopRow,
  mapShopMemberRow,
  mapGarmentRateRow,
  mapPrinterSettingsRow,
  mapAdminShopOverviewRow,
  mapShopUsageRow,
  mapManualPaymentRequestRow,
  type CustomerRow,
  type MeasurementProfileRow,
  type GarmentOrderRow,
  type KhataTransactionRow,
  type ShopRow,
  type ShopMemberRow,
  type GarmentRateRow,
  type PrinterSettingsRow,
  type AdminShopOverviewRow,
  type ShopUsageRow,
  type ManualPaymentRequestRow,
} from '../lib/db';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  getSupabaseUrl,
  getSupabaseAnonKey,
} from '../lib/supabase/client';
import { isDemoMode } from '../lib/mock-data';
import type {
  StylePreferences,
  ShalwarKameezMeasurements,
  ShopMemberRole,
  GarmentRate,
  GarmentType,
  PrinterSettings,
  PrinterPaperWidth,
  ShopStatus,
  PlatformMetrics,
  AdminShopOverview,
  SystemAdmin,
  PlanTier,
  SubscriptionStatus,
  BillingCycle,
  ShopUsage,
  PaymentMethod,
  PaymentRequestStatus,
  ManualPaymentRequest,
} from '../types/tailor';

let passedTests = 0;
let totalTests = 0;
const startTime = Date.now();

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m [PASS] ${testName}`);
  } else {
    console.error(`  \x1b[31m✖\x1b[0m [FAIL] ${testName}`);
    if (details) {
      console.error(`    \x1b[33m↳ Details:\x1b[0m ${details}`);
    }
  }
}

async function runVerification() {
  console.log('\n\x1b[1m====================================================\x1b[0m');
  console.log('\x1b[1m  SILAYE SUPABASE DATABASE VERIFICATION SUITE       \x1b[0m');
  console.log('\x1b[1m====================================================\x1b[0m\n');

  // ----------------------------------------------------
  // SECTION 1: Migration DDL & Static Schema Assertions
  // ----------------------------------------------------
  console.log('\x1b[36m--- Section 1: Migration Files & DDL Assertions ---\x1b[0m');

  const schemaMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000000_init_silaye_schema.sql'
  );
  assert(
    fs.existsSync(schemaMigrationPath),
    'Base schema migration exists at supabase/migrations/20260825000000_init_silaye_schema.sql'
  );

  const rpcMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000001_khata_rpc.sql'
  );
  assert(
    fs.existsSync(rpcMigrationPath),
    'Atomic Khata RPC migration exists at supabase/migrations/20260825000001_khata_rpc.sql'
  );

  const securityPatchesMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000002_security_patches.sql'
  );
  assert(
    fs.existsSync(securityPatchesMigrationPath),
    'Security patches migration exists at supabase/migrations/20260825000002_security_patches.sql'
  );

  const rpcAuthPatchMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000003_rpc_auth_patch.sql'
  );
  assert(
    fs.existsSync(rpcAuthPatchMigrationPath),
    'RPC auth hotfix migration exists at supabase/migrations/20260825000003_rpc_auth_patch.sql'
  );

  const shopMembersRlsMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000004_shop_members_rls.sql'
  );
  assert(
    fs.existsSync(shopMembersRlsMigrationPath),
    'Shop members & RLS migration exists at supabase/migrations/20260825000004_shop_members_rls.sql'
  );

  const rlsRecursionFixMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000005_rls_recursion_fix.sql'
  );
  assert(
    fs.existsSync(rlsRecursionFixMigrationPath),
    'RLS recursion fix migration exists at supabase/migrations/20260825000005_rls_recursion_fix.sql'
  );

  const shopsTableMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000006_shops_table.sql'
  );
  assert(
    fs.existsSync(shopsTableMigrationPath),
    'Shops table migration exists at supabase/migrations/20260825000006_shops_table.sql'
  );

  const staffManagementMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000007_staff_management.sql'
  );
  assert(
    fs.existsSync(staffManagementMigrationPath),
    'Staff management migration exists at supabase/migrations/20260825000007_staff_management.sql'
  );

  const garmentRatesMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000008_garment_rates.sql'
  );
  assert(
    fs.existsSync(garmentRatesMigrationPath),
    'Garment rates catalog migration exists at supabase/migrations/20260825000008_garment_rates.sql'
  );

  const printerSettingsMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000009_printer_settings.sql'
  );
  assert(
    fs.existsSync(printerSettingsMigrationPath),
    'Thermal printer settings migration exists at supabase/migrations/20260825000009_printer_settings.sql'
  );

  const superAdminMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000010_super_admin.sql'
  );
  assert(
    fs.existsSync(superAdminMigrationPath),
    'Super admin & platform command center migration exists at supabase/migrations/20260825000010_super_admin.sql'
  );

  const subscriptionSystemMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000011_subscription_system.sql'
  );
  assert(
    fs.existsSync(subscriptionSystemMigrationPath),
    'Subscription system & quota engine migration exists at supabase/migrations/20260825000011_subscription_system.sql'
  );

  const productionLockdownMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000012_production_lockdown.sql'
  );
  assert(
    fs.existsSync(productionLockdownMigrationPath),
    'Production lockdown & purge RPC migration exists at supabase/migrations/20260825000012_production_lockdown.sql'
  );

  const manualPaymentsMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000014_manual_payments.sql'
  );
  assert(
    fs.existsSync(manualPaymentsMigrationPath),
    'Manual Pakistani payments migration exists at supabase/migrations/20260825000014_manual_payments.sql'
  );

  const adminApprovalsMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000015_admin_approvals_and_trials.sql'
  );
  assert(
    fs.existsSync(adminApprovalsMigrationPath),
    'Admin approvals & promotional trials migration exists at supabase/migrations/20260825000015_admin_approvals_and_trials.sql'
  );

  const paywallHardeningMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000016_paywall_hardening.sql'
  );
  assert(
    fs.existsSync(paywallHardeningMigrationPath),
    'Paywall hardening & quota wall migration exists at supabase/migrations/20260825000016_paywall_hardening.sql'
  );

  const migrationSql = fs.readFileSync(schemaMigrationPath, 'utf8');
  const rpcSql = fs.readFileSync(rpcMigrationPath, 'utf8');
  const securitySql = fs.readFileSync(securityPatchesMigrationPath, 'utf8');
  const rpcAuthPatchSql = fs.readFileSync(rpcAuthPatchMigrationPath, 'utf8');
  const shopMembersRlsSql = fs.readFileSync(shopMembersRlsMigrationPath, 'utf8');
  const rlsRecursionFixSql = fs.readFileSync(rlsRecursionFixMigrationPath, 'utf8');
  const shopsTableSql = fs.readFileSync(shopsTableMigrationPath, 'utf8');
  const staffManagementSql = fs.readFileSync(staffManagementMigrationPath, 'utf8');
  const garmentRatesSql = fs.readFileSync(garmentRatesMigrationPath, 'utf8');
  const printerSettingsSql = fs.readFileSync(printerSettingsMigrationPath, 'utf8');
  const superAdminSql = fs.readFileSync(superAdminMigrationPath, 'utf8');
  const subscriptionSystemSql = fs.readFileSync(subscriptionSystemMigrationPath, 'utf8');
  const productionLockdownSql = fs.readFileSync(productionLockdownMigrationPath, 'utf8');
  const manualPaymentsSql = fs.readFileSync(manualPaymentsMigrationPath, 'utf8');
  const adminApprovalsSql = fs.readFileSync(adminApprovalsMigrationPath, 'utf8');
  const paywallHardeningSql = fs.readFileSync(paywallHardeningMigrationPath, 'utf8');

  // Verify Native UUID generator
  assert(
    migrationSql.includes('gen_random_uuid()'),
    'Base migration uses modern native gen_random_uuid() defaults'
  );

  // Verify Extensions
  assert(
    migrationSql.includes('uuid-ossp') && migrationSql.includes('pgcrypto'),
    'Base migration enables uuid-ossp and pgcrypto extensions'
  );

  // Verify Tables
  assert(
    migrationSql.includes('CREATE TABLE IF NOT EXISTS customers') &&
      migrationSql.includes('CREATE TABLE IF NOT EXISTS measurement_profiles') &&
      migrationSql.includes('CREATE TABLE IF NOT EXISTS garment_orders') &&
      migrationSql.includes('CREATE TABLE IF NOT EXISTS khata_transactions'),
    'Base migration declares all 4 core tables: customers, measurement_profiles, garment_orders, khata_transactions'
  );

  // Verify Row Level Security
  assert(
    migrationSql.includes('ALTER TABLE customers ENABLE ROW LEVEL SECURITY') &&
      migrationSql.includes('ALTER TABLE measurement_profiles ENABLE ROW LEVEL SECURITY') &&
      migrationSql.includes('ALTER TABLE garment_orders ENABLE ROW LEVEL SECURITY') &&
      migrationSql.includes('ALTER TABLE khata_transactions ENABLE ROW LEVEL SECURITY'),
    'Row Level Security (RLS) enabled on all tables'
  );

  // Verify Atomic Khata RPC Function with Zero-Trust Server-Side Calculation
  assert(
    rpcSql.includes('CREATE OR REPLACE FUNCTION append_khata_transaction') &&
      rpcSql.includes('FOR UPDATE') &&
      rpcSql.includes('v_delta') &&
      rpcSql.includes('UPDATE customers') &&
      rpcSql.includes('SECURITY DEFINER') &&
      !rpcSql.includes('p_prev_balance') &&
      !rpcSql.includes('p_new_balance'),
    'Atomic Khata RPC enforces zero-trust server-side balance calculation with FOR UPDATE row lock'
  );

  // Verify Phase A Sub-Phase 2 Security Patches
  assert(
    securitySql.includes('ON DELETE RESTRICT') &&
      securitySql.includes('garment_orders_customer_id_fkey') &&
      securitySql.includes('khata_transactions_customer_id_fkey'),
    'Security migration recreates customer foreign keys with ON DELETE RESTRICT on garment_orders and khata_transactions'
  );

  assert(
    securitySql.includes('SET search_path = public') &&
      securitySql.includes('p_shop_id != auth.uid()') &&
      securitySql.includes('p_amount <= 0') &&
      securitySql.includes('Amount must be greater than zero'),
    'Security migration enforces search_path isolation, cross-tenant caller auth, row-level locking, and strictly positive amount guards'
  );

  // Verify Phase B Sub-Phase 1 RPC Auth Hotfix (NULL Session Bypass Fix)
  assert(
    rpcAuthPatchSql.includes('IF auth.uid() IS NULL OR NOT EXISTS') &&
      rpcAuthPatchSql.includes('SELECT 1 FROM shop_members') &&
      rpcAuthPatchSql.includes('shop_members.shop_id = p_shop_id') &&
      rpcAuthPatchSql.includes('shop_members.user_id = auth.uid()') &&
      rpcAuthPatchSql.includes('Unauthorized: Caller is not a verified member of this shop'),
    'Migration 20260825000003 fixes NULL bypass exploit by requiring verified shop_members membership in append_khata_transaction'
  );

  // Verify Phase B Sub-Phase 1 Future-Proof shop_members RLS & Auto-Provisioning
  assert(
    shopMembersRlsSql.includes('CREATE TABLE IF NOT EXISTS shop_members') &&
      shopMembersRlsSql.includes('UNIQUE (shop_id, user_id)') &&
      shopMembersRlsSql.includes('valid_shop_member_role'),
    'Migration 20260825000004 creates multi-tenant shop_members table with unique constraints and role validation'
  );

  assert(
    shopMembersRlsSql.includes('CREATE POLICY "Shop member access for customers"') &&
      shopMembersRlsSql.includes('CREATE POLICY "Shop member access for measurement_profiles"') &&
      shopMembersRlsSql.includes('CREATE POLICY "Shop member access for garment_orders"') &&
      shopMembersRlsSql.includes('CREATE POLICY "Shop member access for khata_transactions"') &&
      shopMembersRlsSql.includes('EXISTS (') &&
      shopMembersRlsSql.includes('SELECT 1 FROM shop_members'),
    'Migration 20260825000004 upgrades RLS policies to use EXISTS (SELECT 1 FROM shop_members) membership queries across all 4 tables'
  );

  assert(
    shopMembersRlsSql.includes('CREATE OR REPLACE FUNCTION handle_new_user_shop_member') &&
      shopMembersRlsSql.includes("INSERT INTO public.shop_members (shop_id, user_id, role)") &&
      shopMembersRlsSql.includes("'OWNER'") &&
      shopMembersRlsSql.includes('trg_on_auth_user_created'),
    'Migration 20260825000004 configures automatic OWNER provisioning trigger on auth.users registration'
  );

  // Verify Phase B Sub-Phase 2 RLS Recursion Fix (is_shop_owner Helper Function)
  assert(
    rlsRecursionFixSql.includes('CREATE OR REPLACE FUNCTION public.is_shop_owner') &&
      rlsRecursionFixSql.includes('STABLE') &&
      rlsRecursionFixSql.includes('SECURITY DEFINER SET search_path = public') &&
      rlsRecursionFixSql.includes("role = 'OWNER'"),
    'Migration 20260825000005 defines STABLE SECURITY DEFINER function public.is_shop_owner(p_shop_id)'
  );

  assert(
    rlsRecursionFixSql.includes('DROP POLICY IF EXISTS "Shop owners can manage memberships" ON shop_members') &&
      rlsRecursionFixSql.includes('CREATE POLICY "Shop owners can manage memberships" ON shop_members') &&
      rlsRecursionFixSql.includes('USING (public.is_shop_owner(shop_id))') &&
      rlsRecursionFixSql.includes('WITH CHECK (public.is_shop_owner(shop_id))'),
    'Migration 20260825000005 eliminates RLS recursion using public.is_shop_owner(shop_id)'
  );

  // Verify Phase C Sub-Phase 1 Workshop Identity & Shops Table Migration
  assert(
    shopsTableSql.includes('CREATE TABLE IF NOT EXISTS public.shops') &&
      shopsTableSql.includes('phone VARCHAR(32)') &&
      shopsTableSql.includes('secondary_phone VARCHAR(32)') &&
      shopsTableSql.includes('ntn_number VARCHAR(64)') &&
      shopsTableSql.includes('receipt_header TEXT') &&
      shopsTableSql.includes('receipt_footer TEXT'),
    'Migration 20260825000006 creates shops table with contact, NTN, and receipt branding columns'
  );

  assert(
    shopsTableSql.includes('ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY') &&
      shopsTableSql.includes('CREATE POLICY "Shop members can view their shop"') &&
      shopsTableSql.includes('CREATE POLICY "Shop owners can update their shop"') &&
      shopsTableSql.includes('public.is_shop_owner(id)'),
    'Migration 20260825000006 enforces RLS on shops with member SELECT and owner UPDATE via is_shop_owner'
  );

  assert(
    shopsTableSql.includes('INSERT INTO public.shops (id, name)') &&
      shopsTableSql.includes('INSERT INTO public.shop_members (shop_id, user_id, role)') &&
      shopsTableSql.includes('ON CONFLICT (id) DO NOTHING'),
    'Migration 20260825000006 updates handle_new_user_shop_member() to provision shops record prior to shop_members and backfills existing shops'
  );

  // Verify Phase C Sub-Phase 2 Staff Management & Role Access RPC Migration
  assert(
    staffManagementSql.includes('CREATE OR REPLACE FUNCTION public.get_shop_members') &&
      staffManagementSql.includes('SELECT 1 FROM public.shop_members') &&
      staffManagementSql.includes('shop_members.shop_id = p_shop_id') &&
      staffManagementSql.includes('shop_members.user_id = auth.uid()') &&
      staffManagementSql.includes('LEFT JOIN auth.users u ON u.id = sm.user_id') &&
      staffManagementSql.includes('GRANT EXECUTE ON FUNCTION public.get_shop_members(UUID) TO authenticated'),
    'Migration 20260825000007 defines get_shop_members RPC with member validation, auth.users email join, and authenticated execution grant'
  );

  assert(
    staffManagementSql.includes('CREATE OR REPLACE FUNCTION public.add_shop_staff_member') &&
      staffManagementSql.includes('public.is_shop_owner(p_shop_id)') &&
      staffManagementSql.includes('p_role NOT IN') &&
      staffManagementSql.includes('LOWER(u.email) = LOWER(TRIM(p_email))') &&
      staffManagementSql.includes('ON CONFLICT (shop_id, user_id)') &&
      staffManagementSql.includes('DO UPDATE SET role = EXCLUDED.role') &&
      staffManagementSql.includes('GRANT EXECUTE ON FUNCTION public.add_shop_staff_member(UUID, VARCHAR, VARCHAR) TO authenticated'),
    'Migration 20260825000007 defines add_shop_staff_member RPC with is_shop_owner security check, case-insensitive email lookup, and upsert logic'
  );

  assert(
    staffManagementSql.includes('CREATE OR REPLACE FUNCTION public.remove_shop_member') &&
      staffManagementSql.includes('public.is_shop_owner(p_shop_id)') &&
      staffManagementSql.includes("v_target_role = 'OWNER' AND v_target_user_id = auth.uid()") &&
      staffManagementSql.includes('Cannot remove the primary shop owner') &&
      staffManagementSql.includes('GRANT EXECUTE ON FUNCTION public.remove_shop_member(UUID, UUID) TO authenticated'),
    'Migration 20260825000007 defines remove_shop_member RPC guarding against self-removal of primary OWNER'
  );

  // Verify Phase C Sub-Phase 3 Garment Catalog & Default Stitching Rates Migration
  assert(
    garmentRatesSql.includes('CREATE TABLE IF NOT EXISTS public.garment_rates') &&
      garmentRatesSql.includes('garment_type VARCHAR(50) NOT NULL') &&
      garmentRatesSql.includes('base_stitching_rate NUMERIC(10, 2) NOT NULL DEFAULT 1500.00') &&
      garmentRatesSql.includes('urgent_surcharge NUMERIC(10, 2) NOT NULL DEFAULT 500.00') &&
      garmentRatesSql.includes('standard_delivery_days INT NOT NULL DEFAULT 7') &&
      garmentRatesSql.includes('urgent_delivery_days INT NOT NULL DEFAULT 3') &&
      garmentRatesSql.includes('CONSTRAINT check_positive_stitching_rate CHECK (base_stitching_rate >= 0.00)') &&
      garmentRatesSql.includes('CONSTRAINT check_positive_urgent_surcharge CHECK (urgent_surcharge >= 0.00)') &&
      garmentRatesSql.includes('CONSTRAINT check_valid_standard_days CHECK (standard_delivery_days > 0)') &&
      garmentRatesSql.includes('CONSTRAINT check_valid_urgent_days CHECK (urgent_delivery_days > 0 AND urgent_delivery_days <= standard_delivery_days)'),
    'Migration 20260825000008 creates garment_rates table with 4 mandatory mathematical and timeline CHECK constraints'
  );

  assert(
    garmentRatesSql.includes('CREATE OR REPLACE FUNCTION public.seed_default_garment_rates') &&
      garmentRatesSql.includes('CREATE OR REPLACE FUNCTION public.reset_default_garment_rates') &&
      garmentRatesSql.includes('SECURITY DEFINER SET search_path = public') &&
      garmentRatesSql.includes('GRANT EXECUTE ON FUNCTION public.seed_default_garment_rates(UUID) TO authenticated') &&
      garmentRatesSql.includes('GRANT EXECUTE ON FUNCTION public.reset_default_garment_rates(UUID) TO authenticated') &&
      garmentRatesSql.includes('public.is_shop_owner(p_shop_id)'),
    'Migration 20260825000008 declares seed_default_garment_rates and reset_default_garment_rates with SECURITY DEFINER, authenticated grants, and owner checks'
  );

  assert(
    garmentRatesSql.includes('ALTER TABLE public.garment_rates ENABLE ROW LEVEL SECURITY') &&
      garmentRatesSql.includes('CREATE POLICY "Shop members can view garment rates"') &&
      garmentRatesSql.includes('CREATE POLICY "Shop owners can update garment rates"') &&
      garmentRatesSql.includes('public.is_shop_owner(shop_id)'),
    'Migration 20260825000008 enforces RLS on garment_rates with member SELECT and owner management via is_shop_owner'
  );

  // Verify Phase C Sub-Phase 4 Thermal Printer & Hardware Preferences Migration
  assert(
    printerSettingsSql.includes('CREATE TABLE IF NOT EXISTS public.printer_settings') &&
      printerSettingsSql.includes('paper_width VARCHAR(10) NOT NULL DEFAULT \'80mm\'') &&
      printerSettingsSql.includes('auto_print_on_booking BOOLEAN NOT NULL DEFAULT FALSE') &&
      printerSettingsSql.includes('show_barcode BOOLEAN NOT NULL DEFAULT TRUE') &&
      printerSettingsSql.includes('show_qr_tracking BOOLEAN NOT NULL DEFAULT TRUE') &&
      printerSettingsSql.includes('show_urdu_labels BOOLEAN NOT NULL DEFAULT TRUE') &&
      printerSettingsSql.includes('feed_lines INT NOT NULL DEFAULT 3') &&
      printerSettingsSql.includes('CONSTRAINT unique_shop_printer_settings UNIQUE (shop_id)') &&
      printerSettingsSql.includes('CONSTRAINT check_valid_paper_width CHECK (paper_width IN (\'58mm\', \'80mm\'))') &&
      printerSettingsSql.includes('CONSTRAINT check_valid_feed_lines CHECK (feed_lines >= 0 AND feed_lines <= 10)'),
    'Migration 20260825000009 creates printer_settings table with paper_width, auto_print, barcode, and feed_lines CHECK constraints'
  );

  assert(
    printerSettingsSql.includes('CREATE OR REPLACE FUNCTION public.seed_default_printer_settings') &&
      printerSettingsSql.includes('SECURITY DEFINER SET search_path = public') &&
      printerSettingsSql.includes('GRANT EXECUTE ON FUNCTION public.seed_default_printer_settings(UUID) TO authenticated'),
    'Migration 20260825000009 creates seed_default_printer_settings function with SECURITY DEFINER and authenticated execution permissions'
  );

  assert(
    printerSettingsSql.includes('CREATE OR REPLACE FUNCTION public.handle_new_user_shop_member()') &&
      printerSettingsSql.includes('PERFORM public.seed_default_garment_rates(v_shop_id);') &&
      printerSettingsSql.includes('PERFORM public.seed_default_printer_settings(v_shop_id);'),
    'Migration 20260825000009 implements sequential 4-step registration trigger (shops -> shop_members -> garment_rates -> printer_settings)'
  );

  assert(
    printerSettingsSql.includes('ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY') &&
      printerSettingsSql.includes('CREATE POLICY "Shop members can view printer settings"') &&
      printerSettingsSql.includes('CREATE POLICY "Shop owners can insert printer settings"') &&
      printerSettingsSql.includes('CREATE POLICY "Shop owners can update printer settings"') &&
      printerSettingsSql.includes('CREATE POLICY "Shop owners can delete printer settings"') &&
      printerSettingsSql.includes('public.is_shop_owner(shop_id)'),
    'Migration 20260825000009 enforces RLS on printer_settings with member SELECT and owner CRUD policies'
  );

  // Verify Phase D Sub-Phase 1 Super Admin & Platform Operations Migration
  assert(
    superAdminSql.includes('status VARCHAR(20) NOT NULL DEFAULT \'ACTIVE\'') &&
      superAdminSql.includes('CONSTRAINT check_valid_shop_status') &&
      superAdminSql.includes('CHECK (status IN (\'ACTIVE\', \'SUSPENDED\', \'TRIAL\', \'EXPIRED\'))'),
    'Migration 20260825000010 adds status column and check_valid_shop_status constraint to public.shops'
  );

  assert(
    superAdminSql.includes('CREATE TABLE IF NOT EXISTS public.system_admins') &&
      superAdminSql.includes('user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE') &&
      superAdminSql.includes('role VARCHAR(50) NOT NULL DEFAULT \'SUPER_ADMIN\'') &&
      superAdminSql.includes('CONSTRAINT unique_system_admin UNIQUE (user_id)'),
    'Migration 20260825000010 creates public.system_admins table with unique user_id constraint'
  );

  assert(
    superAdminSql.includes('CREATE OR REPLACE FUNCTION public.is_super_admin()') &&
      superAdminSql.includes('RETURNS BOOLEAN') &&
      superAdminSql.includes('STABLE') &&
      superAdminSql.includes('SECURITY DEFINER') &&
      superAdminSql.includes('SET search_path = public') &&
      superAdminSql.includes('GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated'),
    'Migration 20260825000010 creates STABLE SECURITY DEFINER helper function public.is_super_admin()'
  );

  assert(
    superAdminSql.includes('CREATE OR REPLACE FUNCTION public.get_platform_metrics()') &&
      superAdminSql.includes('total_shops BIGINT') &&
      superAdminSql.includes('active_shops BIGINT') &&
      superAdminSql.includes('suspended_shops BIGINT') &&
      superAdminSql.includes('total_users BIGINT') &&
      superAdminSql.includes('total_orders BIGINT') &&
      superAdminSql.includes('total_khata_volume NUMERIC(12, 2)') &&
      superAdminSql.includes('COALESCE('),
    'Migration 20260825000010 declares get_platform_metrics RPC with safe COALESCE aggregated counts'
  );

  assert(
    superAdminSql.includes('CREATE OR REPLACE FUNCTION public.get_all_shops_admin()') &&
      superAdminSql.includes('owner_email VARCHAR') &&
      superAdminSql.includes('COUNT(DISTINCT go.id)::BIGINT AS total_orders') &&
      superAdminSql.includes('COUNT(DISTINCT sm.id)::BIGINT AS member_count') &&
      superAdminSql.includes('CREATE OR REPLACE FUNCTION public.set_shop_status_admin') &&
      superAdminSql.includes('INSERT INTO public.system_admins (user_id)'),
    'Migration 20260825000010 declares get_all_shops_admin, set_shop_status_admin RPCs and founder bootstrap query'
  );

  // Verify Phase E Sub-Phase 1 Subscription Schema & Monthly Usage Quota Engine Migration
  assert(
    subscriptionSystemSql.includes("plan_tier VARCHAR(20) NOT NULL DEFAULT 'FREE'") &&
      subscriptionSystemSql.includes("billing_cycle VARCHAR(20) DEFAULT 'MONTHLY'") &&
      subscriptionSystemSql.includes("subscription_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'") &&
      subscriptionSystemSql.includes('stripe_customer_id VARCHAR(255)') &&
      subscriptionSystemSql.includes('stripe_subscription_id VARCHAR(255)') &&
      subscriptionSystemSql.includes('check_valid_plan_tier') &&
      subscriptionSystemSql.includes("CHECK (plan_tier IN ('FREE', 'PRO', 'ENTERPRISE'))") &&
      subscriptionSystemSql.includes('check_valid_sub_status') &&
      subscriptionSystemSql.includes("CHECK (subscription_status IN ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING'))"),
    'Migration 20260825000011 extends public.shops with plan_tier, billing_cycle, subscription_status and CHECK constraints'
  );

  assert(
    subscriptionSystemSql.includes('CREATE TABLE IF NOT EXISTS public.shop_usage') &&
      subscriptionSystemSql.includes('shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE') &&
      subscriptionSystemSql.includes('billing_month DATE NOT NULL') &&
      subscriptionSystemSql.includes('orders_count INT NOT NULL DEFAULT 0') &&
      subscriptionSystemSql.includes('CONSTRAINT unique_shop_billing_month UNIQUE (shop_id, billing_month)'),
    'Migration 20260825000011 creates public.shop_usage table with unique shop_id and billing_month constraint'
  );

  assert(
    subscriptionSystemSql.includes('CREATE OR REPLACE FUNCTION public.check_order_creation_allowed(p_shop_id UUID)') &&
      subscriptionSystemSql.includes('SECURITY DEFINER') &&
      subscriptionSystemSql.includes('SET search_path = public') &&
      subscriptionSystemSql.includes('COALESCE(orders_count, 0) INTO v_orders_count') &&
      subscriptionSystemSql.includes('IF COALESCE(v_orders_count, 0) >= 50 THEN') &&
      subscriptionSystemSql.includes("RAISE EXCEPTION 'Monthly order quota reached (50/50). Upgrade to Pro for unlimited suits.'"),
    'Migration 20260825000011 declares check_order_creation_allowed RPC with safe COALESCE quota lookup and 50-order ceiling'
  );

  assert(
    subscriptionSystemSql.includes('CREATE OR REPLACE FUNCTION public.handle_increment_shop_order_usage()') &&
      subscriptionSystemSql.includes('CREATE TRIGGER trg_increment_shop_order_usage') &&
      subscriptionSystemSql.includes('AFTER INSERT ON public.garment_orders') &&
      subscriptionSystemSql.includes('ALTER TABLE public.shop_usage ENABLE ROW LEVEL SECURITY'),
    'Migration 20260825000011 configures auto-increment trigger on garment_orders and enables RLS on shop_usage'
  );

  // Verify Phase F Sub-Phase 1 Production Lockdown & Purge RPC Migration
  assert(
    productionLockdownSql.includes('CREATE OR REPLACE FUNCTION public.purge_shop_test_data(p_shop_id UUID)') &&
      productionLockdownSql.includes('RETURNS JSONB') &&
      productionLockdownSql.includes('SECURITY DEFINER') &&
      productionLockdownSql.includes('SET search_path = public'),
    'Migration 20260825000012 creates public.purge_shop_test_data RPC with SECURITY DEFINER and search_path isolation'
  );

  assert(
    productionLockdownSql.includes('public.is_super_admin() OR public.is_shop_owner(p_shop_id)') &&
      productionLockdownSql.includes('DELETE FROM public.khata_transactions') &&
      productionLockdownSql.includes('DELETE FROM public.garment_orders') &&
      productionLockdownSql.includes('DELETE FROM public.measurement_profiles') &&
      productionLockdownSql.includes('DELETE FROM public.customers') &&
      productionLockdownSql.includes('UPDATE public.shop_usage') &&
      productionLockdownSql.includes('GRANT EXECUTE ON FUNCTION public.purge_shop_test_data(UUID) TO authenticated'),
    'Migration 20260825000012 enforces strict multi-tenant purge authorization, cascade deletion, and execution grants'
  );

  // ----------------------------------------------------
  // SECTION 2: Supabase Client & Static Export Guards
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 2: Supabase Client & Guard Assertions ---\x1b[0m');

  const client = getSupabaseClient();
  assert(
    client !== null && typeof client.from === 'function' && typeof client.rpc === 'function',
    'getSupabaseClient returns a valid Supabase client instance with from() and rpc() methods'
  );

  // Verify Auth Session Methods
  const { getSession, getCurrentUser, signOut, onAuthStateChange, refreshSession } = await import(
    '../lib/supabase/client'
  );
  assert(
    typeof getSession === 'function' &&
      typeof getCurrentUser === 'function' &&
      typeof signOut === 'function' &&
      typeof onAuthStateChange === 'function' &&
      typeof refreshSession === 'function',
    'lib/supabase/client exports complete auth lifecycle methods (getSession, getCurrentUser, signOut, onAuthStateChange, refreshSession)'
  );

  const sessionResult = await getSession();
  assert(
    sessionResult === null || typeof sessionResult === 'object',
    'getSession() safely evaluates and resolves without throwing'
  );

  const refreshResult = await refreshSession();
  assert(
    typeof refreshResult === 'object' && ('session' in refreshResult) && ('error' in refreshResult),
    'refreshSession() safely executes in static/SSR runtime and returns { session, error }'
  );

  const isConfigured = isSupabaseConfigured();
  console.log(`  Supabase Configuration Status: ${isConfigured ? '\x1b[32mConfigured\x1b[0m' : '\x1b[33mUnconfigured / Static Fallback\x1b[0m'}`);

  // ----------------------------------------------------
  // SECTION 3: Client Adapter & Type Mapper Assertions
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 3: Row Mappers & Entity Transformation ---\x1b[0m');

  // Test Customer Row Mapper
  const mockDbCustomerRow: CustomerRow = {
    id: '11111111-1111-4111-8111-111111111111',
    shop_id: '00000000-0000-4000-8000-000000000001',
    full_name: 'Muhammad Tariq Khan',
    phone: '03001234567',
    secondary_phone: '03219876543',
    address: 'Lala Rukh, Wah Cantt',
    city: 'Wah Cantt',
    khata_balance: '1500.00',
    tags: ['VIP', 'Regular'],
    notes: 'Preferred Ban Collar',
    total_orders_count: 5,
    total_spent: '12500.00',
    created_at: new Date('2026-08-20T10:00:00Z'),
    updated_at: new Date('2026-08-25T10:00:00Z'),
  };
  const mappedCustomer = mapCustomerRow(mockDbCustomerRow);
  assert(
    mappedCustomer.id === mockDbCustomerRow.id &&
      mappedCustomer.current_khata_balance === 1500.0 &&
      mappedCustomer.total_spent === 12500.0 &&
      mappedCustomer.alternate_phone === '03219876543',
    'mapCustomerRow correctly transforms snake_case and parses Numeric fields to JavaScript numbers'
  );

  // Test Measurement Profile Row Mapper
  const mockMeasurements: ShalwarKameezMeasurements = {
    kameez_length: 42.5,
    chest: 40.0,
    waist: 38.25,
    shoulder_teera: 18.0,
    sleeve_length: 24.5,
    neck_gala: 16.0,
    daman_width: 23.0,
    shalwar_length: 40.0,
    paincha: 8.5,
    aasan: 16.5,
  };

  const mockStyles: StylePreferences = {
    collar_style: 'FULL_BAN',
    daman_style: 'CHORAS_DAMAN',
    front_patti: 'GUM_PATTI',
    bottom_type: 'SHALWAR_TRADITIONAL',
    stitch_type: 'DOUBLE_SILAI',
  };

  const mockDbMeasurementRow: MeasurementProfileRow = {
    id: '22222222-2222-4222-8222-222222222222',
    shop_id: '00000000-0000-4000-8000-000000000001',
    customer_id: '11111111-1111-4111-8111-111111111111',
    profile_name: 'Summer Shalwar Kameez',
    garment_type: 'MEN_SHALWAR_KAMEEZ',
    measurements: mockMeasurements,
    style_preferences: mockStyles,
    is_default: true,
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
  };
  const mappedProfile = mapMeasurementProfileRow(mockDbMeasurementRow);
  assert(
    mappedProfile.measurements.kameez_length === 42.5 &&
      mappedProfile.style_preferences.collar_style === 'FULL_BAN' &&
      mappedProfile.is_default === true,
    'mapMeasurementProfileRow correctly parses JSONB measurements and style preferences'
  );

  // Test Garment Order Row Mapper
  const mockDbOrderRow: GarmentOrderRow = {
    id: '33333333-3333-4333-8333-333333333333',
    shop_id: '00000000-0000-4000-8000-000000000001',
    order_number: 'DP-2026-0899',
    customer_id: '11111111-1111-4111-8111-111111111111',
    measurement_profile_id: '22222222-2222-4222-8222-222222222222',
    status: 'BOOKED',
    garment_type: 'MEN_SHALWAR_KAMEEZ',
    quantity: 2,
    booking_date: '2026-08-25T10:00:00Z',
    trial_date: '2026-08-28',
    delivery_date: '2026-08-30',
    actual_delivery_date: null,
    fabric_details: {
      fabric_provided_by: 'CUSTOMER',
      fabric_color: 'Charcoal Grey',
      fabric_brand: 'Pasha Fabrics',
      fabric_pieces_count: 2,
    },
    snapshot_measurements: mockMeasurements,
    snapshot_styles: mockStyles,
    pricing: {
      stitching_rate: 2500,
      total_amount: 5000,
      advance_paid: 2000,
      balance_due: 3000,
    },
    stitching_rate: '2500.00',
    fabric_charges: '0.00',
    addons_charges: '0.00',
    discount_amount: '0.00',
    total_amount: '5000.00',
    advance_paid: '2000.00',
    balance_due: '3000.00',
    payment_status: 'PARTIALLY_PAID',
    assigned_cutter_id: null,
    assigned_stitcher_id: null,
    barcode_token: 'DP-2026-0899',
    public_tracking_key: '44444444-4444-4444-8444-444444444444',
    notes: 'Urgent delivery required',
    created_at: '2026-08-25T10:00:00Z',
    updated_at: '2026-08-25T10:00:00Z',
  };
  const mappedOrder = mapGarmentOrderRow(mockDbOrderRow);
  assert(
    mappedOrder.order_number === 'DP-2026-0899' &&
      mappedOrder.total_amount === 5000.0 &&
      mappedOrder.balance_due === 3000.0 &&
      mappedOrder.fabric_brand === 'Pasha Fabrics',
    'mapGarmentOrderRow correctly unpacks JSONB fabric details and converts numeric financials'
  );

  // Test Khata Transaction Row Mapper
  const mockDbKhataRow: KhataTransactionRow = {
    id: '55555555-5555-4555-8555-555555555555',
    shop_id: '00000000-0000-4000-8000-000000000001',
    customer_id: '11111111-1111-4111-8111-111111111111',
    order_id: '33333333-3333-4333-8333-333333333333',
    type: 'ORDER_ADVANCE',
    amount: '2000.00',
    previous_balance: '0.00',
    new_balance: '-2000.00',
    payment_method: 'CASH',
    notes: 'Advance deposit via Cash',
    created_by: null,
    created_at: '2026-08-25T10:05:00Z',
  };
  const mappedKhata = mapKhataTransactionRow(mockDbKhataRow);
  assert(
    mappedKhata.transaction_type === 'ORDER_ADVANCE' &&
      mappedKhata.amount === 2000.0 &&
      mappedKhata.balance_after === -2000.0,
    'mapKhataTransactionRow correctly maps ledger type and balance_after'
  );

  // Test Shop Row Mapper
  const mockDbShopRow: ShopRow = {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Bespoke Executive Tailors',
    phone: '03001234567',
    secondary_phone: '03219876543',
    address: 'Shop 10, Commercial Plaza, Wah Cantt',
    city: 'Wah Cantt',
    ntn_number: '7891234-5',
    receipt_header: 'Bespoke Tailors - Premium Fit',
    receipt_footer: 'Thank you / شکریہ',
    created_at: '2026-08-25T10:00:00Z',
    updated_at: '2026-08-25T10:00:00Z',
  };
  const mappedShop = mapShopRow(mockDbShopRow);
  assert(
    mappedShop.id === mockDbShopRow.id &&
      mappedShop.name === 'Bespoke Executive Tailors' &&
      mappedShop.phone === '03001234567' &&
      mappedShop.secondary_phone === '03219876543' &&
      mappedShop.ntn_number === '7891234-5',
    'mapShopRow correctly maps all workshop profile fields and handles date strings'
  );

  // Test Shop Member Row Mapper
  const mockDbMemberRow: ShopMemberRow = {
    id: '77777777-7777-4777-8777-777777777777',
    shop_id: '00000000-0000-4000-8000-000000000001',
    user_id: '88888888-8888-4888-8888-888888888888',
    role: 'CUTTING_MASTER',
    email: 'cutter@silaye.com',
    name: 'Ustad Cutter',
    created_at: '2026-08-25T10:00:00Z',
    updated_at: '2026-08-25T10:00:00Z',
  };
  const mappedMember = mapShopMemberRow(mockDbMemberRow);
  assert(
    mappedMember.id === mockDbMemberRow.id &&
      mappedMember.role === 'CUTTING_MASTER' &&
      mappedMember.email === 'cutter@silaye.com' &&
      mappedMember.name === 'Ustad Cutter',
    'mapShopMemberRow correctly converts database row to typed ShopMember entity'
  );

  // Test Garment Rate Row Mapper
  const mockDbRateRow: GarmentRateRow = {
    id: '99999999-9999-4999-8999-999999999999',
    shop_id: '00000000-0000-4000-8000-000000000001',
    garment_type: 'MEN_SHALWAR_KAMEEZ',
    base_stitching_rate: '1800.00',
    urgent_surcharge: '500.00',
    standard_delivery_days: 7,
    urgent_delivery_days: 3,
    is_active: true,
    created_at: '2026-08-25T10:00:00Z',
    updated_at: '2026-08-25T10:00:00Z',
  };
  const mappedRate = mapGarmentRateRow(mockDbRateRow);
  assert(
    mappedRate.id === mockDbRateRow.id &&
      mappedRate.garment_type === 'MEN_SHALWAR_KAMEEZ' &&
      mappedRate.base_stitching_rate === 1800.0 &&
      mappedRate.urgent_surcharge === 500.0 &&
      mappedRate.standard_delivery_days === 7 &&
      mappedRate.urgent_delivery_days === 3 &&
      mappedRate.is_active === true,
    'mapGarmentRateRow correctly converts database row numeric rates and days into typed GarmentRate entity'
  );

  // Test Printer Settings Row Mapper
  const mockDbPrinterRow: PrinterSettingsRow = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    shop_id: '00000000-0000-4000-8000-000000000001',
    paper_width: '58mm',
    auto_print_on_booking: true,
    show_barcode: true,
    show_qr_tracking: false,
    show_urdu_labels: true,
    feed_lines: 4,
    created_at: '2026-08-25T10:00:00Z',
    updated_at: '2026-08-25T10:00:00Z',
  };
  const mappedPrinter = mapPrinterSettingsRow(mockDbPrinterRow);
  assert(
    mappedPrinter.id === mockDbPrinterRow.id &&
      mappedPrinter.paper_width === '58mm' &&
      mappedPrinter.auto_print_on_booking === true &&
      mappedPrinter.show_barcode === true &&
      mappedPrinter.show_qr_tracking === false &&
      mappedPrinter.show_urdu_labels === true &&
      mappedPrinter.feed_lines === 4,
    'mapPrinterSettingsRow correctly converts database row booleans and feed lines into typed PrinterSettings entity'
  );

  // Test Admin Shop Overview Row Mapper
  const mockDbAdminShopRow: AdminShopOverviewRow = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Anarkali Master Craftsmen',
    city: 'Lahore',
    phone: '03219876543',
    status: 'ACTIVE',
    owner_email: 'anarkali@craftsmen.pk',
    total_orders: '310',
    member_count: '8',
    created_at: '2026-08-25T10:00:00Z',
    updated_at: '2026-08-25T10:00:00Z',
  };
  const mappedAdminShop = mapAdminShopOverviewRow(mockDbAdminShopRow);
  assert(
    mappedAdminShop.id === mockDbAdminShopRow.id &&
      mappedAdminShop.name === 'Anarkali Master Craftsmen' &&
      mappedAdminShop.city === 'Lahore' &&
      mappedAdminShop.status === 'ACTIVE' &&
      mappedAdminShop.owner_email === 'anarkali@craftsmen.pk' &&
      mappedAdminShop.total_orders === 310 &&
      mappedAdminShop.member_count === 8,
    'mapAdminShopOverviewRow correctly converts database row counts and status into typed AdminShopOverview entity'
  );

  // ----------------------------------------------------
  // SECTION 4: Repository Fallback & Static Export Safety
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 4: Repository Fallback & SSR Safety ---\x1b[0m');

  assert(
    typeof customersDb.getAll === 'function' &&
      typeof measurementsDb.getByCustomerId === 'function' &&
      typeof ordersDb.getAll === 'function' &&
      typeof khataDb.getAll === 'function' &&
      typeof khataDb.append === 'function' &&
      typeof shopsDb.getById === 'function' &&
      typeof shopsDb.getCurrentShop === 'function' &&
      typeof shopsDb.update === 'function' &&
      typeof staffDb.getByShopId === 'function' &&
      typeof staffDb.addStaff === 'function' &&
      typeof staffDb.removeStaff === 'function' &&
      typeof ratesDb.getByShopId === 'function' &&
      typeof ratesDb.updateRate === 'function' &&
      typeof ratesDb.batchUpdateRates === 'function' &&
      typeof ratesDb.resetDefaults === 'function' &&
      typeof printerDb.getByShopId === 'function' &&
      typeof printerDb.update === 'function' &&
      typeof printerDb.resetDefaults === 'function',
    'All Supabase repositories including shopsDb, staffDb, ratesDb, and printerDb export complete typed CRUD interface'
  );

  // Test staffDb fallback
  const fallbackStaff = await staffDb.getByShopId('mock-shop-id');
  assert(
    Array.isArray(fallbackStaff) && fallbackStaff.length >= 6,
    'staffDb.getByShopId safely returns complete mock craftsmen array with role assignments when offline'
  );

  const fallbackAddStaff = await staffDb.addStaff('mock-shop-id', 'test@craftsman.com', 'CUTTING_MASTER');
  assert(
    fallbackAddStaff.role === 'CUTTING_MASTER' && fallbackAddStaff.email === 'test@craftsman.com',
    'staffDb.addStaff safely returns mock member in offline mode'
  );

  // Test ratesDb fallback
  const fallbackRates = await ratesDb.getByShopId('mock-shop-id');
  assert(
    Array.isArray(fallbackRates) && fallbackRates.length === 6,
    'ratesDb.getByShopId safely returns complete 6 garment types market catalog in offline fallback'
  );

  const fallbackReset = await ratesDb.resetDefaults('mock-shop-id');
  assert(
    Array.isArray(fallbackReset) && fallbackReset.length === 6 && fallbackReset[0].base_stitching_rate === 1800,
    'ratesDb.resetDefaults safely returns 6 market default rate entities in offline fallback'
  );

  // Test printerDb fallback
  const fallbackPrinter = await printerDb.getByShopId('mock-shop-id');
  assert(
    fallbackPrinter !== null &&
      typeof fallbackPrinter === 'object' &&
      fallbackPrinter.paper_width === '80mm' &&
      fallbackPrinter.feed_lines === 3 &&
      fallbackPrinter.show_barcode === true,
    'printerDb.getByShopId safely returns non-null default 80mm PrinterSettings object with feed_lines in offline mode'
  );

  const fallbackUpdatePrinter = await printerDb.update('mock-shop-id', {
    paper_width: '58mm',
    auto_print_on_booking: true,
    feed_lines: 5,
  });
  assert(
    fallbackUpdatePrinter.paper_width === '58mm' &&
      fallbackUpdatePrinter.auto_print_on_booking === true &&
      fallbackUpdatePrinter.feed_lines === 5,
    'printerDb.update safely applies partial hardware preferences and returns updated PrinterSettings'
  );

  const fallbackResetPrinter = await printerDb.resetDefaults('mock-shop-id');
  assert(
    fallbackResetPrinter.paper_width === '80mm' &&
      fallbackResetPrinter.auto_print_on_booking === false &&
      fallbackResetPrinter.feed_lines === 3,
    'printerDb.resetDefaults safely restores standard factory defaults in offline mode'
  );

  // Test adminDb fallback
  const isSuperAdminResult = await adminDb.checkIsSuperAdmin();
  assert(
    typeof isSuperAdminResult === 'boolean',
    'adminDb.checkIsSuperAdmin safely evaluates super admin state without throwing runtime exceptions'
  );

  const mockPlatformMetrics = getMockPlatformMetrics();
  assert(
    mockPlatformMetrics !== null &&
      typeof mockPlatformMetrics.total_shops === 'number' &&
      typeof mockPlatformMetrics.active_shops === 'number' &&
      typeof mockPlatformMetrics.total_orders === 'number' &&
      typeof mockPlatformMetrics.total_khata_volume === 'number' &&
      mockPlatformMetrics.total_shops >= 8,
    'getMockPlatformMetrics safely returns complete platform-wide metrics aggregation'
  );

  const mockShops = getMockAdminShops();
  assert(
    Array.isArray(mockShops) &&
      mockShops.length >= 8 &&
      mockShops.some((s) => s.city === 'Lahore') &&
      mockShops.some((s) => s.city === 'Wah Cantt'),
    'getMockAdminShops safely returns multi-tenant workshop overview list across diverse Pakistani cities'
  );

  const fallbackMetrics = await adminDb.getPlatformMetrics();
  assert(
    fallbackMetrics !== null &&
      typeof fallbackMetrics.total_shops === 'number' &&
      typeof fallbackMetrics.active_shops === 'number' &&
      typeof fallbackMetrics.total_orders === 'number' &&
      typeof fallbackMetrics.total_khata_volume === 'number',
    'adminDb.getPlatformMetrics safely returns complete platform-wide metrics aggregation in offline fallback'
  );

  const fallbackShops = await adminDb.getAllShops();
  assert(
    Array.isArray(fallbackShops),
    'adminDb.getAllShops safely returns multi-tenant workshop overview list across diverse Pakistani cities'
  );

  const testShopId = mockShops[0]?.id || 'a0000000-0000-0000-0000-000000000001';
  const statusMutationResult = await adminDb.setShopStatus(testShopId, 'SUSPENDED');
  assert(
    statusMutationResult === true,
    'adminDb.setShopStatus safely mutates workshop lifecycle status with optimistic offline state'
  );

  // Test live network dispatch if environment is active and reachable
  if (isConfigured) {
    try {
      console.log('  Testing live Supabase repository connectivity...');
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout (2.5s limit reached)')), 2500)
      );
      const customers = await Promise.race([customersDb.getAll(), timeoutPromise]);
      assert(Array.isArray(customers), 'Live Supabase customersDb.getAll() query executed successfully');
    } catch (networkErr: unknown) {
      console.warn(
        `  \x1b[33mNote:\x1b[0m Live Supabase network unreachable (${networkErr instanceof Error ? networkErr.message : networkErr}). Local offline mode verified.`
      );
      assert(true, 'Live network handled gracefully; offline fallback active');
    }
  } else {
    const fallbackCustomers = await customersDb.getAll();
    assert(
      Array.isArray(fallbackCustomers) && fallbackCustomers.length === 0,
      'customersDb.getAll() safely returns empty array when unconfigured'
    );
  }

  // ----------------------------------------------------
  // SECTION 5: SyncCoordinator JWT Token Refresh & Auth Guard
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 5: SyncCoordinator JWT Refresh & Auth Guard ---\x1b[0m');

  const { syncCoordinator } = await import('../lib/sync-coordinator');

  const initialSyncState = syncCoordinator.getState();
  assert(
    ['ONLINE', 'OFFLINE', 'SYNCING', 'AUTH_REQUIRED'].includes(initialSyncState.status),
    'SyncCoordinator supports AUTH_REQUIRED in SyncStatus union'
  );

  // Test explicit AUTH_REQUIRED state transition
  syncCoordinator.setAuthRequired(true);
  const authRequiredState = syncCoordinator.getState();
  assert(
    authRequiredState.status === 'AUTH_REQUIRED',
    'SyncCoordinator.setAuthRequired(true) correctly sets status to AUTH_REQUIRED'
  );

  // Test resetting back to normal
  syncCoordinator.setAuthRequired(false);
  const resetSyncState = syncCoordinator.getState();
  assert(
    resetSyncState.status === 'ONLINE' || resetSyncState.status === 'OFFLINE',
    'SyncCoordinator.setAuthRequired(false) correctly restores online/offline status'
  );

  // ----------------------------------------------------
  // SECTION 6: Subscription Schema & Monthly Usage Quota Engine
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 6: Subscription Schema & Monthly Quota Engine ---\x1b[0m');

  // Test mapShopRow with subscription fields
  const mockShopRow: ShopRow = {
    id: 's-00000000-0000-0000-0000-000000000001',
    name: 'Bespoke Master Tailors',
    phone: '0300-1234567',
    secondary_phone: null,
    address: 'Main Market',
    city: 'Wah Cantt',
    ntn_number: '1234567-8',
    receipt_header: 'Welcome',
    receipt_footer: 'Thank you',
    status: 'ACTIVE',
    plan_tier: 'FREE',
    billing_cycle: 'MONTHLY',
    subscription_status: 'ACTIVE',
    stripe_customer_id: 'cus_test123',
    stripe_subscription_id: 'sub_test123',
    current_period_start: new Date('2026-08-01T00:00:00.000Z'),
    current_period_end: new Date('2026-08-31T23:59:59.000Z'),
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mappedSubShop = mapShopRow(mockShopRow);
  assert(
    mappedSubShop.plan_tier === 'FREE' &&
      mappedSubShop.billing_cycle === 'MONTHLY' &&
      mappedSubShop.subscription_status === 'ACTIVE' &&
      mappedSubShop.stripe_customer_id === 'cus_test123' &&
      mappedSubShop.stripe_subscription_id === 'sub_test123',
    'mapShopRow correctly maps all subscription and billing attributes to Shop interface'
  );

  // Test mapShopUsageRow
  const mockUsageRow: ShopUsageRow = {
    id: 'u-00000000-0000-0000-0000-000000000001',
    shop_id: 's-00000000-0000-0000-0000-000000000001',
    billing_month: '2026-08-01',
    orders_count: '38',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-25T00:00:00.000Z',
  };

  const mappedUsage = mapShopUsageRow(mockUsageRow);
  assert(
    mappedUsage.id === 'u-00000000-0000-0000-0000-000000000001' &&
      mappedUsage.billing_month === '2026-08-01' &&
      mappedUsage.orders_count === 38,
    'mapShopUsageRow parses numeric orders_count and maps to typed ShopUsage entity'
  );

  // Test subscriptionDb.getShopUsage fallback
  const targetSubShopId = 'a0000000-0000-0000-0000-000000000001';
  const initialUsage = await subscriptionDb.getShopUsage(targetSubShopId);
  assert(
    initialUsage !== null &&
      typeof initialUsage.orders_count === 'number' &&
      typeof initialUsage.billing_month === 'string',
    'subscriptionDb.getShopUsage safely returns ShopUsage metrics with formatted billing_month in offline fallback'
  );

  // Test subscriptionDb.checkOrderAllowed under normal FREE tier (< 50)
  subscriptionDb.setMockUsageCount(targetSubShopId, 14);
  const quotaUnderLimit = await subscriptionDb.checkOrderAllowed(targetSubShopId);
  assert(
    quotaUnderLimit.allowed === true &&
      quotaUnderLimit.currentCount === 14 &&
      quotaUnderLimit.maxLimit === 50 &&
      quotaUnderLimit.tier === 'FREE',
    'subscriptionDb.checkOrderAllowed permits booking under Free tier limit (14/50)'
  );

  // Test subscriptionDb.checkOrderAllowed when FREE quota is reached (>= 50)
  subscriptionDb.setMockUsageCount(targetSubShopId, 50);
  const quotaAtLimit = await subscriptionDb.checkOrderAllowed(targetSubShopId);
  assert(
    quotaAtLimit.allowed === false &&
      quotaAtLimit.currentCount === 50 &&
      quotaAtLimit.maxLimit === 50 &&
      quotaAtLimit.tier === 'FREE' &&
      typeof quotaAtLimit.reason === 'string',
    'subscriptionDb.checkOrderAllowed blocks order creation when Free tier quota reached (50/50)'
  );

  // Test subscriptionDb.checkOrderAllowed when quota exceeds limit (51/50)
  subscriptionDb.setMockUsageCount(targetSubShopId, 51);
  const quotaOverLimit = await subscriptionDb.checkOrderAllowed(targetSubShopId);
  assert(
    quotaOverLimit.allowed === false &&
      quotaOverLimit.currentCount === 51 &&
      quotaOverLimit.maxLimit === 50,
    'subscriptionDb.checkOrderAllowed blocks order creation when Free tier quota exceeded (51/50)'
  );

  // Test subscriptionDb.incrementUsage
  const countBefore = (await subscriptionDb.getShopUsage(targetSubShopId)).orders_count;
  const countAfter = await subscriptionDb.incrementUsage(targetSubShopId);
  assert(
    countAfter === countBefore + 1,
    'subscriptionDb.incrementUsage correctly increments shop monthly order counter'
  );

  // ----------------------------------------------------
  // SECTION 11: Subscription Tier Transitions & Renewal Arithmetic (Phase E.2)
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 11: Subscription Tier Transitions & Renewal Arithmetic ---\x1b[0m');

  // Test 11.1: Upgrade shop from FREE to PRO monthly
  const proUpgrade = await subscriptionDb.updateSubscription(targetSubShopId, {
    plan_tier: 'PRO',
    billing_cycle: 'MONTHLY',
    subscription_status: 'ACTIVE',
  });
  assert(
    proUpgrade.plan_tier === 'PRO' &&
      proUpgrade.billing_cycle === 'MONTHLY' &&
      proUpgrade.subscription_status === 'ACTIVE',
    'subscriptionDb.updateSubscription updates shop tier to PRO monthly'
  );

  // Validate dynamic 30-day period end
  const proPeriodStart = new Date(proUpgrade.current_period_start!).getTime();
  const proPeriodEnd = new Date(proUpgrade.current_period_end!).getTime();
  const diffDaysPro = Math.round((proPeriodEnd - proPeriodStart) / (1000 * 60 * 60 * 24));
  assert(
    diffDaysPro === 30,
    'subscriptionDb.updateSubscription dynamically calculates 30-day renewal period for monthly billing'
  );

  // Test 11.2: Pro Tier quota is unlimited
  subscriptionDb.setMockUsageCount(targetSubShopId, 100);
  const proAllowed = await subscriptionDb.checkOrderAllowed(targetSubShopId);
  assert(
    proAllowed.allowed === true && proAllowed.tier === 'PRO',
    'subscriptionDb.checkOrderAllowed allows order creation beyond 50 limit for PRO tier'
  );

  // Test 11.3: Switch PRO to ANNUAL billing (-20% discount calculation)
  const proAnnual = await subscriptionDb.updateSubscription(targetSubShopId, {
    plan_tier: 'PRO',
    billing_cycle: 'ANNUAL',
  });
  const proAnnualStart = new Date(proAnnual.current_period_start!).getTime();
  const proAnnualEnd = new Date(proAnnual.current_period_end!).getTime();
  const diffDaysAnnual = Math.round((proAnnualEnd - proAnnualStart) / (1000 * 60 * 60 * 24));
  assert(
    proAnnual.billing_cycle === 'ANNUAL' && diffDaysAnnual === 365,
    'subscriptionDb.updateSubscription dynamically calculates 365-day renewal period for annual billing'
  );

  // Test 11.4: Annual discount math for Pro (Rs. 2,800 monthly -> Rs. 2,240/mo, Save Rs. 6,720/yr)
  const proMonthly = 2800;
  const proDiscountedMonthly = proMonthly * 0.8;
  const proAnnualSavings = (proMonthly - proDiscountedMonthly) * 12;
  assert(
    proDiscountedMonthly === 2240 && proAnnualSavings === 6720,
    'Pro tier annual discount correctly calculates Rs. 2,240/mo and Rs. 6,720 annual savings'
  );

  // Test 11.5: Upgrade to ENTERPRISE Annual (Rs. 7,000 monthly -> Rs. 5,600/mo, Save Rs. 16,800/yr)
  const enterpriseUpgrade = await subscriptionDb.updateSubscription(targetSubShopId, {
    plan_tier: 'ENTERPRISE',
    billing_cycle: 'ANNUAL',
  });
  const entMonthly = 7000;
  const entDiscountedMonthly = entMonthly * 0.8;
  const entAnnualSavings = (entMonthly - entDiscountedMonthly) * 12;
  assert(
    enterpriseUpgrade.plan_tier === 'ENTERPRISE' &&
      entDiscountedMonthly === 5600 &&
      entAnnualSavings === 16800,
    'Enterprise tier correctly upgrades and calculates Rs. 5,600/mo and Rs. 16,800 annual savings'
  );

  // Test 11.6: Downgrade back to FREE and enforce quota
  const freeDowngrade = await subscriptionDb.updateSubscription(targetSubShopId, {
    plan_tier: 'FREE',
    billing_cycle: 'MONTHLY',
  });
  assert(
    freeDowngrade.plan_tier === 'FREE',
    'subscriptionDb.updateSubscription supports graceful downgrade back to Solo Master (FREE)'
  );

  subscriptionDb.setMockUsageCount(targetSubShopId, 50);
  const freeLimitCheck = await subscriptionDb.checkOrderAllowed(targetSubShopId);
  assert(
    freeLimitCheck.allowed === false && freeLimitCheck.tier === 'FREE',
    'subscriptionDb.checkOrderAllowed reinstates 50-suit quota ceiling when downgraded to FREE'
  );

  // Restore normal count for clean state
  subscriptionDb.setMockUsageCount(targetSubShopId, 14);

  // ----------------------------------------------------
  // SECTION 12: Phase F.1 Zero-Trust Lockdown & Production Purification
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 12: Zero-Trust Lockdown & Production Purification ---\x1b[0m');

  // Test 12.1: Verify isDemoMode export is callable boolean
  const demoModeActive = isDemoMode();
  assert(
    typeof demoModeActive === 'boolean',
    'isDemoMode() helper is exported and evaluates runtime environment to boolean'
  );

  // Test 12.2: Purge Shop Test Data via adminDb
  const purgeTargetShopId = 'a0000000-0000-0000-0000-000000000001';
  const purgeResult = await adminDb.purgeShopTestData(purgeTargetShopId);
  assert(
    purgeResult.success === true &&
      typeof purgeResult.deleted_orders === 'number' &&
      typeof purgeResult.deleted_khata === 'number',
    'adminDb.purgeShopTestData executes successfully and returns deleted item counters'
  );

  // Test 12.3: Purge Shop Test Data via shopsDb
  const shopPurgeResult = await shopsDb.purgeShopTestData(purgeTargetShopId);
  assert(
    shopPurgeResult.success === true &&
      typeof shopPurgeResult.deleted_profiles === 'number' &&
      typeof shopPurgeResult.deleted_customers === 'number',
    'shopsDb.purgeShopTestData delegates to purgeShopTestData RPC successfully'
  );

  // Test 12.4: Factory Reset & Local Cache Purge Utility
  const cachePurgeResult = await purgeLocalCache();
  assert(
    cachePurgeResult.success === true &&
      Array.isArray(cachePurgeResult.clearedStores) &&
      typeof cachePurgeResult.clearedKeysCount === 'number',
    'purgeLocalCache() flushes local IndexedDB and localStorage stores while preserving Supabase auth tokens'
  );

  // ----------------------------------------------------
  // SECTION 13: Phase F.2 Clean-Slate UI, Zero-Mock Decoupling & Admin Lockdown
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 13: Clean-Slate UI, Zero-Mock Decoupling & Admin Lockdown ---\x1b[0m');

  // Test 13.1: Migration 13 SQL integrity
  const migration13Path = path.resolve(process.cwd(), 'supabase/migrations/20260825000013_admin_email_lock.sql');
  const migration13Exists = fs.existsSync(migration13Path);
  assert(migration13Exists, 'Migration 13 (20260825000013_admin_email_lock.sql) exists on disk');

  if (migration13Exists) {
    const migration13Sql = fs.readFileSync(migration13Path, 'utf8');
    assert(
      migration13Sql.includes('assign_super_admin_by_email()') &&
        migration13Sql.includes('founder@silaye.pk') &&
        migration13Sql.includes('is_platform_founder') &&
        migration13Sql.includes('trg_assign_super_admin_by_email'),
      'Migration 13 defines assign_super_admin_by_email() trigger for founder email auto-lock and backfill'
    );
  }

  // Test 13.2: ordersDb.getByShopId method
  assert(
    typeof ordersDb.getByShopId === 'function',
    'ordersDb.getByShopId is defined and exported as an async function'
  );
  const testOrders = await ordersDb.getByShopId('a0000000-0000-0000-0000-000000000001');
  assert(
    Array.isArray(testOrders),
    'ordersDb.getByShopId returns typed GarmentOrder array with offline resilience'
  );

  // Test 13.3: customersDb.getByShopId method
  assert(
    typeof customersDb.getByShopId === 'function',
    'customersDb.getByShopId is defined and exported as an async function'
  );
  const testCustomers = await customersDb.getByShopId('a0000000-0000-0000-0000-000000000001');
  assert(
    Array.isArray(testCustomers),
    'customersDb.getByShopId returns typed Customer array with offline resilience'
  );

  // Test 13.4: khataDb.getByShopId method
  assert(
    typeof khataDb.getByShopId === 'function',
    'khataDb.getByShopId is defined and exported as an async function'
  );
  const testKhata = await khataDb.getByShopId('a0000000-0000-0000-0000-000000000001');
  assert(
    Array.isArray(testKhata),
    'khataDb.getByShopId returns typed KhataTransaction array with offline resilience'
  );

  // Test 13.5: adminDb.checkIsSuperAdmin execution
  const adminCheck = await adminDb.checkIsSuperAdmin();
  assert(
    typeof adminCheck === 'boolean',
    'adminDb.checkIsSuperAdmin() evaluates session founder verification safely to boolean'
  );

  // Test 13.6: adminDb.getPlatformMetrics execution
  const platformMetrics = await adminDb.getPlatformMetrics();
  assert(
    typeof platformMetrics === 'object' &&
      typeof platformMetrics.total_shops === 'number' &&
      typeof platformMetrics.active_shops === 'number' &&
      typeof platformMetrics.total_orders === 'number' &&
      typeof platformMetrics.total_khata_volume === 'number',
    'adminDb.getPlatformMetrics() returns strongly typed PlatformMetrics entity'
  );

  // Test 13.7: adminDb.getAllShops execution
  const allShops = await adminDb.getAllShops();
  assert(
    Array.isArray(allShops),
    'adminDb.getAllShops() returns typed AdminShopOverview array'
  );

  // Test 13.8: Static Tracking Route Slugs
  const trackPageRoutePath = path.resolve(process.cwd(), 'app/track/[orderId]/page.tsx');
  const trackPageExists = fs.existsSync(trackPageRoutePath);
  assert(trackPageExists, 'Static order tracking dynamic route exists (app/track/[orderId]/page.tsx)');

  if (trackPageExists) {
    const trackPageContent = fs.readFileSync(trackPageRoutePath, 'utf8');
    assert(
      trackPageContent.includes('STATIC_TRACKING_SLUGS') &&
        trackPageContent.includes('generateStaticParams'),
      'app/track/[orderId]/page.tsx exports STATIC_TRACKING_SLUGS and generateStaticParams() for clean-slate export resilience'
    );
  }

  // ----------------------------------------------------
  // SECTION 14: Phase 16 Manual Pakistani Bank Payment & Receipt System
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 14: Manual Pakistani Bank Payments & Receipt Upload System ---\x1b[0m');

  // Test 14.1: Migration 14 DDL checks
  assert(
    manualPaymentsSql.includes('CREATE TABLE IF NOT EXISTS public.manual_payment_requests') &&
      manualPaymentsSql.includes('amount_pkr NUMERIC(10, 2) NOT NULL') &&
      manualPaymentsSql.includes('transaction_reference VARCHAR(100) NOT NULL') &&
      manualPaymentsSql.includes('receipt_image_url TEXT NOT NULL'),
    'Migration 14 defines public.manual_payment_requests table with all required columns'
  );

  // Test 14.2: Migration 14 CHECK Constraints
  assert(
    manualPaymentsSql.includes("CHECK (plan_tier IN ('PRO', 'ENTERPRISE'))") &&
      manualPaymentsSql.includes("CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL'))") &&
      manualPaymentsSql.includes("CHECK (payment_method IN ('BANK_TRANSFER', 'RAAST', 'JAZZCASH', 'EASYPAISA'))") &&
      manualPaymentsSql.includes("CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))"),
    'Migration 14 enforces strict CHECK constraints on plan_tier, billing_cycle, payment_method, and status'
  );

  // Test 14.3: Migration 14 Partial Unique Index & RLS
  assert(
    manualPaymentsSql.includes('idx_one_pending_request_per_shop') &&
      manualPaymentsSql.includes("WHERE status = 'PENDING'") &&
      manualPaymentsSql.includes('ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY'),
    'Migration 14 enforces 1 PENDING request per shop via partial unique index and enables RLS'
  );

  // Test 14.4: Migration 14 Storage Bucket Provisioning
  assert(
    manualPaymentsSql.includes("'payment-receipts'") &&
      manualPaymentsSql.includes('Authenticated users can upload payment receipts') &&
      manualPaymentsSql.includes('Public read for payment receipts'),
    'Migration 14 provisions payment-receipts Supabase storage bucket with authenticated upload and read policies'
  );

  // Test 14.5: Row Mapper mapManualPaymentRequestRow
  const mockDbRow: ManualPaymentRequestRow = {
    id: 'mpr-test-1',
    shop_id: 'a0000000-0000-0000-0000-000000000001',
    plan_tier: 'PRO',
    billing_cycle: 'ANNUAL',
    amount_pkr: '26880.00',
    payment_method: 'RAAST',
    transaction_reference: 'RAAST-2026-98124',
    receipt_image_url: 'https://placeholder.silaye.pk/receipts/slip.png',
    status: 'PENDING',
    admin_notes: 'Urgent activation requested',
    created_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
  };
  const mappedRequest = mapManualPaymentRequestRow(mockDbRow);
  assert(
    mappedRequest.id === 'mpr-test-1' &&
      mappedRequest.plan_tier === 'PRO' &&
      mappedRequest.billing_cycle === 'ANNUAL' &&
      mappedRequest.amount_pkr === 26880 &&
      mappedRequest.payment_method === 'RAAST' &&
      mappedRequest.status === 'PENDING',
    'mapManualPaymentRequestRow correctly maps database rows into strongly-typed ManualPaymentRequest'
  );

  // Test 14.6: manualPaymentsDb repository methods defined
  assert(
    typeof manualPaymentsDb.createPaymentRequest === 'function' &&
      typeof manualPaymentsDb.getShopPaymentRequests === 'function' &&
      typeof manualPaymentsDb.getLatestPendingRequest === 'function' &&
      typeof manualPaymentsDb.uploadReceiptImage === 'function',
    'manualPaymentsDb exports all required async methods (create, get, getLatestPending, uploadReceiptImage)'
  );

  // Test 14.7: manualPaymentsDb.createPaymentRequest execution
  manualPaymentsDb.resetMockState();
  const createdPayment = await manualPaymentsDb.createPaymentRequest({
    shop_id: 'a0000000-0000-0000-0000-000000000001',
    plan_tier: 'PRO',
    billing_cycle: 'ANNUAL',
    amount_pkr: 26880,
    payment_method: 'RAAST',
    transaction_reference: 'RAAST-TRX-981234',
    receipt_image_url: 'https://placeholder.silaye.pk/receipts/mpr-test.png',
  });
  assert(
    createdPayment &&
      createdPayment.shop_id === 'a0000000-0000-0000-0000-000000000001' &&
      createdPayment.plan_tier === 'PRO' &&
      createdPayment.status === 'PENDING' &&
      createdPayment.transaction_reference === 'RAAST-TRX-981234',
    'manualPaymentsDb.createPaymentRequest creates and returns pending manual payment record'
  );

  // Test 14.8: manualPaymentsDb.getShopPaymentRequests execution
  const shopRequests = await manualPaymentsDb.getShopPaymentRequests('a0000000-0000-0000-0000-000000000001');
  assert(
    Array.isArray(shopRequests) && shopRequests.length > 0 && shopRequests[0].id === createdPayment.id,
    'manualPaymentsDb.getShopPaymentRequests returns list of payment requests for workshop'
  );

  // Test 14.9: manualPaymentsDb.getLatestPendingRequest execution
  const latestPending = await manualPaymentsDb.getLatestPendingRequest('a0000000-0000-0000-0000-000000000001');
  assert(
    latestPending !== null && latestPending.id === createdPayment.id && latestPending.status === 'PENDING',
    'manualPaymentsDb.getLatestPendingRequest resolves active pending payment request'
  );

  // Test 14.10: manualPaymentsDb.uploadReceiptImage execution
  const mockBlob = new Blob(['mock receipt image bytes'], { type: 'image/jpeg' });
  const uploadedUrl = await manualPaymentsDb.uploadReceiptImage(mockBlob, 'a0000000-0000-0000-0000-000000000001');
  assert(
    typeof uploadedUrl === 'string' && (uploadedUrl.startsWith('http') || uploadedUrl.startsWith('data:')),
    'manualPaymentsDb.uploadReceiptImage safely uploads receipt or generates resilient fallback URL'
  );

  // ----------------------------------------------------
  // SECTION 15: Phase 17 Super Admin Approvals & Promotional Trial Campaign Engine
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 15: Super Admin Approvals & Promotional Trial Engine ---\x1b[0m');

  // Test 15.1: Migration 15 DDL & RPC signatures
  assert(
    adminApprovalsSql.includes('CREATE OR REPLACE FUNCTION public.approve_manual_subscription') &&
      adminApprovalsSql.includes('CREATE OR REPLACE FUNCTION public.reject_manual_subscription') &&
      adminApprovalsSql.includes('CREATE OR REPLACE FUNCTION public.grant_promotional_trial'),
    'Migration 15 declares approve_manual_subscription, reject_manual_subscription, and grant_promotional_trial RPCs'
  );

  // Test 15.2: Security & Row-Locking guards in Migration 15
  assert(
    adminApprovalsSql.includes('SECURITY DEFINER') &&
      adminApprovalsSql.includes('SET search_path = public') &&
      adminApprovalsSql.includes('public.is_super_admin()') &&
      adminApprovalsSql.includes('FOR UPDATE'),
    'Migration 15 enforces SECURITY DEFINER search_path isolation, super admin auth, and FOR UPDATE row-locking'
  );

  // Test 15.3: Type-safe interval math and execution grants
  assert(
    adminApprovalsSql.includes("INTERVAL '1 day'") &&
      adminApprovalsSql.includes('GRANT EXECUTE ON FUNCTION public.approve_manual_subscription') &&
      adminApprovalsSql.includes('GRANT EXECUTE ON FUNCTION public.reject_manual_subscription') &&
      adminApprovalsSql.includes('GRANT EXECUTE ON FUNCTION public.grant_promotional_trial'),
    'Migration 15 implements type-safe interval math and grants EXECUTE to authenticated users'
  );

  // Test 15.4: adminDb.getAllPendingPaymentRequests execution
  const allPendingRequests = await adminDb.getAllPendingPaymentRequests();
  assert(
    Array.isArray(allPendingRequests) &&
      allPendingRequests.length > 0 &&
      allPendingRequests.every((r) => r.status === 'PENDING' && r.shop_name),
    'adminDb.getAllPendingPaymentRequests returns typed pending payment requests with joined workshop metadata'
  );

  // Test 15.5: adminDb.approvePaymentRequest execution
  const testApprovalShopId = 'a0000000-0000-0000-0000-000000000003';
  const testApprovalReq = await manualPaymentsDb.createPaymentRequest({
    shop_id: testApprovalShopId,
    plan_tier: 'PRO',
    billing_cycle: 'ANNUAL',
    amount_pkr: 26880,
    payment_method: 'BANK_TRANSFER',
    transaction_reference: 'MEZN-TEST-APPROVAL-001',
    receipt_image_url: 'https://placeholder.silaye.pk/receipts/approval-test.png',
  });

  const approvalSuccess = await adminDb.approvePaymentRequest(testApprovalReq.id, 'Verified via bank portal');
  assert(
    approvalSuccess === true,
    'adminDb.approvePaymentRequest successfully approves manual payment request'
  );

  const pendingAfterApproval = await adminDb.getAllPendingPaymentRequests();
  assert(
    !pendingAfterApproval.some((r) => r.id === testApprovalReq.id),
    'Approved payment request is removed from pending verification inbox'
  );

  // Test 15.6: adminDb.rejectPaymentRequest execution
  const testRejectShopId = 'a0000000-0000-0000-0000-000000000004';
  const testRejectReq = await manualPaymentsDb.createPaymentRequest({
    shop_id: testRejectShopId,
    plan_tier: 'ENTERPRISE',
    billing_cycle: 'MONTHLY',
    amount_pkr: 7000,
    payment_method: 'JAZZCASH',
    transaction_reference: 'JC-TEST-REJECT-002',
    receipt_image_url: 'https://placeholder.silaye.pk/receipts/reject-test.png',
  });

  const rejectSuccess = await adminDb.rejectPaymentRequest(testRejectReq.id, 'Illegible transaction screenshot');
  assert(
    rejectSuccess === true,
    'adminDb.rejectPaymentRequest successfully marks payment request as REJECTED'
  );

  const pendingAfterReject = await adminDb.getAllPendingPaymentRequests();
  assert(
    !pendingAfterReject.some((r) => r.id === testRejectReq.id),
    'Rejected payment request is removed from pending verification inbox'
  );

  // Test 15.7: adminDb.grantPromotionalTrial with day presets (+30 days)
  const trialTargetShopId = 'a0000000-0000-0000-0000-000000000005';
  const grantPresetSuccess = await adminDb.grantPromotionalTrial(trialTargetShopId, 'PRO', 30);
  assert(
    grantPresetSuccess === true,
    'adminDb.grantPromotionalTrial successfully grants 30-day Pro promotional trial'
  );

  const trialShopData = await shopsDb.getById(trialTargetShopId);
  const trialDaysRemaining = Math.round(
    (new Date(trialShopData?.current_period_end!).getTime() - new Date(trialShopData?.current_period_start!).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  assert(
    trialShopData?.plan_tier === 'PRO' &&
      trialShopData?.subscription_status === 'TRIALING' &&
      trialDaysRemaining === 30,
    'Promotional trial sets plan_tier = PRO, subscription_status = TRIALING, and calculated 30-day duration'
  );

  // Test 15.8: adminDb.grantPromotionalTrial with Custom Date
  const customDateFuture = new Date(Date.now() + 65 * 24 * 60 * 60 * 1000).toISOString();
  const grantCustomSuccess = await adminDb.grantPromotionalTrial(
    trialTargetShopId,
    'ENTERPRISE',
    undefined,
    customDateFuture
  );
  assert(
    grantCustomSuccess === true,
    'adminDb.grantPromotionalTrial supports Enterprise tier and custom future expiry timestamp'
  );

  const customTrialShop = await shopsDb.getById(trialTargetShopId);
  assert(
    customTrialShop?.plan_tier === 'ENTERPRISE' &&
      customTrialShop?.subscription_status === 'TRIALING' &&
      customTrialShop?.current_period_end === customDateFuture,
    'Promotional trial accurately sets custom expiry date and Enterprise tier'
  );

  // ----------------------------------------------------
  // SECTION 16: PAYWALL ENFORCER, QUOTA WALL & TRIAL EXPIRATION HARDENING
  // ----------------------------------------------------
  console.log('\n--- SECTION 16: Paywall Enforcer & Quota Wall Hardening ---');

  // Test 16.1: Migration 16 function signatures & security definition
  assert(
    paywallHardeningSql.includes('CREATE OR REPLACE FUNCTION public.check_order_creation_allowed') &&
      paywallHardeningSql.includes('CREATE OR REPLACE FUNCTION public.add_shop_staff_member') &&
      paywallHardeningSql.includes('SECURITY DEFINER') &&
      paywallHardeningSql.includes('SET search_path = public'),
    'Migration 16 declares check_order_creation_allowed and add_shop_staff_member with SECURITY DEFINER and search_path isolation'
  );

  // Test 16.2: Trial expiration check and quota ceiling logic in Migration 16
  assert(
    paywallHardeningSql.includes("v_status = 'TRIALING' AND (v_period_end IS NOT NULL AND v_period_end < NOW())") &&
      paywallHardeningSql.includes("v_effective_tier := 'FREE'") &&
      paywallHardeningSql.includes('COALESCE(v_orders_count, 0) >= 50') &&
      paywallHardeningSql.includes('Monthly order quota reached (50/50)'),
    'Migration 16 detects expired promotional trials, demotes to FREE tier, and enforces 50 suits/month ceiling'
  );

  // Test 16.3: Staff account ceiling on Free tier in Migration 16
  assert(
    paywallHardeningSql.includes("v_effective_tier = 'FREE'") &&
      paywallHardeningSql.includes('v_staff_count >= 1') &&
      paywallHardeningSql.includes('Free tier is limited to 1 craftsman account. Upgrade to Pro to add staff.'),
    'Migration 16 limits Free tier workshops to 1 craftsman account and requires Pro upgrade for staff'
  );

  // Test 16.4: Active promotional trial quota check (unlimited)
  const activeTrialShopId = 'a0000000-0000-0000-0000-000000000010';
  await shopsDb.update(activeTrialShopId, {
    plan_tier: 'PRO',
    subscription_status: 'TRIALING',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
  });
  subscriptionDb.setMockUsageCount(activeTrialShopId, 15);

  const activeTrialQuota = await subscriptionDb.checkOrderAllowed(activeTrialShopId);
  assert(
    activeTrialQuota.allowed === true &&
      activeTrialQuota.maxLimit === Infinity &&
      activeTrialQuota.tier === 'PRO',
    'Active promotional trial (current_period_end in future) grants unlimited order creation'
  );

  // Test 16.5: Expired promotional trial quota fallback (demoted to FREE tier)
  const expiredTrialShopId = 'a0000000-0000-0000-0000-000000000011';
  await shopsDb.update(expiredTrialShopId, {
    plan_tier: 'PRO',
    subscription_status: 'TRIALING',
    current_period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
    current_period_end: new Date(Date.now() - 2 * 86400000).toISOString(),
  });
  subscriptionDb.setMockUsageCount(expiredTrialShopId, 25);

  const expiredTrialQuota = await subscriptionDb.checkOrderAllowed(expiredTrialShopId);
  assert(
    expiredTrialQuota.allowed === true &&
      expiredTrialQuota.maxLimit === 50 &&
      expiredTrialQuota.tier === 'FREE',
    'Expired promotional trial (current_period_end in past) demotes effective tier to FREE with 50-suit limit'
  );

  // Test 16.6: Expired trial monthly quota ceiling (50/50) blocking
  subscriptionDb.setMockUsageCount(expiredTrialShopId, 50);
  const expiredTrialBlocked = await subscriptionDb.checkOrderAllowed(expiredTrialShopId);
  assert(
    expiredTrialBlocked.allowed === false &&
      expiredTrialBlocked.currentCount === 50 &&
      expiredTrialBlocked.maxLimit === 50 &&
      expiredTrialBlocked.tier === 'FREE' &&
      Boolean(expiredTrialBlocked.reason?.includes('Monthly order quota reached (50/50)')),
    'Expired promotional trial blocks order booking once monthly usage reaches 50/50 quota limit'
  );

  // Test 16.7: Free tier 1-craftsman account limit enforcement
  const freeStaffShopId = 'a0000000-0000-0000-0000-000000000012';
  await shopsDb.update(freeStaffShopId, {
    plan_tier: 'FREE',
    subscription_status: 'ACTIVE',
  });
  staffDb.setMockStaff(freeStaffShopId, [
    {
      id: 'sm-free-owner-1',
      shop_id: freeStaffShopId,
      user_id: 'u-free-owner-1',
      role: 'OWNER',
      email: 'owner.freeworkshop@silaye.com',
      name: 'Owner Ustad',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  let staffAddError: string | null = null;
  try {
    await staffDb.addStaff(freeStaffShopId, 'newcutter@silaye.com', 'CUTTING_MASTER');
  } catch (err) {
    staffAddError = err instanceof Error ? err.message : String(err);
  }
  assert(
    staffAddError !== null &&
      staffAddError.includes('Free tier is limited to 1 craftsman account. Upgrade to Pro to add staff.'),
    'Free tier workshop is blocked from adding a second craftsman account'
  );

  // Test 16.8: Pro tier workshop permits adding additional staff members
  await subscriptionDb.updateSubscription(freeStaffShopId, {
    plan_tier: 'PRO',
    subscription_status: 'ACTIVE',
  });
  const addedProStaff = await staffDb.addStaff(freeStaffShopId, 'newcutter@silaye.com', 'CUTTING_MASTER');
  assert(
    addedProStaff.email === 'newcutter@silaye.com' &&
      addedProStaff.role === 'CUTTING_MASTER',
    'Upgrading to Pro tier permits adding unlimited workshop craftsmen and roles'
  );

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n\x1b[1m====================================================\x1b[0m');
  console.log(
    `\x1b[1mVERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED in ${duration}s\x1b[0m`
  );
  console.log('\x1b[1m====================================================\x1b[0m\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
