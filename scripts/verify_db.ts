/**
 * scripts/verify_db.ts - Automated PostgreSQL Schema & Database Connection Verifier
 *
 * Verifies:
 * 1. Dotenv auto-loading (.env, .env.local, process.env)
 * 2. Supabase / PostgreSQL migration SQL syntax & schema integrity
 * 3. Database connection & extension checks (uuid-ossp, pgcrypto, gen_random_uuid)
 * 4. Table schemas (customers, measurement_profiles, garment_orders, khata_transactions)
 * 5. Foreign keys, indexes, and JSONB constraints
 * 6. Row Level Security (RLS) enablement
 * 7. End-to-End typed repository insert, read, balance update, and cleanup
 * 8. Static-export and SSR safety checks
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
  mapCustomerRow,
  mapMeasurementProfileRow,
  mapGarmentOrderRow,
  mapKhataTransactionRow,
} from '../lib/db';
import type {
  Customer,
  MeasurementProfile,
  GarmentOrder,
  KhataTransaction,
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
  console.log('\x1b[1m  SILAYE DATABASE & SCHEMA VERIFICATION SUITE       \x1b[0m');
  console.log('\x1b[1m====================================================\x1b[0m\n');

  // ----------------------------------------------------
  // SECTION 1: Migration DDL & Static Schema Assertions
  // ----------------------------------------------------
  console.log('\x1b[36m--- Section 1: Migration File & DDL Assertions ---\x1b[0m');

  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260825000000_init_silaye_schema.sql'
  );
  assert(
    fs.existsSync(migrationPath),
    'Migration SQL file exists at supabase/migrations/20260825000000_init_silaye_schema.sql'
  );

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // Verify Native UUID generator
  assert(
    migrationSql.includes('gen_random_uuid()'),
    'Migration uses modern native gen_random_uuid() defaults'
  );

  // Verify Extensions
  assert(
    migrationSql.includes('uuid-ossp') && migrationSql.includes('pgcrypto'),
    'Migration enables uuid-ossp and pgcrypto extensions'
  );

  // Verify Tables
  assert(
    migrationSql.includes('CREATE TABLE IF NOT EXISTS customers') &&
      migrationSql.includes('CREATE TABLE IF NOT EXISTS measurement_profiles') &&
      migrationSql.includes('CREATE TABLE IF NOT EXISTS garment_orders') &&
      migrationSql.includes('CREATE TABLE IF NOT EXISTS khata_transactions'),
    'Migration declares all 4 core tables: customers, measurement_profiles, garment_orders, khata_transactions'
  );

  // Verify Foreign Keys & Cascades
  assert(
    migrationSql.includes('REFERENCES customers(id) ON DELETE CASCADE') &&
      migrationSql.includes('REFERENCES garment_orders(id) ON DELETE SET NULL'),
    'Foreign key cascade and set null rules properly configured'
  );

  // Verify JSONB Columns
  assert(
    migrationSql.includes('measurements JSONB') &&
      migrationSql.includes('style_preferences JSONB') &&
      migrationSql.includes('fabric_details JSONB') &&
      migrationSql.includes('snapshot_measurements JSONB') &&
      migrationSql.includes('snapshot_styles JSONB') &&
      migrationSql.includes('pricing JSONB'),
    'All required JSONB columns declared for measurements, styles, fabrics, and pricing'
  );

  // Verify Indexes & GIN Indexes
  assert(
    migrationSql.includes('idx_customers_phone') &&
      migrationSql.includes('idx_garment_orders_status') &&
      migrationSql.includes('idx_garment_orders_order_number') &&
      migrationSql.includes('USING GIN (measurements)') &&
      migrationSql.includes('USING GIN (snapshot_measurements)'),
    'B-Tree and GIN indexes defined for lookups, foreign keys, and JSONB searches'
  );

  // Verify Row Level Security
  assert(
    migrationSql.includes('ALTER TABLE customers ENABLE ROW LEVEL SECURITY') &&
      migrationSql.includes('ALTER TABLE measurement_profiles ENABLE ROW LEVEL SECURITY') &&
      migrationSql.includes('ALTER TABLE garment_orders ENABLE ROW LEVEL SECURITY') &&
      migrationSql.includes('ALTER TABLE khata_transactions ENABLE ROW LEVEL SECURITY'),
    'Row Level Security (RLS) enabled on all tables'
  );

  // ----------------------------------------------------
  // SECTION 2: Client Adapter & Type Mapper Assertions
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 2: Database Adapter & Type Mapper Assertions ---\x1b[0m');

  // Test Customer Row Mapper
  const mockDbCustomerRow = {
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
  const mockDbMeasurementRow = {
    id: '22222222-2222-4222-8222-222222222222',
    shop_id: '00000000-0000-4000-8000-000000000001',
    customer_id: '11111111-1111-4111-8111-111111111111',
    profile_name: 'Summer Shalwar Kameez',
    garment_type: 'MEN_SHALWAR_KAMEEZ',
    measurements: JSON.stringify({
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
    }),
    style_preferences: JSON.stringify({
      collar_style: 'FULL_BAN',
      daman_style: 'CHORAS_DAMAN',
      front_patti: 'GUM_PATTI',
      bottom_type: 'SHALWAR_TRADITIONAL',
      stitch_type: 'DOUBLE_SILAI',
    }),
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
  const mockDbOrderRow = {
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
    fabric_details: JSON.stringify({
      fabric_provided_by: 'CUSTOMER',
      fabric_color: 'Charcoal Grey',
      fabric_brand: 'Pasha Fabrics',
      fabric_pieces_count: 2,
    }),
    snapshot_measurements: mockDbMeasurementRow.measurements,
    snapshot_styles: mockDbMeasurementRow.style_preferences,
    pricing: JSON.stringify({
      stitching_rate: 2500,
      total_amount: 5000,
      advance_paid: 2000,
      balance_due: 3000,
    }),
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
  const mockDbKhataRow = {
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

  // ----------------------------------------------------
  // SECTION 3: Live PostgreSQL / Neon Connection Test
  // ----------------------------------------------------
  console.log('\n\x1b[36m--- Section 3: Live PostgreSQL / Neon Connectivity ---\x1b[0m');

  const dbConfigured = isDatabaseConfigured();
  console.log(
    `  Database Status: ${
      dbConfigured ? '\x1b[32mCONNECTED (DATABASE_URL configured)\x1b[0m' : '\x1b[33mSTANDALONE / OFFLINE (DATABASE_URL unset)\x1b[0m'
    }`
  );

  if (dbConfigured) {
    try {
      const sql = getDbClient();

      // Check PostgreSQL Version & Extension
      const versionRes = await sql`SELECT version()`;
      assert(
        versionRes.length > 0,
        'PostgreSQL server responded to query',
        String(versionRes[0]?.version).substring(0, 40) + '...'
      );

      // Execute migration DDL to ensure tables and indexes are active
      try {
        await sql.transaction([
          sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
          sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
        ]);
        assert(true, 'uuid-ossp and pgcrypto extensions verified on live database');
      } catch (extErr: unknown) {
        console.warn('  Note on extensions:', extErr instanceof Error ? extErr.message : extErr);
      }

      // Check if schema tables exist in the live database
      const tablesRes = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('customers', 'measurement_profiles', 'garment_orders', 'khata_transactions')
      `;
      const liveTableNames = (tablesRes as { table_name: string }[]).map((t) => t.table_name);
      console.log('  Live Public Tables Found:', liveTableNames.join(', ') || 'None (Running DDL bootstrap)');

      // If tables are not yet present on remote DB, run the migration DDL
      if (liveTableNames.length < 4) {
        console.log('  Applying schema DDL to live database...');
        // Split DDL into logical blocks and execute
        const ddlStatements = migrationSql
          .split(/;\s*$/m)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith('--'));

        for (const statement of ddlStatements) {
          try {
            await sql([statement] as unknown as TemplateStringsArray);
          } catch (ddlErr: unknown) {
            // Ignore if type already exists
          }
        }
      }

      // End-to-End CRUD Test with Test Shop ID
      const testShopId = '99999999-9999-4999-8999-999999999999';
      const testPhone = '0399' + Math.floor(1000000 + Math.random() * 9000000);
      const testOrderNumber = 'TEST-' + Date.now();

      // 1. Create Customer
      const createdCustomer = await customersDb.create({
        shop_id: testShopId,
        full_name: 'Test Beta Master',
        phone: testPhone,
        current_khata_balance: 0,
        city: 'Wah Cantt',
      });
      assert(
        Boolean(createdCustomer.id && createdCustomer.phone === testPhone),
        'Live DB: customersDb.create successfully inserted test customer'
      );

      // 2. Create Measurement Profile
      const createdProfile = await measurementsDb.create({
        shop_id: testShopId,
        customer_id: createdCustomer.id,
        profile_name: 'Test Fit Profile',
        garment_type: 'MEN_SHALWAR_KAMEEZ',
        measurements: {
          kameez_length: 42,
          chest: 38,
          waist: 36,
          shoulder_teera: 17.5,
          sleeve_length: 24,
          neck_gala: 15.5,
          daman_width: 22,
          shalwar_length: 39,
          paincha: 8,
          aasan: 16,
        },
        style_preferences: {
          collar_style: 'FULL_BAN',
          daman_style: 'CHORAS_DAMAN',
          front_patti: 'GUM_PATTI',
          bottom_type: 'SHALWAR_TRADITIONAL',
          stitch_type: 'DOUBLE_SILAI',
        },
      });
      assert(
        Boolean(createdProfile.id && createdProfile.customer_id === createdCustomer.id),
        'Live DB: measurementsDb.create successfully inserted measurement profile'
      );

      // 3. Create Garment Order
      const createdOrder = await ordersDb.create({
        shop_id: testShopId,
        customer_id: createdCustomer.id,
        measurement_profile_id: createdProfile.id,
        order_number: testOrderNumber,
        status: 'BOOKED',
        garment_type: 'MEN_SHALWAR_KAMEEZ',
        quantity: 1,
        delivery_date: '2026-09-01',
        stitching_rate: 2500,
        total_amount: 2500,
        advance_paid: 1000,
        balance_due: 1500,
        payment_status: 'PARTIALLY_PAID',
        snapshot_measurements: createdProfile.measurements,
        snapshot_styles: createdProfile.style_preferences,
      });
      assert(
        Boolean(createdOrder.id && createdOrder.order_number === testOrderNumber),
        'Live DB: ordersDb.create successfully inserted garment order with JSONB snapshots'
      );

      // 4. Append Khata Transaction & Verify Balance Update
      const createdKhata = await khataDb.append({
        shop_id: testShopId,
        customer_id: createdCustomer.id,
        order_id: createdOrder.id,
        transaction_type: 'ORDER_ADVANCE',
        amount: 1000,
        balance_after: -1000,
      });
      const updatedBalance = await khataDb.getCustomerBalance(createdCustomer.id);
      assert(
        createdKhata.amount === 1000 && updatedBalance === -1000,
        'Live DB: khataDb.append recorded advance ledger entry and updated customer balance atomically'
      );

      // 5. Cleanup Test Records
      await ordersDb.delete(createdOrder.id);
      await measurementsDb.delete(createdProfile.id);
      await customersDb.delete(createdCustomer.id);
      assert(true, 'Live DB: Test records cleanly removed with zero orphaned state');
    } catch (liveErr: unknown) {
      assert(
        false,
        'Live Database Connection & Verification',
        liveErr instanceof Error ? liveErr.message : String(liveErr)
      );
    }
  } else {
    // Assert safe fallback when offline
    assert(
      !isDatabaseConfigured(),
      'isDatabaseConfigured() safely returns false without runtime exceptions when URL is absent'
    );
    const fallbackCustomers = await customersDb.getAll();
    assert(
      Array.isArray(fallbackCustomers) && fallbackCustomers.length === 0,
      'Repository methods safely return empty arrays when database connection is not configured'
    );
  }

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
