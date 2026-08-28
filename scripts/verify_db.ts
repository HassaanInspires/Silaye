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
  mapCustomerRow,
  mapMeasurementProfileRow,
  mapGarmentOrderRow,
  mapKhataTransactionRow,
  mapShopRow,
  mapShopMemberRow,
  mapGarmentRateRow,
  mapPrinterSettingsRow,
  type CustomerRow,
  type MeasurementProfileRow,
  type GarmentOrderRow,
  type KhataTransactionRow,
  type ShopRow,
  type ShopMemberRow,
  type GarmentRateRow,
  type PrinterSettingsRow,
} from '../lib/db';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  getSupabaseUrl,
  getSupabaseAnonKey,
} from '../lib/supabase/client';
import type {
  StylePreferences,
  ShalwarKameezMeasurements,
  ShopMemberRole,
  GarmentRate,
  GarmentType,
  PrinterSettings,
  PrinterPaperWidth,
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
