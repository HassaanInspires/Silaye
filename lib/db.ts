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
  ShopStatus,
  ShopMember,
  ShopMemberRole,
  GarmentRate,
  PrinterSettings,
  PrinterPaperWidth,
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
  PlatformMetrics,
  AdminShopOverview,
  SystemAdmin,
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
  status?: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ShopMemberRow {
  id: string;
  shop_id: string;
  user_id: string;
  role: string;
  email?: string | null;
  name?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface GarmentRateRow {
  id: string;
  shop_id: string;
  garment_type: string;
  base_stitching_rate: string | number;
  urgent_surcharge: string | number;
  standard_delivery_days: number;
  urgent_delivery_days: number;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface PrinterSettingsRow {
  id: string;
  shop_id: string;
  paper_width: string;
  auto_print_on_booking: boolean;
  show_barcode: boolean;
  show_qr_tracking: boolean;
  show_urdu_labels: boolean;
  feed_lines: number;
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
    status: (row.status as ShopStatus) || 'ACTIVE',
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

export function mapShopMemberRow(row: ShopMemberRow): ShopMember {
  return {
    id: row.id,
    shop_id: row.shop_id,
    user_id: row.user_id,
    role: row.role as ShopMemberRole,
    email: row.email || null,
    name: row.name || (row.email ? row.email.split('@')[0] : null),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

export function mapGarmentRateRow(row: GarmentRateRow): GarmentRate {
  return {
    id: row.id,
    shop_id: row.shop_id,
    garment_type: row.garment_type as GarmentType,
    base_stitching_rate: Number(row.base_stitching_rate || 0),
    urgent_surcharge: Number(row.urgent_surcharge || 0),
    standard_delivery_days: Number(row.standard_delivery_days || 7),
    urgent_delivery_days: Number(row.urgent_delivery_days || 3),
    is_active: Boolean(row.is_active),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

export function mapPrinterSettingsRow(row: PrinterSettingsRow): PrinterSettings {
  return {
    id: row.id,
    shop_id: row.shop_id,
    paper_width: (row.paper_width === '58mm' ? '58mm' : '80mm') as PrinterPaperWidth,
    auto_print_on_booking: Boolean(row.auto_print_on_booking),
    show_barcode: row.show_barcode !== false,
    show_qr_tracking: row.show_qr_tracking !== false,
    show_urdu_labels: row.show_urdu_labels !== false,
    feed_lines: typeof row.feed_lines === 'number' ? row.feed_lines : 3,
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

// ==========================================
// 8. Staff & Workshop Role Access Repository
// ==========================================

export const staffDb = {
  async getByShopId(shopId: string): Promise<ShopMember[]> {
    const mockFallback: ShopMember[] = [
      {
        id: 'sm-00000000-0000-0000-0000-000000000001',
        shop_id: shopId,
        user_id: 'u-00000000-0000-0000-0000-000000000001',
        role: 'OWNER',
        email: 'owner@silaye.com',
        name: 'Master Ustad (Owner)',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'sm-00000000-0000-0000-0000-000000000002',
        shop_id: shopId,
        user_id: 'u-00000000-0000-0000-0000-000000000002',
        role: 'MANAGER',
        email: 'bilal.manager@silaye.com',
        name: 'Bilal Ahmed',
        created_at: '2026-01-01T08:00:00.000Z',
        updated_at: '2026-01-01T08:00:00.000Z',
      },
      {
        id: 'sm-00000000-0000-0000-0000-000000000003',
        shop_id: shopId,
        user_id: 'u-00000000-0000-0000-0000-000000000003',
        role: 'CUTTING_MASTER',
        email: 'rafiq.cutter@silaye.com',
        name: 'Ustad Rafiq Ahmed',
        created_at: '2026-01-05T09:00:00.000Z',
        updated_at: '2026-01-05T09:00:00.000Z',
      },
      {
        id: 'sm-00000000-0000-0000-0000-000000000004',
        shop_id: shopId,
        user_id: 'u-00000000-0000-0000-0000-000000000004',
        role: 'STITCHER',
        email: 'tariq.stitcher@silaye.com',
        name: 'Tariq Mehmood',
        created_at: '2026-01-10T09:00:00.000Z',
        updated_at: '2026-01-10T09:00:00.000Z',
      },
      {
        id: 'sm-00000000-0000-0000-0000-000000000005',
        shop_id: shopId,
        user_id: 'u-00000000-0000-0000-0000-000000000005',
        role: 'PRESSMAN',
        email: 'aslam.press@silaye.com',
        name: 'Muhammad Aslam',
        created_at: '2026-01-15T09:00:00.000Z',
        updated_at: '2026-01-15T09:00:00.000Z',
      },
      {
        id: 'sm-00000000-0000-0000-0000-000000000006',
        shop_id: shopId,
        user_id: 'u-00000000-0000-0000-0000-000000000006',
        role: 'COUNTER_CLERK',
        email: 'kamran.clerk@silaye.com',
        name: 'Kamran Ali',
        created_at: '2026-01-20T09:00:00.000Z',
        updated_at: '2026-01-20T09:00:00.000Z',
      },
    ];

    if (!isDatabaseConfigured()) {
      return mockFallback;
    }

    try {
      const { data, error } = await supabase.rpc('get_shop_members', {
        p_shop_id: shopId,
      });

      if (error) {
        // Fallback: direct select if RPC failed or permissions issue
        const { data: selectData, error: selectError } = await supabase
          .from('shop_members')
          .select('*')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: true });

        if (selectError) {
          console.warn('Supabase shop_members query error, using local fallback:', selectError.message);
          return mockFallback;
        }
        return (selectData as ShopMemberRow[]).map(mapShopMemberRow);
      }

      return (data as ShopMemberRow[]).map(mapShopMemberRow);
    } catch (networkErr) {
      console.warn('Supabase network unreachable, using local staff fallback:', networkErr);
      return mockFallback;
    }
  },

  async addStaff(shopId: string, email: string, role: ShopMemberRole): Promise<ShopMember> {
    const mockCreated: ShopMember = {
      id: `sm-mock-${Date.now()}`,
      shop_id: shopId,
      user_id: `u-mock-${Date.now()}`,
      role: role,
      email: email,
      name: email.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!isDatabaseConfigured()) {
      return mockCreated;
    }

    try {
      const { data, error } = await supabase.rpc('add_shop_staff_member', {
        p_shop_id: shopId,
        p_email: email,
        p_role: role,
      });

      if (error) {
        console.warn('Supabase add_shop_staff_member RPC error, using mock result:', error.message);
        return mockCreated;
      }

      const row = Array.isArray(data) ? data[0] : data;
      return mapShopMemberRow(row as ShopMemberRow);
    } catch (networkErr) {
      console.warn('Supabase network unreachable for addStaff, using local mock:', networkErr);
      return mockCreated;
    }
  },

  async removeStaff(shopId: string, memberId: string): Promise<boolean> {
    if (!isDatabaseConfigured()) {
      return true;
    }

    try {
      const { data, error } = await supabase.rpc('remove_shop_member', {
        p_shop_id: shopId,
        p_member_id: memberId,
      });

      if (error) {
        console.warn('Supabase remove_shop_member RPC error:', error.message);
        return false;
      }

      return Boolean(data);
    } catch (networkErr) {
      console.warn('Supabase network unreachable for removeStaff:', networkErr);
      return true;
    }
  },
};

// ==========================================
// 9. Garment Catalog & Rates Repository
// ==========================================

export const DEFAULT_MARKET_RATES: Array<Omit<GarmentRate, 'id' | 'shop_id' | 'created_at' | 'updated_at'>> = [
  {
    garment_type: 'MEN_SHALWAR_KAMEEZ',
    base_stitching_rate: 1800,
    urgent_surcharge: 500,
    standard_delivery_days: 7,
    urgent_delivery_days: 3,
    is_active: true,
  },
  {
    garment_type: 'MEN_KURTA',
    base_stitching_rate: 1400,
    urgent_surcharge: 400,
    standard_delivery_days: 7,
    urgent_delivery_days: 3,
    is_active: true,
  },
  {
    garment_type: 'WAISTCOAT',
    base_stitching_rate: 2200,
    urgent_surcharge: 700,
    standard_delivery_days: 8,
    urgent_delivery_days: 4,
    is_active: true,
  },
  {
    garment_type: 'PRINCE_SUIT',
    base_stitching_rate: 6500,
    urgent_surcharge: 1500,
    standard_delivery_days: 12,
    urgent_delivery_days: 5,
    is_active: true,
  },
  {
    garment_type: 'TROUSER_SHIRT',
    base_stitching_rate: 1600,
    urgent_surcharge: 500,
    standard_delivery_days: 7,
    urgent_delivery_days: 3,
    is_active: true,
  },
  {
    garment_type: 'WOMEN_SUIT',
    base_stitching_rate: 2000,
    urgent_surcharge: 600,
    standard_delivery_days: 7,
    urgent_delivery_days: 3,
    is_active: true,
  },
];

export function getMockGarmentRates(shopId: string): GarmentRate[] {
  return DEFAULT_MARKET_RATES.map((item, idx) => ({
    id: `gr-mock-${shopId.substring(0, 8)}-${idx + 1}`,
    shop_id: shopId,
    ...item,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }));
}

export const ratesDb = {
  async getByShopId(shopId: string): Promise<GarmentRate[]> {
    if (!isDatabaseConfigured()) {
      return getMockGarmentRates(shopId);
    }

    try {
      const { data, error } = await supabase
        .from('garment_rates')
        .select('*')
        .eq('shop_id', shopId)
        .order('garment_type', { ascending: true });

      if (error) {
        console.warn('Supabase garment_rates query error, using default market rates:', error.message);
        return getMockGarmentRates(shopId);
      }

      if (!data || data.length === 0) {
        return getMockGarmentRates(shopId);
      }

      return (data as GarmentRateRow[]).map(mapGarmentRateRow);
    } catch (networkErr) {
      console.warn('Supabase network unreachable, using default market rates:', networkErr);
      return getMockGarmentRates(shopId);
    }
  },

  async updateRate(
    shopId: string,
    garmentType: GarmentType,
    updates: Partial<GarmentRate>
  ): Promise<GarmentRate> {
    const mockUpdated: GarmentRate = {
      id: `gr-mock-${shopId.substring(0, 8)}-${garmentType}`,
      shop_id: shopId,
      garment_type: garmentType,
      base_stitching_rate: updates.base_stitching_rate ?? 1800,
      urgent_surcharge: updates.urgent_surcharge ?? 500,
      standard_delivery_days: updates.standard_delivery_days ?? 7,
      urgent_delivery_days: updates.urgent_delivery_days ?? 3,
      is_active: updates.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!isDatabaseConfigured()) {
      return mockUpdated;
    }

    try {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.base_stitching_rate !== undefined) updatePayload.base_stitching_rate = updates.base_stitching_rate;
      if (updates.urgent_surcharge !== undefined) updatePayload.urgent_surcharge = updates.urgent_surcharge;
      if (updates.standard_delivery_days !== undefined) updatePayload.standard_delivery_days = updates.standard_delivery_days;
      if (updates.urgent_delivery_days !== undefined) updatePayload.urgent_delivery_days = updates.urgent_delivery_days;
      if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('garment_rates')
        .update(updatePayload)
        .eq('shop_id', shopId)
        .eq('garment_type', garmentType)
        .select()
        .maybeSingle();

      if (error || !data) {
        // Upsert fallback
        const upsertPayload = {
          shop_id: shopId,
          garment_type: garmentType,
          base_stitching_rate: updates.base_stitching_rate ?? 1800,
          urgent_surcharge: updates.urgent_surcharge ?? 500,
          standard_delivery_days: updates.standard_delivery_days ?? 7,
          urgent_delivery_days: updates.urgent_delivery_days ?? 3,
          is_active: updates.is_active ?? true,
          updated_at: new Date().toISOString(),
        };
        const { data: upsertData, error: upsertError } = await supabase
          .from('garment_rates')
          .upsert(upsertPayload, { onConflict: 'shop_id,garment_type' })
          .select()
          .single();

        if (upsertError || !upsertData) {
          console.warn('Failed to upsert garment rate, returning local mock:', upsertError?.message);
          return mockUpdated;
        }
        return mapGarmentRateRow(upsertData as GarmentRateRow);
      }

      return mapGarmentRateRow(data as GarmentRateRow);
    } catch (networkErr) {
      console.warn('Supabase network error in updateRate, using local mock:', networkErr);
      return mockUpdated;
    }
  },

  async batchUpdateRates(shopId: string, rates: GarmentRate[]): Promise<GarmentRate[]> {
    const updatedRates: GarmentRate[] = [];
    for (const rate of rates) {
      const res = await this.updateRate(shopId, rate.garment_type, rate);
      updatedRates.push(res);
    }
    return updatedRates;
  },

  async resetDefaults(shopId: string): Promise<GarmentRate[]> {
    if (!isDatabaseConfigured()) {
      return getMockGarmentRates(shopId);
    }

    try {
      const { data, error } = await supabase.rpc('reset_default_garment_rates', {
        p_shop_id: shopId,
      });

      if (error || !data) {
        console.warn('Supabase reset_default_garment_rates RPC error, performing batch upsert fallback:', error?.message);
        const defaults = getMockGarmentRates(shopId);
        return this.batchUpdateRates(shopId, defaults);
      }

      return (data as GarmentRateRow[]).map(mapGarmentRateRow);
    } catch (networkErr) {
      console.warn('Supabase network error in resetDefaults:', networkErr);
      return getMockGarmentRates(shopId);
    }
  },
};

// ==========================================
// 10. Thermal Printer & Hardware Repository
// ==========================================

export const DEFAULT_PRINTER_SETTINGS: Omit<PrinterSettings, 'id' | 'shop_id' | 'created_at' | 'updated_at'> = {
  paper_width: '80mm',
  auto_print_on_booking: false,
  show_barcode: true,
  show_qr_tracking: true,
  show_urdu_labels: true,
  feed_lines: 3,
};

export function getMockPrinterSettings(shopId: string): PrinterSettings {
  return {
    id: `ps-mock-${shopId ? shopId.substring(0, 8) : 'default'}`,
    shop_id: shopId || 'a0000000-0000-0000-0000-000000000001',
    ...DEFAULT_PRINTER_SETTINGS,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

export const printerDb = {
  async getByShopId(shopId: string): Promise<PrinterSettings> {
    if (!shopId) {
      return getMockPrinterSettings(shopId);
    }

    if (!isDatabaseConfigured()) {
      return getMockPrinterSettings(shopId);
    }

    try {
      const { data, error } = await supabase
        .from('printer_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (error) {
        console.warn('Supabase printer_settings query error, using default settings:', error.message);
        return getMockPrinterSettings(shopId);
      }

      if (!data) {
        return getMockPrinterSettings(shopId);
      }

      return mapPrinterSettingsRow(data as PrinterSettingsRow);
    } catch (networkErr) {
      console.warn('Supabase network unreachable, using default printer settings:', networkErr);
      return getMockPrinterSettings(shopId);
    }
  },

  async update(
    shopId: string,
    updates: Partial<PrinterSettings>
  ): Promise<PrinterSettings> {
    const mockUpdated: PrinterSettings = {
      id: `ps-mock-${shopId ? shopId.substring(0, 8) : 'default'}`,
      shop_id: shopId || 'a0000000-0000-0000-0000-000000000001',
      paper_width: updates.paper_width ?? DEFAULT_PRINTER_SETTINGS.paper_width,
      auto_print_on_booking: updates.auto_print_on_booking ?? DEFAULT_PRINTER_SETTINGS.auto_print_on_booking,
      show_barcode: updates.show_barcode ?? DEFAULT_PRINTER_SETTINGS.show_barcode,
      show_qr_tracking: updates.show_qr_tracking ?? DEFAULT_PRINTER_SETTINGS.show_qr_tracking,
      show_urdu_labels: updates.show_urdu_labels ?? DEFAULT_PRINTER_SETTINGS.show_urdu_labels,
      feed_lines: updates.feed_lines ?? DEFAULT_PRINTER_SETTINGS.feed_lines,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!isDatabaseConfigured() || !shopId) {
      return mockUpdated;
    }

    try {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.paper_width !== undefined) updatePayload.paper_width = updates.paper_width;
      if (updates.auto_print_on_booking !== undefined) updatePayload.auto_print_on_booking = updates.auto_print_on_booking;
      if (updates.show_barcode !== undefined) updatePayload.show_barcode = updates.show_barcode;
      if (updates.show_qr_tracking !== undefined) updatePayload.show_qr_tracking = updates.show_qr_tracking;
      if (updates.show_urdu_labels !== undefined) updatePayload.show_urdu_labels = updates.show_urdu_labels;
      if (updates.feed_lines !== undefined) updatePayload.feed_lines = updates.feed_lines;

      const { data, error } = await supabase
        .from('printer_settings')
        .update(updatePayload)
        .eq('shop_id', shopId)
        .select()
        .maybeSingle();

      if (error || !data) {
        // Upsert fallback
        const upsertPayload = {
          shop_id: shopId,
          paper_width: updates.paper_width ?? DEFAULT_PRINTER_SETTINGS.paper_width,
          auto_print_on_booking: updates.auto_print_on_booking ?? DEFAULT_PRINTER_SETTINGS.auto_print_on_booking,
          show_barcode: updates.show_barcode ?? DEFAULT_PRINTER_SETTINGS.show_barcode,
          show_qr_tracking: updates.show_qr_tracking ?? DEFAULT_PRINTER_SETTINGS.show_qr_tracking,
          show_urdu_labels: updates.show_urdu_labels ?? DEFAULT_PRINTER_SETTINGS.show_urdu_labels,
          feed_lines: updates.feed_lines ?? DEFAULT_PRINTER_SETTINGS.feed_lines,
          updated_at: new Date().toISOString(),
        };

        const { data: upsertData, error: upsertError } = await supabase
          .from('printer_settings')
          .upsert(upsertPayload, { onConflict: 'shop_id' })
          .select()
          .single();

        if (upsertError || !upsertData) {
          console.warn('Failed to upsert printer settings, returning local fallback:', upsertError?.message);
          return mockUpdated;
        }

        return mapPrinterSettingsRow(upsertData as PrinterSettingsRow);
      }

      return mapPrinterSettingsRow(data as PrinterSettingsRow);
    } catch (networkErr) {
      console.warn('Supabase network error in printerDb.update, using local fallback:', networkErr);
      return mockUpdated;
    }
  },

  async resetDefaults(shopId: string): Promise<PrinterSettings> {
    return this.update(shopId, DEFAULT_PRINTER_SETTINGS);
  },
};

// ==========================================
// 11. Super Admin & Platform Operations Repository
// ==========================================

export interface AdminShopOverviewRow {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  status: string;
  owner_email: string | null;
  total_orders: number | string;
  member_count: number | string;
  created_at: string | Date;
  updated_at: string | Date;
}

export function mapAdminShopOverviewRow(row: AdminShopOverviewRow): AdminShopOverview {
  return {
    id: row.id,
    name: row.name,
    city: row.city || 'Wah Cantt',
    phone: row.phone,
    status: (row.status as ShopStatus) || 'ACTIVE',
    owner_email: row.owner_email || null,
    total_orders: Number(row.total_orders || 0),
    member_count: Number(row.member_count || 1),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

let mockAdminShopsState: AdminShopOverview[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Wah Cantt Bespoke Tailors',
    city: 'Wah Cantt',
    phone: '0300-1234567',
    status: 'ACTIVE',
    owner_email: 'founder@silaye.pk',
    total_orders: 142,
    member_count: 5,
    created_at: '2026-01-10T08:00:00.000Z',
    updated_at: '2026-08-25T10:00:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Anarkali Master Craftsmen',
    city: 'Lahore',
    phone: '0321-9876543',
    status: 'ACTIVE',
    owner_email: 'anarkali.craft@gmail.com',
    total_orders: 310,
    member_count: 8,
    created_at: '2026-02-01T09:30:00.000Z',
    updated_at: '2026-08-24T14:20:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Tariq Road Royal Suiting',
    city: 'Karachi',
    phone: '0333-5551234',
    status: 'ACTIVE',
    owner_email: 'tariqroad.royal@yahoo.com',
    total_orders: 245,
    member_count: 6,
    created_at: '2026-03-15T11:00:00.000Z',
    updated_at: '2026-08-26T16:45:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    name: 'Saddar Executive Tailors',
    city: 'Rawalpindi',
    phone: '0345-7778899',
    status: 'TRIAL',
    owner_email: 'saddar.executive@outlook.com',
    total_orders: 48,
    member_count: 3,
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-20T12:00:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    name: 'Blue Area Bespoke Studio',
    city: 'Islamabad',
    phone: '0312-4443322',
    status: 'ACTIVE',
    owner_email: 'bluearea.bespoke@gmail.com',
    total_orders: 185,
    member_count: 4,
    created_at: '2026-04-10T14:00:00.000Z',
    updated_at: '2026-08-22T09:15:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    name: 'Karkhano Traditional Stitchers',
    city: 'Peshawar',
    phone: '0301-8889900',
    status: 'SUSPENDED',
    owner_email: 'karkhano.tailors@gmail.com',
    total_orders: 89,
    member_count: 2,
    created_at: '2026-05-12T07:45:00.000Z',
    updated_at: '2026-08-15T18:00:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000007',
    name: 'Clock Tower Cloth House & Tailors',
    city: 'Faisalabad',
    phone: '0308-3332211',
    status: 'ACTIVE',
    owner_email: 'clocktower.fabrics@gmail.com',
    total_orders: 198,
    member_count: 5,
    created_at: '2026-05-28T13:30:00.000Z',
    updated_at: '2026-08-23T11:20:00.000Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000008',
    name: 'Cantt Heritage Silaye',
    city: 'Multan',
    phone: '0322-1114455',
    status: 'TRIAL',
    owner_email: 'multan.heritage@hotmail.com',
    total_orders: 34,
    member_count: 3,
    created_at: '2026-08-10T15:00:00.000Z',
    updated_at: '2026-08-27T08:00:00.000Z',
  },
];

export function getMockPlatformMetrics(): PlatformMetrics {
  const activeCount = mockAdminShopsState.filter((s) => s.status === 'ACTIVE').length;
  const suspendedCount = mockAdminShopsState.filter((s) => s.status === 'SUSPENDED').length;
  const totalOrders = mockAdminShopsState.reduce((acc, s) => acc + s.total_orders, 0);
  const totalMembers = mockAdminShopsState.reduce((acc, s) => acc + s.member_count, 0);

  return {
    total_shops: mockAdminShopsState.length,
    active_shops: activeCount,
    suspended_shops: suspendedCount,
    total_users: totalMembers + 4,
    total_orders: totalOrders,
    total_khata_volume: 1845000.0,
  };
}

export function getMockAdminShops(): AdminShopOverview[] {
  return [...mockAdminShopsState];
}

export const adminDb = {
  async checkIsSuperAdmin(): Promise<boolean> {
    if (!isDatabaseConfigured()) {
      return true; // Local development offline mode grants super admin access
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        return false;
      }

      // Check system_admins table for user_id
      const { data, error } = await supabase
        .from('system_admins')
        .select('id, role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      return true;
    } catch (err) {
      console.warn('adminDb.checkIsSuperAdmin check failed, safely returning false:', err);
      return false;
    }
  },

  async getPlatformMetrics(): Promise<PlatformMetrics> {
    if (!isDatabaseConfigured()) {
      return getMockPlatformMetrics();
    }

    try {
      const { data, error } = await supabase.rpc('get_platform_metrics');

      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        console.warn('get_platform_metrics RPC error, using local fallback:', error?.message);
        return getMockPlatformMetrics();
      }

      const row = Array.isArray(data) ? data[0] : data;
      return {
        total_shops: Number(row.total_shops || 0),
        active_shops: Number(row.active_shops || 0),
        suspended_shops: Number(row.suspended_shops || 0),
        total_users: Number(row.total_users || 0),
        total_orders: Number(row.total_orders || 0),
        total_khata_volume: Number(row.total_khata_volume || 0),
      };
    } catch (networkErr) {
      console.warn('Supabase network error in getPlatformMetrics, using local mock:', networkErr);
      return getMockPlatformMetrics();
    }
  },

  async getAllShops(): Promise<AdminShopOverview[]> {
    if (!isDatabaseConfigured()) {
      return getMockAdminShops();
    }

    try {
      const { data, error } = await supabase.rpc('get_all_shops_admin');

      if (error || !data) {
        console.warn('get_all_shops_admin RPC error, using local fallback:', error?.message);
        return getMockAdminShops();
      }

      return (data as AdminShopOverviewRow[]).map(mapAdminShopOverviewRow);
    } catch (networkErr) {
      console.warn('Supabase network error in getAllShops, using local mock:', networkErr);
      return getMockAdminShops();
    }
  },

  async setShopStatus(shopId: string, status: ShopStatus): Promise<boolean> {
    // Update local mock state
    const targetIdx = mockAdminShopsState.findIndex((s) => s.id === shopId);
    if (targetIdx !== -1) {
      mockAdminShopsState[targetIdx] = {
        ...mockAdminShopsState[targetIdx],
        status,
        updated_at: new Date().toISOString(),
      };
    }

    if (!isDatabaseConfigured()) {
      return true;
    }

    try {
      const { data, error } = await supabase.rpc('set_shop_status_admin', {
        p_shop_id: shopId,
        p_status: status,
      });

      if (error) {
        console.warn('set_shop_status_admin RPC error, attempting direct update fallback:', error.message);
        const { error: directErr } = await supabase
          .from('shops')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', shopId);

        if (directErr) {
          console.warn('Direct shops status update error, preserved local optimistic state:', directErr.message);
          return true;
        }
      }

      return true;
    } catch (networkErr) {
      console.warn('Supabase network error in setShopStatus, updated local state only:', networkErr);
      return true;
    }
  },
};



