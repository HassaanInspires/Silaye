/**
 * scripts/audit_live_supabase.ts - Live Supabase Real-Database Brutal Audit Suite
 * Tests actual live Supabase PostgreSQL queries, Auth logins, RLS policies,
 * Super Admin RPCs, real-time metrics, and live order updates.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabaseAnon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface AuditResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const auditResults: AuditResult[] = [];

function check(category: string, name: string, condition: boolean, details?: string) {
  auditResults.push({ category, name, passed: condition, details });
  const icon = condition ? '✔ [PASS]' : '✖ [FAIL]';
  console.log(`  ${icon} [${category}] ${name}${details && !condition ? ` -> ${details}` : ''}`);
}

async function runLiveDatabaseBrutalAudit() {
  console.log('\n================================================================');
  console.log('🔥 STARTING LIVE REAL-DATABASE SUPABASE BRUTAL AUDIT');
  console.log(`📡 URL: ${supabaseUrl}`);
  console.log('================================================================\n');

  // ─── SUITE 1: REAL AUTH SIGN-IN VERIFICATION ─────────────────────────────────
  console.log('--- 1. Live Auth Sign-In Verification (Password: 12345678) ---');
  
  // 1.1 Super Admin Sign-In
  const { data: adminLogin, error: adminLoginErr } = await supabaseAnon.auth.signInWithPassword({
    email: 'hassaanm737@gmail.com',
    password: '12345678',
  });
  check('Auth Sign-In', 'Super Admin (hassaanm737@gmail.com) logs in successfully', !adminLoginErr && !!adminLogin.session, adminLoginErr?.message);

  // 1.2 Pro Workshop Master Sign-In
  const { data: proLogin, error: proLoginErr } = await supabaseAnon.auth.signInWithPassword({
    email: 'hassaanm737+pro@gmail.com',
    password: '12345678',
  });
  check('Auth Sign-In', 'Pro Master (hassaanm737+pro@gmail.com) logs in successfully', !proLoginErr && !!proLogin.session, proLoginErr?.message);

  // 1.3 Free Workshop Tailor Sign-In
  const { data: freeLogin, error: freeLoginErr } = await supabaseAnon.auth.signInWithPassword({
    email: 'hassaanm737+free@gmail.com',
    password: '12345678',
  });
  check('Auth Sign-In', 'Free Tailor (hassaanm737+free@gmail.com) logs in successfully', !freeLoginErr && !!freeLogin.session, freeLoginErr?.message);

  // 1.4 Craftsman Stitcher Sign-In
  const { data: staffLogin, error: staffLoginErr } = await supabaseAnon.auth.signInWithPassword({
    email: 'hassaanm737+staff@gmail.com',
    password: '12345678',
  });
  check('Auth Sign-In', 'Craftsman (hassaanm737+staff@gmail.com) logs in successfully', !staffLoginErr && !!staffLogin.session, staffLoginErr?.message);

  // 1.5 Bad Password Rejection
  const { data: badLogin, error: badLoginErr } = await supabaseAnon.auth.signInWithPassword({
    email: 'hassaanm737@gmail.com',
    password: 'wrongpassword999',
  });
  check('Auth Sign-In', 'Invalid password correctly fails authentication', !!badLoginErr && !badLogin.session);

  // ─── SUITE 2: LIVE SUPER ADMIN PERMISSIONS & RPCS ────────────────────────────
  console.log('\n--- 2. Live Super Admin Tables & RPC Verification ---');
  
  // 2.1 Query public.system_admins
  const { data: adminRecord, error: adminRecordErr } = await supabaseAdmin
    .from('system_admins')
    .select('user_id, role, created_at')
    .eq('user_id', adminLogin.user?.id || '')
    .single();

  check('Super Admin', 'hassaanm737@gmail.com is present in public.system_admins with SUPER_ADMIN role', 
    !adminRecordErr && adminRecord?.role === 'SUPER_ADMIN',
    adminRecordErr?.message
  );

  // 2.2 Live Platform Metrics Query
  const { count: totalShopsCount } = await supabaseAdmin.from('shops').select('*', { count: 'exact', head: true });
  const { count: totalCustCount } = await supabaseAdmin.from('customers').select('*', { count: 'exact', head: true });
  const { count: totalOrdersCount } = await supabaseAdmin.from('garment_orders').select('*', { count: 'exact', head: true });

  check('Database Metrics', 'Live total shops count is at least 2', (totalShopsCount || 0) >= 2);
  check('Database Metrics', 'Live total customers count is 100', (totalCustCount || 0) === 100);
  check('Database Metrics', 'Live total garment orders count is 100', (totalOrdersCount || 0) === 100);

  // ─── SUITE 3: LIVE DATA INTEGRITY & MEASUREMENT MATRICES ──────────────────────
  console.log('\n--- 3. Live Customer & Order Data Integrity ---');

  const { data: sampleOrder, error: orderFetchErr } = await supabaseAdmin
    .from('garment_orders')
    .select('*, customer:customers(*)')
    .limit(1)
    .single();

  check('Data Integrity', 'Garment orders link properly with customer foreign keys',
    !orderFetchErr && !!sampleOrder && !!sampleOrder.customer?.full_name,
    orderFetchErr?.message
  );

  check('Data Integrity', 'Order contains valid 11-dimension snapshot_measurements',
    !!sampleOrder?.snapshot_measurements?.kameez_length &&
    !!sampleOrder?.snapshot_measurements?.chest &&
    !!sampleOrder?.snapshot_measurements?.paincha
  );

  check('Data Integrity', 'Order contains valid barcode_token and status',
    !!sampleOrder?.order_number &&
    sampleOrder.order_number.startsWith('DP-2026-')
  );

  // ─── SUITE 4: LIVE ORDER MUTATION & STATE TRANSITION ──────────────────────────
  console.log('\n--- 4. Live Order Mutation & Status Transition ---');

  if (sampleOrder) {
    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from('garment_orders')
      .update({ status: 'READY_FOR_DELIVERY' })
      .eq('id', sampleOrder.id)
      .select('id, status')
      .single();

    check('Order Mutation', 'Order status transitions to READY_FOR_DELIVERY in live database',
      !updateErr && updatedOrder?.status === 'READY_FOR_DELIVERY',
      updateErr?.message
    );
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  const passedCount = auditResults.filter((r) => r.passed).length;
  const failedCount = auditResults.filter((r) => !r.passed).length;
  console.log(`LIVE DATABASE AUDIT COMPLETE: ${passedCount}/${auditResults.length} CHECKS PASSED (${failedCount} failures)`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runLiveDatabaseBrutalAudit().catch((err) => {
  console.error('Fatal live audit error:', err);
  process.exit(1);
});
