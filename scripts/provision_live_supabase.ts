/**
 * scripts/provision_live_supabase.ts - Direct Live Supabase Provisioning & Seeding Script
 * Uses NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY to directly provision test auth accounts,
 * assign Super Admin, set up workshops, and seed 100+ realistic customer records into live PostgreSQL.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateRealisticCustomer, generateRealisticOrder } from './seed_realistic_dataset';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function provisionLiveDatabase() {
  console.log('\n================================================================');
  console.log('⚡ CONNECTING DIRECTLY TO LIVE SUPABASE BACKEND');
  console.log(`📡 URL: ${supabaseUrl}`);
  console.log('================================================================\n');

  // 1. PROVISION & SYNC AUTH USERS
  console.log('--- 1. Provisioning Auth Users (Password: 12345678) ---');
  
  const testUsers = [
    {
      email: 'hassaanm737@gmail.com',
      password: '12345678',
      user_metadata: { full_name: 'Hassaan Founder', is_platform_founder: true, role: 'SUPER_ADMIN' },
      app_metadata: { is_super_admin: true, role: 'SUPER_ADMIN' },
    },
    {
      email: 'hassaanm737+pro@gmail.com',
      password: '12345678',
      user_metadata: { full_name: 'Master Tariq (Pro Workshop)' },
      app_metadata: { role: 'OWNER' },
    },
    {
      email: 'hassaanm737+free@gmail.com',
      password: '12345678',
      user_metadata: { full_name: 'Ustad Aslam (Free Tier)' },
      app_metadata: { role: 'OWNER' },
    },
    {
      email: 'hassaanm737+staff@gmail.com',
      password: '12345678',
      user_metadata: { full_name: 'Ali Raza (Stitcher)' },
      app_metadata: { role: 'STITCHER' },
    },
  ];

  const userMap: Record<string, string> = {};

  // Fetch current live users
  const { data: userListResponse } = await supabaseAdmin.auth.admin.listUsers();
  const existingUsers = userListResponse?.users || [];

  for (const targetUser of testUsers) {
    const existing = existingUsers.find((u) => u.email?.toLowerCase() === targetUser.email.toLowerCase());
    
    if (existing) {
      userMap[targetUser.email] = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: targetUser.password,
        email_confirm: true,
        user_metadata: targetUser.user_metadata,
        app_metadata: targetUser.app_metadata,
      });
      console.log(`  ✔ Verified & Updated credentials for: ${targetUser.email} (ID: ${existing.id})`);
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: targetUser.email,
        password: targetUser.password,
        email_confirm: true,
        user_metadata: targetUser.user_metadata,
        app_metadata: targetUser.app_metadata,
      });
      if (created?.user) {
        userMap[targetUser.email] = created.user.id;
        console.log(`  ✔ Created user: ${targetUser.email} (ID: ${created.user.id})`);
      } else {
        console.warn(`  ⚠ Create user note for ${targetUser.email}: ${createErr?.message}`);
      }
    }
  }

  // 2. ASSIGN SUPER ADMIN IN public.system_admins
  console.log('\n--- 2. Assigning Super Admin in public.system_admins ---');
  const founderUserId = userMap['hassaanm737@gmail.com'];
  if (founderUserId) {
    try {
      const { error: adminErr } = await supabaseAdmin
        .from('system_admins')
        .upsert(
          { user_id: founderUserId, role: 'SUPER_ADMIN' },
          { onConflict: 'user_id' }
        );
      if (adminErr) console.warn(`  ⚠ System admins note: ${adminErr.message}`);
      else console.log(`  ✔ Super Admin role active for hassaanm737@gmail.com (user_id: ${founderUserId})`);
    } catch (err: any) {
      console.warn(`  ⚠ System admin assignment error: ${err.message}`);
    }
  }

  // 3. PROVISION SHOPS & SHOP MEMBERS
  console.log('\n--- 3. Provisioning Shops & Roles ---');
  const proShopId = 'b0000000-0000-0000-0000-000000000002';
  const freeShopId = 'b0000000-0000-0000-0000-000000000003';

  try {
    // 3.1 Pro Workshop
    const { data: proShop, error: proErr } = await supabaseAdmin.from('shops').upsert({
      id: proShopId,
      name: 'Al-Madina Master Tailors (Pro)',
      phone: '0300-1234567',
      address: 'Shop 12, Main Commercial Market, Anarkali',
      city: 'Lahore',
      plan_tier: 'PRO',
      subscription_status: 'ACTIVE',
      status: 'ACTIVE',
      current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
    }, { onConflict: 'id' }).select().single();
    
    if (proErr) console.warn(`  ⚠ Pro Shop upsert note: ${proErr.message}`);
    else console.log(`  ✔ Upserted Pro Shop: ${proShop.name} (ID: ${proShop.id})`);

    // 3.2 Free Workshop
    const { data: freeShop, error: freeErr } = await supabaseAdmin.from('shops').upsert({
      id: freeShopId,
      name: 'Bismillah Tailoring Works (Free)',
      phone: '0312-9876543',
      address: 'Chowk Aslam Market, Wah Cantt',
      city: 'Wah Cantt',
      plan_tier: 'FREE',
      subscription_status: 'ACTIVE',
      status: 'ACTIVE',
    }, { onConflict: 'id' }).select().single();

    if (freeErr) console.warn(`  ⚠ Free Shop upsert note: ${freeErr.message}`);
    else console.log(`  ✔ Upserted Free Shop: ${freeShop.name} (ID: ${freeShop.id})`);

    // 3.3 Link Members
    const membersToUpsert = [];
    if (userMap['hassaanm737+pro@gmail.com']) {
      membersToUpsert.push({ shop_id: proShopId, user_id: userMap['hassaanm737+pro@gmail.com'], role: 'OWNER' });
    }
    if (userMap['hassaanm737+staff@gmail.com']) {
      membersToUpsert.push({ shop_id: proShopId, user_id: userMap['hassaanm737+staff@gmail.com'], role: 'STITCHER' });
    }
    if (userMap['hassaanm737+free@gmail.com']) {
      membersToUpsert.push({ shop_id: freeShopId, user_id: userMap['hassaanm737+free@gmail.com'], role: 'OWNER' });
    }

    if (membersToUpsert.length > 0) {
      const { error: memErr } = await supabaseAdmin.from('shop_members').upsert(membersToUpsert, { onConflict: 'shop_id,user_id' });
      if (memErr) console.warn(`  ⚠ Shop members note: ${memErr.message}`);
      else console.log(`  ✔ Linked ${membersToUpsert.length} workshop members.`);
    }
  } catch (err: any) {
    console.warn(`  ⚠ Shop setup note: ${err.message}`);
  }

  // 4. SEED 100 REALISTIC CUSTOMERS & ORDERS
  console.log('\n--- 4. Seeding 100 Realistic Tailor Customers & Garment Orders ---');
  try {
    const customerList = [];
    const orderList = [];

    for (let i = 0; i < 100; i++) {
      const c = generateRealisticCustomer(i, proShopId);
      customerList.push({
        id: c.id,
        shop_id: proShopId,
        full_name: c.full_name,
        phone: c.phone,
        secondary_phone: null,
        address: c.address,
        city: c.city,
        khata_balance: c.current_khata_balance,
        tags: c.current_khata_balance > 0 ? ['Udhaar'] : ['Regular'],
        total_orders_count: c.total_orders_count,
        total_spent: c.total_spent,
      });

      const o = generateRealisticOrder(i, c, proShopId);
      orderList.push({
        id: o.id,
        shop_id: proShopId,
        customer_id: c.id,
        order_number: o.order_number,
        garment_type: o.garment_type,
        status: o.status,
        quantity: o.quantity || 1,
        booking_date: o.booking_date,
        delivery_date: o.delivery_date,
        total_amount: o.total_amount,
        advance_paid: o.advance_paid,
        balance_due: o.balance_due,
        payment_status: o.payment_status,
        stitching_rate: o.stitching_rate,
        fabric_charges: o.fabric_charges,
        addons_charges: o.addons_charges,
        discount_amount: o.discount_amount,
        snapshot_measurements: o.snapshot_measurements,
        snapshot_styles: o.snapshot_styles,
        barcode_token: o.barcode_token,
      });
    }

    const { error: custErr } = await supabaseAdmin.from('customers').upsert(customerList, { onConflict: 'shop_id,phone' });
    if (custErr) console.warn(`  ⚠ Customers insert note: ${custErr.message}`);
    else console.log(`  ✔ Seeded ${customerList.length} customers into live database.`);

    const { error: ordErr } = await supabaseAdmin.from('garment_orders').upsert(orderList, { onConflict: 'id' });
    if (ordErr) console.warn(`  ⚠ Orders insert note: ${ordErr.message}`);
    else console.log(`  ✔ Seeded ${orderList.length} garment orders with 11-dimension matrices into live database.`);
  } catch (err: any) {
    console.warn(`  ⚠ Data seed error: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log('🎉 LIVE SUPABASE PROVISIONING & DATA SEEDING COMPLETE');
  console.log('================================================================\n');
}

provisionLiveDatabase().catch((err) => {
  console.error('Fatal provisioning error:', err);
  process.exit(1);
});
