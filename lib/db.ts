/**
 * lib/db.ts - Supabase PostgreSQL Database Client & Typed Repositories
 *
 * Implemented via `@supabase/supabase-js` for edge, browser, and serverless environments.
 * Provides:
 * 1. Safe runtime connection management via `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * 2. Graceful static export / compile-time SSR safety (never throws on build when ENV is absent)
 * 3. Bidirectional data mapping between PostgreSQL schema and `@/types/tailor`
 * 4. Strongly-typed repositories for `customers`, `measurement_profiles`, `garment_orders`, and `khata_transactions`.
 * 5. Atomic Khata append RPC execution (`append_khata_transaction`).
 *
 * ARCHITECTURAL DIRECTIVE ON MULTI-TENANT ISOLATION:
 * While repository methods accept `shopId` for frontend scoping and query filtering,
 * enterprise multi-tenant isolation is enforced strictly at the database layer via
 * Supabase Row Level Security (RLS) policies tied to `auth.uid()` (Phase A, Sub-Phase 2).
 * Never trust client-supplied shop IDs for authorization or tenant boundary enforcement.
 */

import {
  supabase,
  getSupabaseClient,
  isSupabaseConfigured,
  getSupabaseUrl,
} from '@/lib/supabase/client';
import type {
  Shop,
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
  return getSupabaseUrl();
}

export function isDatabaseConfigured(): boolean {
  return isSupabaseConfigured();
}

export function getDbClient() {
  return getSupabaseClient();
}

// ==========================================
// 2. Row Mappers & Type Converters
// ==========================================

export interface CustomerRow {
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

export interface MeasurementProfileRow {
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

export interface GarmentOrderRow {
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

export interface KhataTransactionRow {
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

export interface ShopRow {
  id: string;
  name: string;
  phone: string | null;
  secondary_phone: string | null;
  address: string | null;
  city: string | null;
  ntn_number: string | null;
  receipt_header: string | null;
  receipt_footer: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export function parseJson<T>(value: unknown, fallback: T): T {
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

export function toIsoString(date: string | Date | null | undefined): string {
  if (!date) return new Date().toISOString();
  if (date instanceof Date) return date.toISOString();
  return new Date(date).toISOString();
}

export function toDateString(date: string | Date | null | undefined): string {
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

export function mapShopRow(row: ShopRow): Shop {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    secondary_phone: row.secondary_phone,
    address: row.address,
    city: row.city || 'Wah Cantt',
    ntn_number: row.ntn_number,
    receipt_header: row.receipt_header,
    receipt_footer: row.receipt_footer,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

// ==========================================
// 3. Customers Repository
// ==========================================

export const customersDb = {
  async getAll(shopId?: string): Promise<Customer[]> {
    if (!isDatabaseConfigured()) return [];
    let query = supabase.from('customers').select('*');
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query.order('full_name', { ascending: true });
    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }
    return (data as CustomerRow[]).map(mapCustomerRow);
  },

  async getById(id: string): Promise<Customer | null> {
    if (!isDatabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch customer by ID: ${error.message}`);
    }
    return data ? mapCustomerRow(data as CustomerRow) : null;
  },

  async getByPhone(phone: string, shopId?: string): Promise<Customer | null> {
    if (!isDatabaseConfigured()) return null;
    let query = supabase
      .from('customers')
      .select('*')
      .or(`phone.eq.${phone},secondary_phone.eq.${phone}`);
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch customer by phone: ${error.message}`);
    }
    return data ? mapCustomerRow(data as CustomerRow) : null;
  },

  async create(
    customer: Partial<Customer> & { shop_id: string; full_name: string; phone: string }
  ): Promise<Customer> {
    const insertPayload = {
      shop_id: customer.shop_id,
      full_name: customer.full_name,
      phone: customer.phone,
      secondary_phone: customer.alternate_phone || null,
      address: customer.address || null,
      city: customer.city || 'Wah Cantt',
      khata_balance: customer.current_khata_balance ?? 0,
      notes: customer.notes || null,
    };
    const { data, error } = await supabase
      .from('customers')
      .insert(insertPayload)
      .select()
      .single();
    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
    return mapCustomerRow(data as CustomerRow);
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.full_name !== undefined) updatePayload.full_name = updates.full_name;
    if (updates.phone !== undefined) updatePayload.phone = updates.phone;
    if (updates.alternate_phone !== undefined) updatePayload.secondary_phone = updates.alternate_phone;
    if (updates.address !== undefined) updatePayload.address = updates.address;
    if (updates.city !== undefined) updatePayload.city = updates.city;
    if (updates.current_khata_balance !== undefined) updatePayload.khata_balance = updates.current_khata_balance;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;
    if (updates.total_orders_count !== undefined) updatePayload.total_orders_count = updates.total_orders_count;
    if (updates.total_spent !== undefined) updatePayload.total_spent = updates.total_spent;

    const { data, error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }
    return data ? mapCustomerRow(data as CustomerRow) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete customer: ${error.message}`);
    }
    return true;
  },
};

// ==========================================
// 4. Measurement Profiles Repository
// ==========================================

export const measurementsDb = {
  async getByCustomerId(customerId: string): Promise<MeasurementProfile[]> {
    if (!isDatabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('measurement_profiles')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(`Failed to fetch measurement profiles: ${error.message}`);
    }
    return (data as MeasurementProfileRow[]).map(mapMeasurementProfileRow);
  },

  async getById(id: string): Promise<MeasurementProfile | null> {
    if (!isDatabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('measurement_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch measurement profile by ID: ${error.message}`);
    }
    return data ? mapMeasurementProfileRow(data as MeasurementProfileRow) : null;
  },

  async create(
    profile: Partial<MeasurementProfile> & { shop_id: string; customer_id: string }
  ): Promise<MeasurementProfile> {
    const insertPayload = {
      shop_id: profile.shop_id,
      customer_id: profile.customer_id,
      profile_name: profile.profile_name || 'Standard Fit',
      garment_type: profile.garment_type || 'MEN_SHALWAR_KAMEEZ',
      measurements: profile.measurements || {},
      style_preferences: profile.style_preferences || {},
      is_default: profile.is_default ?? true,
    };
    const { data, error } = await supabase
      .from('measurement_profiles')
      .insert(insertPayload)
      .select()
      .single();
    if (error) {
      throw new Error(`Failed to create measurement profile: ${error.message}`);
    }
    return mapMeasurementProfileRow(data as MeasurementProfileRow);
  },

  async update(id: string, updates: Partial<MeasurementProfile>): Promise<MeasurementProfile | null> {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.profile_name !== undefined) updatePayload.profile_name = updates.profile_name;
    if (updates.garment_type !== undefined) updatePayload.garment_type = updates.garment_type;
    if (updates.measurements !== undefined) updatePayload.measurements = updates.measurements;
    if (updates.style_preferences !== undefined) updatePayload.style_preferences = updates.style_preferences;
    if (updates.is_default !== undefined) updatePayload.is_default = updates.is_default;

    const { data, error } = await supabase
      .from('measurement_profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to update measurement profile: ${error.message}`);
    }
    return data ? mapMeasurementProfileRow(data as MeasurementProfileRow) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('measurement_profiles').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete measurement profile: ${error.message}`);
    }
    return true;
  },
};

// ==========================================
// 5. Garment Orders Repository
// ==========================================

export const ordersDb = {
  async getAll(shopId?: string): Promise<GarmentOrder[]> {
    if (!isDatabaseConfigured()) return [];
    let query = supabase.from('garment_orders').select('*');
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    return (data as GarmentOrderRow[]).map(mapGarmentOrderRow);
  },

  async getById(id: string): Promise<GarmentOrder | null> {
    if (!isDatabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('garment_orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch order by ID: ${error.message}`);
    }
    return data ? mapGarmentOrderRow(data as GarmentOrderRow) : null;
  },

  async getByOrderNumber(orderNumber: string, shopId?: string): Promise<GarmentOrder | null> {
    if (!isDatabaseConfigured()) return null;
    let query = supabase.from('garment_orders').select('*').eq('order_number', orderNumber);
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch order by order_number: ${error.message}`);
    }
    return data ? mapGarmentOrderRow(data as GarmentOrderRow) : null;
  },

  async getByCustomerId(customerId: string): Promise<GarmentOrder[]> {
    if (!isDatabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('garment_orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(`Failed to fetch customer orders: ${error.message}`);
    }
    return (data as GarmentOrderRow[]).map(mapGarmentOrderRow);
  },

  async create(
    order: Partial<GarmentOrder> & { shop_id: string; customer_id: string; order_number: string }
  ): Promise<GarmentOrder> {
    const fabricDetails = {
      fabric_provided_by: order.fabric_provided_by || 'CUSTOMER',
      fabric_color: order.fabric_color || null,
      fabric_brand: order.fabric_brand || null,
      fabric_pieces_count: order.fabric_pieces_count || 1,
      fabric_notes: order.fabric_notes || null,
    };
    const pricing = {
      stitching_rate: order.stitching_rate || 0,
      fabric_charges: order.fabric_charges || 0,
      addons_charges: order.addons_charges || 0,
      discount_amount: order.discount_amount || 0,
      total_amount: order.total_amount || 0,
      advance_paid: order.advance_paid || 0,
      balance_due: order.balance_due || 0,
      payment_status: order.payment_status || 'UNPAID',
    };

    const insertPayload = {
      shop_id: order.shop_id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      measurement_profile_id: order.measurement_profile_id || null,
      status: order.status || 'BOOKED',
      garment_type: order.garment_type || 'MEN_SHALWAR_KAMEEZ',
      quantity: order.quantity || 1,
      trial_date: order.trial_date || null,
      delivery_date: order.delivery_date || new Date().toISOString().split('T')[0],
      fabric_details: fabricDetails,
      snapshot_measurements: order.snapshot_measurements || {},
      snapshot_styles: order.snapshot_styles || {},
      pricing: pricing,
      stitching_rate: order.stitching_rate || 0,
      fabric_charges: order.fabric_charges || 0,
      addons_charges: order.addons_charges || 0,
      discount_amount: order.discount_amount || 0,
      total_amount: order.total_amount || 0,
      advance_paid: order.advance_paid || 0,
      balance_due: order.balance_due || 0,
      payment_status: order.payment_status || 'UNPAID',
      barcode_token: order.barcode_token || order.order_number,
    };

    const { data, error } = await supabase
      .from('garment_orders')
      .insert(insertPayload)
      .select()
      .single();
    if (error) {
      throw new Error(`Failed to create garment order: ${error.message}`);
    }
    return mapGarmentOrderRow(data as GarmentOrderRow);
  },

  async updateStatus(id: string, status: OrderStatus): Promise<GarmentOrder | null> {
    const { data, error } = await supabase
      .from('garment_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
    return data ? mapGarmentOrderRow(data as GarmentOrderRow) : null;
  },

  async update(id: string, updates: Partial<GarmentOrder>): Promise<GarmentOrder | null> {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.delivery_date !== undefined) updatePayload.delivery_date = updates.delivery_date;
    if (updates.trial_date !== undefined) updatePayload.trial_date = updates.trial_date;
    if (updates.total_amount !== undefined) updatePayload.total_amount = updates.total_amount;
    if (updates.advance_paid !== undefined) updatePayload.advance_paid = updates.advance_paid;
    if (updates.balance_due !== undefined) updatePayload.balance_due = updates.balance_due;
    if (updates.payment_status !== undefined) updatePayload.payment_status = updates.payment_status;
    if (updates.assigned_cutter_id !== undefined) updatePayload.assigned_cutter_id = updates.assigned_cutter_id;
    if (updates.assigned_stitcher_id !== undefined) updatePayload.assigned_stitcher_id = updates.assigned_stitcher_id;

    const { data, error } = await supabase
      .from('garment_orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to update garment order: ${error.message}`);
    }
    return data ? mapGarmentOrderRow(data as GarmentOrderRow) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('garment_orders').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete garment order: ${error.message}`);
    }
    return true;
  },
};

// ==========================================
// 6. Khata Ledger Repository (Append-Only Atomic RPC)
// ==========================================

export const khataDb = {
  async getAll(customerId?: string, shopId?: string): Promise<KhataTransaction[]> {
    if (!isDatabaseConfigured()) return [];
    let query = supabase.from('khata_transactions').select('*');
    if (customerId) query = query.eq('customer_id', customerId);
    if (shopId) query = query.eq('shop_id', shopId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      throw new Error(`Failed to fetch khata transactions: ${error.message}`);
    }
    return (data as KhataTransactionRow[]).map(mapKhataTransactionRow);
  },

  async append(tx: Partial<KhataTransaction> & {
    shop_id: string;
    customer_id: string;
    transaction_type: TransactionType;
    amount: number;
    balance_after?: number;
  }): Promise<KhataTransaction> {
    // Atomic execution via PostgreSQL RPC function with zero-trust server-side balance calculation
    const { data, error } = await supabase.rpc('append_khata_transaction', {
      p_shop_id: tx.shop_id,
      p_customer_id: tx.customer_id,
      p_order_id: tx.order_id || null,
      p_type: tx.transaction_type,
      p_amount: tx.amount,
      p_payment_method: 'CASH',
      p_notes: tx.notes || null,
      p_created_by: tx.created_by || null,
    });

    if (error) {
      throw new Error(`Failed to append khata transaction via RPC: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    return mapKhataTransactionRow(row as KhataTransactionRow);
  },

  async getCustomerBalance(customerId: string): Promise<number> {
    if (!isDatabaseConfigured()) return 0;
    const { data, error } = await supabase
      .from('customers')
      .select('khata_balance')
      .eq('id', customerId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch customer khata balance: ${error.message}`);
    }
    return data ? Number(data.khata_balance || 0) : 0;
  },
};

// ==========================================
// 7. Workshop Profile & Shops Repository
// ==========================================

export const shopsDb = {
  async getById(id: string): Promise<Shop | null> {
    if (!isDatabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch shop by ID: ${error.message}`);
    }
    return data ? mapShopRow(data as ShopRow) : null;
  },

  async getCurrentShop(userId?: string): Promise<Shop | null> {
    if (!isDatabaseConfigured()) return null;

    let targetUserId = userId;
    if (!targetUserId) {
      const { data: userData } = await supabase.auth.getUser();
      targetUserId = userData.user?.id;
    }

    if (!targetUserId) return null;

    // Relational query: resolve shop_id from shop_members first
    const { data: memberData, error: memberError } = await supabase
      .from('shop_members')
      .select('shop_id')
      .eq('user_id', targetUserId)
      .limit(1)
      .maybeSingle();

    if (memberError || !memberData?.shop_id) {
      // Fallback: direct check by user ID if member lookup missed
      return this.getById(targetUserId);
    }

    return this.getById(memberData.shop_id);
  },

  async update(id: string, updates: Partial<Shop>): Promise<Shop> {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.phone !== undefined) updatePayload.phone = updates.phone;
    if (updates.secondary_phone !== undefined) updatePayload.secondary_phone = updates.secondary_phone;
    if (updates.address !== undefined) updatePayload.address = updates.address;
    if (updates.city !== undefined) updatePayload.city = updates.city;
    if (updates.ntn_number !== undefined) updatePayload.ntn_number = updates.ntn_number;
    if (updates.receipt_header !== undefined) updatePayload.receipt_header = updates.receipt_header;
    if (updates.receipt_footer !== undefined) updatePayload.receipt_footer = updates.receipt_footer;

    const { data, error } = await supabase
      .from('shops')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update shop: ${error.message}`);
    }
    return mapShopRow(data as ShopRow);
  },
};

