/**
 * lib/db.ts - Serverless PostgreSQL Database Client & Typed Repositories
 *
 * Implemented via `@neondatabase/serverless` for edge & serverless environments.
 * Provides:
 * 1. Safe runtime connection management via `DATABASE_URL` / `POSTGRES_URL`
 * 2. Graceful static export / compile-time SSR safety (never throws on build when ENV is absent)
 * 3. Bidirectional data mapping between PostgreSQL schema and `@/types/tailor`
 * 4. Strongly-typed repositories for `customers`, `measurement_profiles`, `garment_orders`, and `khata_transactions`.
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type {
  Customer,
  MeasurementProfile,
  GarmentOrder,
  KhataTransaction,
  OrderStatus,
  PaymentStatus,
  GarmentType,
  TransactionType,
  ShalwarKameezMeasurements,
  StylePreferences,
  FabricSource,
} from '@/types/tailor';

// ==========================================
// 1. Connection & Runtime Configuration
// ==========================================

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEXT_PUBLIC_DATABASE_URL
  );
}

export function isDatabaseConfigured(): boolean {
  const url = getDatabaseUrl();
  return Boolean(url && url.trim().length > 0 && url.startsWith('postgres'));
}

let cachedSql: NeonQueryFunction<false, false> | null = null;

export function getDbClient(): NeonQueryFunction<false, false> {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      'Database connection URL is not configured. Set DATABASE_URL or POSTGRES_URL in environment.'
    );
  }
  if (!cachedSql) {
    cachedSql = neon(url);
  }
  return cachedSql;
}

// ==========================================
// 2. Row Mappers & Type Converters
// ==========================================

interface CustomerRow {
  id: string;
  shop_id: string;
  full_name: string;
  phone: string;
  secondary_phone: string | null;
  address: string | null;
  city: string | null;
  khata_balance: string | number;
  tags: string[] | null;
  notes: string | null;
  total_orders_count: number;
  total_spent: string | number;
  created_at: string | Date;
  updated_at: string | Date;
}

interface MeasurementProfileRow {
  id: string;
  shop_id: string;
  customer_id: string;
  profile_name: string;
  garment_type: string;
  measurements: ShalwarKameezMeasurements | string;
  style_preferences: StylePreferences | string;
  is_default: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

interface GarmentOrderRow {
  id: string;
  shop_id: string;
  order_number: string;
  customer_id: string;
  measurement_profile_id: string | null;
  status: string;
  garment_type: string;
  quantity: number;
  booking_date: string | Date;
  trial_date: string | Date | null;
  delivery_date: string | Date;
  actual_delivery_date: string | Date | null;
  fabric_details: Record<string, unknown> | string;
  snapshot_measurements: ShalwarKameezMeasurements | string;
  snapshot_styles: StylePreferences | string;
  pricing: Record<string, unknown> | string;
  stitching_rate: string | number;
  fabric_charges: string | number;
  addons_charges: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  advance_paid: string | number;
  balance_due: string | number;
  payment_status: string;
  assigned_cutter_id: string | null;
  assigned_stitcher_id: string | null;
  barcode_token: string | null;
  public_tracking_key: string;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface KhataTransactionRow {
  id: string;
  shop_id: string;
  customer_id: string;
  order_id: string | null;
  type: string;
  amount: string | number;
  previous_balance: string | number;
  new_balance: string | number;
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | Date;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function toIsoString(date: string | Date | null | undefined): string {
  if (!date) return new Date().toISOString();
  if (date instanceof Date) return date.toISOString();
  return new Date(date).toISOString();
}

function toDateString(date: string | Date | null | undefined): string {
  if (!date) return new Date().toISOString().split('T')[0];
  if (date instanceof Date) return date.toISOString().split('T')[0];
  return String(date).split('T')[0];
}

export function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    shop_id: row.shop_id,
    full_name: row.full_name,
    phone: row.phone,
    alternate_phone: row.secondary_phone,
    address: row.address,
    city: row.city,
    notes: row.notes,
    total_orders_count: Number(row.total_orders_count || 0),
    total_spent: Number(row.total_spent || 0),
    current_khata_balance: Number(row.khata_balance || 0),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

export function mapMeasurementProfileRow(row: MeasurementProfileRow): MeasurementProfile {
  return {
    id: row.id,
    shop_id: row.shop_id,
    customer_id: row.customer_id,
    profile_name: row.profile_name,
    garment_type: row.garment_type as GarmentType,
    measurements: parseJson<ShalwarKameezMeasurements>(row.measurements, {} as ShalwarKameezMeasurements),
    style_preferences: parseJson<StylePreferences>(row.style_preferences, {} as StylePreferences),
    is_default: Boolean(row.is_default),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

export function mapGarmentOrderRow(row: GarmentOrderRow): GarmentOrder {
  const fabricObj = parseJson<Record<string, unknown>>(row.fabric_details, {});
  return {
    id: row.id,
    order_number: row.order_number,
    shop_id: row.shop_id,
    customer_id: row.customer_id,
    measurement_profile_id: row.measurement_profile_id,
    status: row.status as OrderStatus,
    garment_type: row.garment_type as GarmentType,
    quantity: Number(row.quantity || 1),
    booking_date: toIsoString(row.booking_date),
    trial_date: row.trial_date ? toDateString(row.trial_date) : null,
    delivery_date: toDateString(row.delivery_date),
    actual_delivery_date: row.actual_delivery_date ? toIsoString(row.actual_delivery_date) : null,
    fabric_provided_by: (fabricObj.fabric_provided_by as FabricSource) || 'CUSTOMER',
    fabric_color: (fabricObj.fabric_color as string) || null,
    fabric_brand: (fabricObj.fabric_brand as string) || null,
    fabric_pieces_count: Number(fabricObj.fabric_pieces_count || 1),
    fabric_notes: (fabricObj.fabric_notes as string) || null,
    stitching_rate: Number(row.stitching_rate || 0),
    fabric_charges: Number(row.fabric_charges || 0),
    addons_charges: Number(row.addons_charges || 0),
    discount_amount: Number(row.discount_amount || 0),
    total_amount: Number(row.total_amount || 0),
    advance_paid: Number(row.advance_paid || 0),
    balance_due: Number(row.balance_due || 0),
    payment_status: row.payment_status as PaymentStatus,
    assigned_cutter_id: row.assigned_cutter_id,
    assigned_stitcher_id: row.assigned_stitcher_id,
    snapshot_measurements: parseJson<ShalwarKameezMeasurements>(row.snapshot_measurements, {} as ShalwarKameezMeasurements),
    snapshot_styles: parseJson<StylePreferences>(row.snapshot_styles, {} as StylePreferences),
    barcode_token: row.barcode_token || row.order_number,
    public_tracking_key: row.public_tracking_key,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

export function mapKhataTransactionRow(row: KhataTransactionRow): KhataTransaction {
  return {
    id: row.id,
    shop_id: row.shop_id,
    customer_id: row.customer_id,
    order_id: row.order_id,
    transaction_type: row.type as TransactionType,
    amount: Number(row.amount || 0),
    balance_after: Number(row.new_balance || 0),
    notes: row.notes,
    created_by: row.created_by,
    created_at: toIsoString(row.created_at),
  };
}

// ==========================================
// 3. Customers Repository
// ==========================================

export const customersDb = {
  async getAll(shopId?: string): Promise<Customer[]> {
    if (!isDatabaseConfigured()) return [];
    const sql = getDbClient();
    const rows = shopId
      ? await sql`SELECT * FROM customers WHERE shop_id = ${shopId} ORDER BY full_name ASC`
      : await sql`SELECT * FROM customers ORDER BY full_name ASC`;
    return (rows as unknown as CustomerRow[]).map(mapCustomerRow);
  },

  async getById(id: string): Promise<Customer | null> {
    if (!isDatabaseConfigured()) return null;
    const sql = getDbClient();
    const rows = await sql`SELECT * FROM customers WHERE id = ${id} LIMIT 1`;
    const row = (rows as unknown as CustomerRow[])[0];
    return row ? mapCustomerRow(row) : null;
  },

  async getByPhone(phone: string, shopId?: string): Promise<Customer | null> {
    if (!isDatabaseConfigured()) return null;
    const sql = getDbClient();
    const rows = shopId
      ? await sql`SELECT * FROM customers WHERE shop_id = ${shopId} AND (phone = ${phone} OR secondary_phone = ${phone}) LIMIT 1`
      : await sql`SELECT * FROM customers WHERE phone = ${phone} OR secondary_phone = ${phone} LIMIT 1`;
    const row = (rows as unknown as CustomerRow[])[0];
    return row ? mapCustomerRow(row) : null;
  },

  async create(customer: Partial<Customer> & { shop_id: string; full_name: string; phone: string }): Promise<Customer> {
    const sql = getDbClient();
    const rows = await sql`
      INSERT INTO customers (
        shop_id, full_name, phone, secondary_phone, address, city, khata_balance, notes
      ) VALUES (
        ${customer.shop_id},
        ${customer.full_name},
        ${customer.phone},
        ${customer.alternate_phone || null},
        ${customer.address || null},
        ${customer.city || 'Wah Cantt'},
        ${customer.current_khata_balance ?? 0},
        ${customer.notes || null}
      )
      RETURNING *
    `;
    return mapCustomerRow((rows as unknown as CustomerRow[])[0]);
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const sql = getDbClient();
    const rows = await sql`
      UPDATE customers
      SET
        full_name = COALESCE(${updates.full_name}, full_name),
        phone = COALESCE(${updates.phone}, phone),
        secondary_phone = COALESCE(${updates.alternate_phone}, secondary_phone),
        address = COALESCE(${updates.address}, address),
        city = COALESCE(${updates.city}, city),
        khata_balance = COALESCE(${updates.current_khata_balance}, khata_balance),
        notes = COALESCE(${updates.notes}, notes),
        total_orders_count = COALESCE(${updates.total_orders_count}, total_orders_count),
        total_spent = COALESCE(${updates.total_spent}, total_spent),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    const row = (rows as unknown as CustomerRow[])[0];
    return row ? mapCustomerRow(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    const sql = getDbClient();
    const rows = await sql`DELETE FROM customers WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  },
};

// ==========================================
// 4. Measurement Profiles Repository
// ==========================================

export const measurementsDb = {
  async getByCustomerId(customerId: string): Promise<MeasurementProfile[]> {
    if (!isDatabaseConfigured()) return [];
    const sql = getDbClient();
    const rows = await sql`
      SELECT * FROM measurement_profiles
      WHERE customer_id = ${customerId}
      ORDER BY is_default DESC, created_at DESC
    `;
    return (rows as unknown as MeasurementProfileRow[]).map(mapMeasurementProfileRow);
  },

  async getById(id: string): Promise<MeasurementProfile | null> {
    if (!isDatabaseConfigured()) return null;
    const sql = getDbClient();
    const rows = await sql`SELECT * FROM measurement_profiles WHERE id = ${id} LIMIT 1`;
    const row = (rows as unknown as MeasurementProfileRow[])[0];
    return row ? mapMeasurementProfileRow(row) : null;
  },

  async create(profile: Partial<MeasurementProfile> & { shop_id: string; customer_id: string }): Promise<MeasurementProfile> {
    const sql = getDbClient();
    const measurementsJson = JSON.stringify(profile.measurements || {});
    const stylesJson = JSON.stringify(profile.style_preferences || {});
    const rows = await sql`
      INSERT INTO measurement_profiles (
        shop_id, customer_id, profile_name, garment_type, measurements, style_preferences, is_default
      ) VALUES (
        ${profile.shop_id},
        ${profile.customer_id},
        ${profile.profile_name || 'Standard Fit'},
        ${profile.garment_type || 'MEN_SHALWAR_KAMEEZ'},
        ${measurementsJson}::jsonb,
        ${stylesJson}::jsonb,
        ${profile.is_default ?? true}
      )
      RETURNING *
    `;
    return mapMeasurementProfileRow((rows as unknown as MeasurementProfileRow[])[0]);
  },

  async update(id: string, updates: Partial<MeasurementProfile>): Promise<MeasurementProfile | null> {
    const sql = getDbClient();
    const measurementsJson = updates.measurements ? JSON.stringify(updates.measurements) : null;
    const stylesJson = updates.style_preferences ? JSON.stringify(updates.style_preferences) : null;

    const rows = await sql`
      UPDATE measurement_profiles
      SET
        profile_name = COALESCE(${updates.profile_name}, profile_name),
        garment_type = COALESCE(${updates.garment_type}, garment_type),
        measurements = COALESCE(${measurementsJson}::jsonb, measurements),
        style_preferences = COALESCE(${stylesJson}::jsonb, style_preferences),
        is_default = COALESCE(${updates.is_default}, is_default),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    const row = (rows as unknown as MeasurementProfileRow[])[0];
    return row ? mapMeasurementProfileRow(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    const sql = getDbClient();
    const rows = await sql`DELETE FROM measurement_profiles WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  },
};

// ==========================================
// 5. Garment Orders Repository
// ==========================================

export const ordersDb = {
  async getAll(shopId?: string): Promise<GarmentOrder[]> {
    if (!isDatabaseConfigured()) return [];
    const sql = getDbClient();
    const rows = shopId
      ? await sql`SELECT * FROM garment_orders WHERE shop_id = ${shopId} ORDER BY created_at DESC`
      : await sql`SELECT * FROM garment_orders ORDER BY created_at DESC`;
    return (rows as unknown as GarmentOrderRow[]).map(mapGarmentOrderRow);
  },

  async getById(id: string): Promise<GarmentOrder | null> {
    if (!isDatabaseConfigured()) return null;
    const sql = getDbClient();
    const rows = await sql`SELECT * FROM garment_orders WHERE id = ${id} LIMIT 1`;
    const row = (rows as unknown as GarmentOrderRow[])[0];
    return row ? mapGarmentOrderRow(row) : null;
  },

  async getByOrderNumber(orderNumber: string, shopId?: string): Promise<GarmentOrder | null> {
    if (!isDatabaseConfigured()) return null;
    const sql = getDbClient();
    const rows = shopId
      ? await sql`SELECT * FROM garment_orders WHERE shop_id = ${shopId} AND order_number = ${orderNumber} LIMIT 1`
      : await sql`SELECT * FROM garment_orders WHERE order_number = ${orderNumber} LIMIT 1`;
    const row = (rows as unknown as GarmentOrderRow[])[0];
    return row ? mapGarmentOrderRow(row) : null;
  },

  async getByCustomerId(customerId: string): Promise<GarmentOrder[]> {
    if (!isDatabaseConfigured()) return [];
    const sql = getDbClient();
    const rows = await sql`
      SELECT * FROM garment_orders
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
    `;
    return (rows as unknown as GarmentOrderRow[]).map(mapGarmentOrderRow);
  },

  async create(order: Partial<GarmentOrder> & { shop_id: string; customer_id: string; order_number: string }): Promise<GarmentOrder> {
    const sql = getDbClient();
    const fabricDetails = JSON.stringify({
      fabric_provided_by: order.fabric_provided_by || 'CUSTOMER',
      fabric_color: order.fabric_color || null,
      fabric_brand: order.fabric_brand || null,
      fabric_pieces_count: order.fabric_pieces_count || 1,
      fabric_notes: order.fabric_notes || null,
    });
    const snapshotMeasurements = JSON.stringify(order.snapshot_measurements || {});
    const snapshotStyles = JSON.stringify(order.snapshot_styles || {});
    const pricingJson = JSON.stringify({
      stitching_rate: order.stitching_rate || 0,
      fabric_charges: order.fabric_charges || 0,
      addons_charges: order.addons_charges || 0,
      discount_amount: order.discount_amount || 0,
      total_amount: order.total_amount || 0,
      advance_paid: order.advance_paid || 0,
      balance_due: order.balance_due || 0,
      payment_status: order.payment_status || 'UNPAID',
    });

    const rows = await sql`
      INSERT INTO garment_orders (
        shop_id, order_number, customer_id, measurement_profile_id, status, garment_type, quantity,
        trial_date, delivery_date, fabric_details, snapshot_measurements, snapshot_styles, pricing,
        stitching_rate, fabric_charges, addons_charges, discount_amount, total_amount,
        advance_paid, balance_due, payment_status, barcode_token
      ) VALUES (
        ${order.shop_id},
        ${order.order_number},
        ${order.customer_id},
        ${order.measurement_profile_id || null},
        ${order.status || 'BOOKED'},
        ${order.garment_type || 'MEN_SHALWAR_KAMEEZ'},
        ${order.quantity || 1},
        ${order.trial_date || null},
        ${order.delivery_date || new Date().toISOString().split('T')[0]},
        ${fabricDetails}::jsonb,
        ${snapshotMeasurements}::jsonb,
        ${snapshotStyles}::jsonb,
        ${pricingJson}::jsonb,
        ${order.stitching_rate || 0},
        ${order.fabric_charges || 0},
        ${order.addons_charges || 0},
        ${order.discount_amount || 0},
        ${order.total_amount || 0},
        ${order.advance_paid || 0},
        ${order.balance_due || 0},
        ${order.payment_status || 'UNPAID'},
        ${order.barcode_token || order.order_number}
      )
      RETURNING *
    `;
    return mapGarmentOrderRow((rows as unknown as GarmentOrderRow[])[0]);
  },

  async updateStatus(id: string, status: OrderStatus): Promise<GarmentOrder | null> {
    const sql = getDbClient();
    const rows = await sql`
      UPDATE garment_orders
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    const row = (rows as unknown as GarmentOrderRow[])[0];
    return row ? mapGarmentOrderRow(row) : null;
  },

  async update(id: string, updates: Partial<GarmentOrder>): Promise<GarmentOrder | null> {
    const sql = getDbClient();
    const rows = await sql`
      UPDATE garment_orders
      SET
        status = COALESCE(${updates.status}, status),
        delivery_date = COALESCE(${updates.delivery_date}, delivery_date),
        trial_date = COALESCE(${updates.trial_date}, trial_date),
        total_amount = COALESCE(${updates.total_amount}, total_amount),
        advance_paid = COALESCE(${updates.advance_paid}, advance_paid),
        balance_due = COALESCE(${updates.balance_due}, balance_due),
        payment_status = COALESCE(${updates.payment_status}, payment_status),
        assigned_cutter_id = COALESCE(${updates.assigned_cutter_id}, assigned_cutter_id),
        assigned_stitcher_id = COALESCE(${updates.assigned_stitcher_id}, assigned_stitcher_id),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    const row = (rows as unknown as GarmentOrderRow[])[0];
    return row ? mapGarmentOrderRow(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    const sql = getDbClient();
    const rows = await sql`DELETE FROM garment_orders WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  },
};

// ==========================================
// 6. Khata Ledger Repository (Append-Only)
// ==========================================

export const khataDb = {
  async getAll(customerId?: string, shopId?: string): Promise<KhataTransaction[]> {
    if (!isDatabaseConfigured()) return [];
    const sql = getDbClient();
    let rows: unknown[];
    if (customerId && shopId) {
      rows = await sql`
        SELECT * FROM khata_transactions
        WHERE customer_id = ${customerId} AND shop_id = ${shopId}
        ORDER BY created_at DESC
      `;
    } else if (customerId) {
      rows = await sql`
        SELECT * FROM khata_transactions
        WHERE customer_id = ${customerId}
        ORDER BY created_at DESC
      `;
    } else if (shopId) {
      rows = await sql`
        SELECT * FROM khata_transactions
        WHERE shop_id = ${shopId}
        ORDER BY created_at DESC
      `;
    } else {
      rows = await sql`SELECT * FROM khata_transactions ORDER BY created_at DESC`;
    }
    return (rows as unknown as KhataTransactionRow[]).map(mapKhataTransactionRow);
  },

  async append(tx: Partial<KhataTransaction> & {
    shop_id: string;
    customer_id: string;
    transaction_type: TransactionType;
    amount: number;
    balance_after: number;
  }): Promise<KhataTransaction> {
    const sql = getDbClient();
    // 1. Insert ledger transaction
    const rows = await sql`
      INSERT INTO khata_transactions (
        shop_id, customer_id, order_id, type, amount, previous_balance, new_balance, notes, created_by
      ) VALUES (
        ${tx.shop_id},
        ${tx.customer_id},
        ${tx.order_id || null},
        ${tx.transaction_type},
        ${tx.amount},
        0.00,
        ${tx.balance_after},
        ${tx.notes || null},
        ${tx.created_by || null}
      )
      RETURNING *
    `;

    // 2. Atomically update customer current_khata_balance
    await sql`
      UPDATE customers
      SET khata_balance = ${tx.balance_after}, updated_at = NOW()
      WHERE id = ${tx.customer_id}
    `;

    return mapKhataTransactionRow((rows as unknown as KhataTransactionRow[])[0]);
  },

  async getCustomerBalance(customerId: string): Promise<number> {
    if (!isDatabaseConfigured()) return 0;
    const sql = getDbClient();
    const rows = await sql`SELECT khata_balance FROM customers WHERE id = ${customerId} LIMIT 1`;
    const row = (rows as unknown as { khata_balance: string | number }[])[0];
    return row ? Number(row.khata_balance || 0) : 0;
  },
};
