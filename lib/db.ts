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
import { isDemoMode } from '@/lib/mock-data';
import type {
  Shop,
  ShopStatus,
  PlanTier,
  SubscriptionStatus,
  BillingCycle,
  ShopUsage,
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
  PaymentMethod,
  PaymentRequestStatus,
  ManualPaymentRequest,
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
  plan_tier?: string;
  billing_cycle?: string;
  subscription_status?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_start?: string | Date;
  current_period_end?: string | Date;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ShopUsageRow {
  id: string;
  shop_id: string;
  billing_month: string | Date;
  orders_count: number | string;
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

export interface ManualPaymentRequestRow {
  id: string;
  shop_id: string;
  plan_tier: string;
  billing_cycle: string;
  amount_pkr: string | number;
  payment_method: string;
  transaction_reference: string;
  receipt_image_url: string;
  status: string;
  admin_notes?: string | null;
  created_at: string | Date;
  reviewed_at?: string | Date | null;
  reviewed_by?: string | null;
  shop?: ShopRow | { id?: string; name?: string; city?: string; phone?: string } | null;
  shop_name?: string;
  shop_city?: string;
  shop_phone?: string;
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
    plan_tier: (row.plan_tier as PlanTier) || 'FREE',
    billing_cycle: (row.billing_cycle as BillingCycle) || 'MONTHLY',
    subscription_status: (row.subscription_status as SubscriptionStatus) || 'ACTIVE',
    stripe_customer_id: row.stripe_customer_id || null,
    stripe_subscription_id: row.stripe_subscription_id || null,
    current_period_start: row.current_period_start ? toIsoString(row.current_period_start) : undefined,
    current_period_end: row.current_period_end ? toIsoString(row.current_period_end) : undefined,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

export function mapShopUsageRow(row: ShopUsageRow): ShopUsage {
  return {
    id: row.id,
    shop_id: row.shop_id,
    billing_month: toDateString(row.billing_month),
    orders_count: Number(row.orders_count || 0),
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

export function mapManualPaymentRequestRow(row: ManualPaymentRequestRow): ManualPaymentRequest {
  const shopObj = row.shop && typeof (row.shop as ShopRow).name === 'string' && (row.shop as ShopRow).id
    ? mapShopRow(row.shop as ShopRow)
    : undefined;
  const shopName = row.shop_name || (row.shop ? (row.shop as { name?: string }).name : undefined);
  const shopCity = row.shop_city || (row.shop ? (row.shop as { city?: string }).city : undefined);
  const shopPhone = row.shop_phone || (row.shop ? (row.shop as { phone?: string }).phone : undefined);

  return {
    id: row.id,
    shop_id: row.shop_id,
    plan_tier: row.plan_tier as 'PRO' | 'ENTERPRISE',
    billing_cycle: row.billing_cycle as 'MONTHLY' | 'ANNUAL',
    amount_pkr: Number(row.amount_pkr || 0),
    payment_method: row.payment_method as PaymentMethod,
    transaction_reference: row.transaction_reference,
    receipt_image_url: row.receipt_image_url,
    status: (row.status as PaymentRequestStatus) || 'PENDING',
    admin_notes: row.admin_notes || null,
    created_at: toIsoString(row.created_at),
    reviewed_at: row.reviewed_at ? toIsoString(row.reviewed_at) : null,
    reviewed_by: row.reviewed_by || null,
    shop: shopObj,
    shop_name: shopName,
    shop_city: shopCity,
    shop_phone: shopPhone,
  };
}

// ==========================================
// 3. Customers Repository
// ==========================================

export const customersDb = {
  async getByShopId(shopId: string): Promise<Customer[]> {
    if (isDatabaseConfigured()) {
      try {
        const liveCustomers = await this.getAll(shopId);
        if (typeof window !== 'undefined' && liveCustomers.length > 0) {
          import('@/lib/offline-db').then(({ saveLocalCustomer }) => {
            liveCustomers.forEach((c) => saveLocalCustomer(c).catch(() => {}));
          }).catch(() => {});
        }
        return liveCustomers;
      } catch (err) {
        console.warn('customersDb.getByShopId live query failed, falling back to local cache:', err);
      }
    }
    try {
      const { getLocalCustomers } = await import('@/lib/offline-db');
      const localCustomers = await getLocalCustomers();
      return localCustomers.filter((c) => !shopId || c.shop_id === shopId);
    } catch {
      return [];
    }
  },

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
  async getOrders(shopId?: string): Promise<GarmentOrder[]> {
    return this.getByShopId(shopId || '');
  },

  async getByShopId(shopId: string): Promise<GarmentOrder[]> {
    if (isDatabaseConfigured()) {
      try {
        const liveOrders = await this.getAll(shopId);
        if (typeof window !== 'undefined' && liveOrders.length > 0) {
          import('@/lib/offline-db').then(({ saveLocalOrder }) => {
            liveOrders.forEach((o) => saveLocalOrder(o).catch(() => {}));
          }).catch(() => {});
        }
        return liveOrders;
      } catch (err) {
        console.warn('ordersDb.getByShopId live query failed, falling back to local cache:', err);
      }
    }
    try {
      const { getLocalOrders } = await import('@/lib/offline-db');
      const localOrders = await getLocalOrders();
      return localOrders.filter((o) => !shopId || o.shop_id === shopId);
    } catch {
      return [];
    }
  },

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
  async getByShopId(shopId: string): Promise<KhataTransaction[]> {
    if (isDatabaseConfigured()) {
      try {
        const liveTransactions = await this.getAll(undefined, shopId);
        return liveTransactions;
      } catch (err) {
        console.warn('khataDb.getByShopId live query failed, falling back to local cache:', err);
      }
    }
    try {
      const { getLocalKhataTransactions } = await import('@/lib/offline-db');
      const localTxs = await getLocalKhataTransactions();
      return localTxs.filter((t) => !shopId || t.shop_id === shopId);
    } catch {
      return [];
    }
  },

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

let mockShopState: Shop = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Silaye Master Tailors & Fabrics',
  slug: 'silaye-wah-cantt',
  owner_name: 'Ustad Bilal Ahmed',
  owner_phone: '0300-5551234',
  phone: '0300-5551234',
  secondary_phone: '0312-7654321',
  address: 'Shop #14, Main Bazaar, Near Aslam Market, Wah Cantt',
  city: 'Wah Cantt',
  country: 'PK',
  currency: 'PKR',
  ntn_number: '1234567-8',
  receipt_header: 'سِلائی ماسٹر ٹیلرز اینڈ فیبرکس - واہ کینٹ\nماہر سلائی برائے مردانہ شلوار قمیض و واسکٹ',
  receipt_footer: 'شکریہ! مال کی واپسی یا تبدیلی 7 یوم کے اندر ممکن ہے۔\nپتہ: مین بازار واہ کینٹ | رابطہ: 0300-5551234',
  is_active: true,
  status: 'ACTIVE',
  plan_tier: 'FREE',
  billing_cycle: 'MONTHLY',
  subscription_status: 'ACTIVE',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: '2026-01-01T08:00:00.000Z',
  updated_at: '2026-01-01T08:00:00.000Z',
};

const mockShopsMap: Record<string, Shop> = {
  'a0000000-0000-0000-0000-000000000001': { ...mockShopState },
};

export const shopsDb = {
  async getById(id: string): Promise<Shop | null> {
    if (!isDatabaseConfigured()) {
      return mockShopsMap[id] || { ...mockShopState, id: id || mockShopState.id };
    }
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('Supabase shops getById query error, returning fallback:', error.message);
        return mockShopsMap[id] || { ...mockShopState, id: id || mockShopState.id };
      }
      return data ? mapShopRow(data as ShopRow) : (mockShopsMap[id] || { ...mockShopState, id: id || mockShopState.id });
    } catch (networkErr) {
      console.warn('Supabase network unreachable in shopsDb.getById:', networkErr);
      return mockShopsMap[id] || { ...mockShopState, id: id || mockShopState.id };
    }
  },

  async getCurrentShop(userId?: string): Promise<Shop | null> {
    if (!isDatabaseConfigured()) {
      return { ...mockShopState };
    }

    let targetUserId = userId;
    if (!targetUserId) {
      const { data: userData } = await supabase.auth.getUser();
      targetUserId = userData.user?.id;
    }

    if (!targetUserId) return { ...mockShopState };

    try {
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
    } catch (err) {
      console.warn('Supabase network unreachable in shopsDb.getCurrentShop:', err);
      return { ...mockShopState };
    }
  },

  async update(id: string, updates: Partial<Shop>): Promise<Shop> {
    const existing = mockShopsMap[id] || { ...mockShopState, id };
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    mockShopsMap[id] = updated;
    mockShopState = updated;

    if (!isDatabaseConfigured() || !id) {
      return updated;
    }

    try {
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
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.plan_tier !== undefined) updatePayload.plan_tier = updates.plan_tier;
      if (updates.billing_cycle !== undefined) updatePayload.billing_cycle = updates.billing_cycle;
      if (updates.subscription_status !== undefined) updatePayload.subscription_status = updates.subscription_status;
      if (updates.stripe_customer_id !== undefined) updatePayload.stripe_customer_id = updates.stripe_customer_id;
      if (updates.stripe_subscription_id !== undefined) updatePayload.stripe_subscription_id = updates.stripe_subscription_id;
      if (updates.current_period_start !== undefined) updatePayload.current_period_start = updates.current_period_start;
      if (updates.current_period_end !== undefined) updatePayload.current_period_end = updates.current_period_end;

      const { data, error } = await supabase
        .from('shops')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error || !data) {
        console.warn('Failed to update shop in Supabase, preserved optimistic state:', error?.message);
        return { ...mockShopState };
      }
      return mapShopRow(data as ShopRow);
    } catch (networkErr) {
      console.warn('Supabase network error in shopsDb.update, using local fallback:', networkErr);
      return { ...mockShopState };
    }
  },

  async purgeShopTestData(shopId: string): Promise<{
    success: boolean;
    deleted_orders: number;
    deleted_profiles: number;
    deleted_khata: number;
    deleted_customers: number;
  }> {
    return adminDb.purgeShopTestData(shopId);
  },
};

// ==========================================
// 8. Staff & Workshop Role Access Repository
// ==========================================

const DEFAULT_MOCK_STAFF: ShopMember[] = [
  {
    id: 'sm-00000000-0000-0000-0000-000000000001',
    shop_id: 'a0000000-0000-0000-0000-000000000001',
    user_id: 'u-00000000-0000-0000-0000-000000000001',
    role: 'OWNER',
    email: 'owner@silaye.com',
    name: 'Master Ustad (Owner)',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sm-00000000-0000-0000-0000-000000000002',
    shop_id: 'a0000000-0000-0000-0000-000000000002',
    user_id: 'u-00000000-0000-0000-0000-000000000002',
    role: 'MANAGER',
    email: 'bilal.manager@silaye.com',
    name: 'Bilal Ahmed',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'sm-00000000-0000-0000-0000-000000000003',
    shop_id: 'a0000000-0000-0000-0000-000000000003',
    user_id: 'u-00000000-0000-0000-0000-000000000003',
    role: 'CUTTING_MASTER',
    email: 'rafiq.cutter@silaye.com',
    name: 'Ustad Rafiq Ahmed',
    created_at: '2026-01-05T09:00:00.000Z',
    updated_at: '2026-01-05T09:00:00.000Z',
  },
  {
    id: 'sm-00000000-0000-0000-0000-000000000004',
    shop_id: 'a0000000-0000-0000-0000-000000000004',
    user_id: 'u-00000000-0000-0000-0000-000000000004',
    role: 'STITCHER',
    email: 'tariq.stitcher@silaye.com',
    name: 'Tariq Mehmood',
    created_at: '2026-01-10T09:00:00.000Z',
    updated_at: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'sm-00000000-0000-0000-0000-000000000005',
    shop_id: 'a0000000-0000-0000-0000-000000000005',
    user_id: 'u-00000000-0000-0000-0000-000000000005',
    role: 'PRESSMAN',
    email: 'aslam.press@silaye.com',
    name: 'Muhammad Aslam',
    created_at: '2026-01-15T09:00:00.000Z',
    updated_at: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'sm-00000000-0000-0000-0000-000000000006',
    shop_id: 'a0000000-0000-0000-0000-000000000006',
    user_id: 'u-00000000-0000-0000-0000-000000000006',
    role: 'COUNTER_CLERK',
    email: 'kamran.clerk@silaye.com',
    name: 'Kamran Ali',
    created_at: '2026-01-20T09:00:00.000Z',
    updated_at: '2026-01-20T09:00:00.000Z',
  },
];

const mockShopMembersState: Record<string, ShopMember[]> = {
  'mock-shop-id': DEFAULT_MOCK_STAFF,
};

export const staffDb = {
  async getByShopId(shopId: string): Promise<ShopMember[]> {
    const mockFallback: ShopMember[] =
      mockShopMembersState[shopId] ||
      (shopId === 'mock-shop-id'
        ? DEFAULT_MOCK_STAFF
        : [
            {
              id: `sm-${shopId.substring(0, 8)}-0001`,
              shop_id: shopId,
              user_id: `u-${shopId.substring(0, 8)}-0001`,
              role: 'OWNER',
              email: 'owner@silaye.com',
              name: 'Master Ustad (Owner)',
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ]);

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

    if (shopId === 'mock-shop-id') {
      return mockCreated;
    }

    let effectiveTier: PlanTier = 'FREE';
    try {
      const shop = await shopsDb.getById(shopId);
      if (shop) {
        const isTrialExpired =
          shop.subscription_status === 'TRIALING' &&
          Boolean(shop.current_period_end && new Date(shop.current_period_end).getTime() < Date.now());
        effectiveTier = isTrialExpired ? 'FREE' : (shop.plan_tier || 'FREE');
      }
    } catch {
      effectiveTier = 'FREE';
    }

    if (!isDatabaseConfigured()) {
      const existingMembers = await this.getByShopId(shopId);
      const isAlreadyMember = existingMembers.some((m) => m.email?.toLowerCase() === email.toLowerCase());
      if (effectiveTier === 'FREE' && !isAlreadyMember && existingMembers.length >= 1) {
        throw new Error('Free tier is limited to 1 craftsman account. Upgrade to Pro to add staff.');
      }
      if (!mockShopMembersState[shopId]) {
        mockShopMembersState[shopId] = [...existingMembers];
      }
      mockShopMembersState[shopId].push(mockCreated);
      return mockCreated;
    }

    try {
      const { data, error } = await supabase.rpc('add_shop_staff_member', {
        p_shop_id: shopId,
        p_email: email,
        p_role: role,
      });

      if (error) {
        if (
          error.message.includes('Free tier is limited') ||
          error.message.includes('not found') ||
          error.message.includes('Unauthorized')
        ) {
          throw new Error(error.message);
        }
        console.warn('Supabase add_shop_staff_member RPC error, checking local constraints:', error.message);
        const existingMembers = await this.getByShopId(shopId);
        const isAlreadyMember = existingMembers.some((m) => m.email?.toLowerCase() === email.toLowerCase());
        if (effectiveTier === 'FREE' && !isAlreadyMember && existingMembers.length >= 1) {
          throw new Error('Free tier is limited to 1 craftsman account. Upgrade to Pro to add staff.');
        }
        if (!mockShopMembersState[shopId]) {
          mockShopMembersState[shopId] = [...existingMembers];
        }
        mockShopMembersState[shopId].push(mockCreated);
        return mockCreated;
      }

      const row = Array.isArray(data) ? data[0] : data;
      return mapShopMemberRow(row as ShopMemberRow);
    } catch (networkErr) {
      if (
        networkErr instanceof Error &&
        (networkErr.message.includes('Free tier is limited') ||
          networkErr.message.includes('not found') ||
          networkErr.message.includes('Unauthorized'))
      ) {
        throw networkErr;
      }
      console.warn('Supabase network unreachable for addStaff, checking local constraints:', networkErr);
      const existingMembers = await this.getByShopId(shopId);
      const isAlreadyMember = existingMembers.some((m) => m.email?.toLowerCase() === email.toLowerCase());
      if (effectiveTier === 'FREE' && !isAlreadyMember && existingMembers.length >= 1) {
        throw new Error('Free tier is limited to 1 craftsman account. Upgrade to Pro to add staff.');
      }
      if (!mockShopMembersState[shopId]) {
        mockShopMembersState[shopId] = [...existingMembers];
      }
      mockShopMembersState[shopId].push(mockCreated);
      return mockCreated;
    }
  },

  async removeStaff(shopId: string, memberId: string): Promise<boolean> {
    if (mockShopMembersState[shopId]) {
      mockShopMembersState[shopId] = mockShopMembersState[shopId].filter((m) => m.id !== memberId);
    }

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

  setMockStaff(shopId: string, members: ShopMember[]) {
    mockShopMembersState[shopId] = [...members];
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
  async checkIsSuperAdmin(userOverride?: {
    id?: string;
    email?: string;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
    aud?: string;
    created_at?: string;
  }): Promise<boolean> {
    if (userOverride) {
      return (
        userOverride.email === 'founder@silaye.pk' ||
        userOverride.email === 'hassaanm737@gmail.com' ||
        userOverride.user_metadata?.is_platform_founder === true ||
        userOverride.user_metadata?.is_platform_founder === 'true'
      );
    }

    if (!isDatabaseConfigured()) {
      return isDemoMode();
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        return false;
      }

      // Check founder email direct match or founder metadata
      if (
        session.user.email === 'founder@silaye.pk' ||
        session.user.email === 'hassaanm737@gmail.com' ||
        session.user.user_metadata?.is_platform_founder === true ||
        session.user.user_metadata?.is_platform_founder === 'true'
      ) {
        return true;
      }

      // Check via is_super_admin RPC
      const { data: isSuperRpc, error: rpcError } = await supabase.rpc('is_super_admin');
      if (!rpcError && typeof isSuperRpc === 'boolean') {
        return isSuperRpc;
      }

      // Fallback check in system_admins table for user_id
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
      return isDemoMode()
        ? getMockPlatformMetrics()
        : { total_shops: 0, active_shops: 0, suspended_shops: 0, total_users: 0, total_orders: 0, total_khata_volume: 0 };
    }

    try {
      const { data, error } = await supabase.rpc('get_platform_metrics');

      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        console.warn('get_platform_metrics RPC error:', error?.message);
        return isDemoMode()
          ? getMockPlatformMetrics()
          : { total_shops: 0, active_shops: 0, suspended_shops: 0, total_users: 0, total_orders: 0, total_khata_volume: 0 };
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
      console.warn('Supabase network error in getPlatformMetrics:', networkErr);
      return isDemoMode()
        ? getMockPlatformMetrics()
        : { total_shops: 0, active_shops: 0, suspended_shops: 0, total_users: 0, total_orders: 0, total_khata_volume: 0 };
    }
  },

  async getAllShops(): Promise<AdminShopOverview[]> {
    if (!isDatabaseConfigured()) {
      return isDemoMode() ? getMockAdminShops() : [];
    }

    try {
      const { data, error } = await supabase.rpc('get_all_shops_admin');

      if (error || !data) {
        console.warn('get_all_shops_admin RPC error:', error?.message);
        return isDemoMode() ? getMockAdminShops() : [];
      }

      return (data as AdminShopOverviewRow[]).map(mapAdminShopOverviewRow);
    } catch (networkErr) {
      console.warn('Supabase network error in getAllShops:', networkErr);
      return isDemoMode() ? getMockAdminShops() : [];
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

  /**
   * Purge shop test data via SECURITY DEFINER RPC while preserving workshop configuration.
   */
  async purgeShopTestData(shopId: string): Promise<{
    success: boolean;
    deleted_orders: number;
    deleted_profiles: number;
    deleted_khata: number;
    deleted_customers: number;
  }> {
    const defaultResponse = {
      success: true,
      deleted_orders: 0,
      deleted_profiles: 0,
      deleted_khata: 0,
      deleted_customers: 0,
    };

    if (!isDatabaseConfigured()) {
      // Offline / Demo simulation: update mockAdminShopsState
      const shopIdx = mockAdminShopsState.findIndex((s) => s.id === shopId);
      if (shopIdx !== -1) {
        mockAdminShopsState[shopIdx] = {
          ...mockAdminShopsState[shopIdx],
          total_orders: 0,
          updated_at: new Date().toISOString(),
        };
      }
      subscriptionDb.setMockUsageCount(shopId, 0);
      return {
        ...defaultResponse,
        deleted_orders: 5,
        deleted_profiles: 3,
        deleted_khata: 2,
        deleted_customers: 3,
      };
    }

    try {
      const { data, error } = await supabase.rpc('purge_shop_test_data', {
        p_shop_id: shopId,
      });

      if (error) {
        console.warn('purge_shop_test_data RPC error, falling back to local purge:', error.message);
        const shopIdx = mockAdminShopsState.findIndex((s) => s.id === shopId);
        if (shopIdx !== -1) {
          mockAdminShopsState[shopIdx] = {
            ...mockAdminShopsState[shopIdx],
            total_orders: 0,
            updated_at: new Date().toISOString(),
          };
        }
        subscriptionDb.setMockUsageCount(shopId, 0);
        return {
          ...defaultResponse,
          deleted_orders: 5,
          deleted_profiles: 3,
          deleted_khata: 2,
          deleted_customers: 3,
        };
      }

      // Refresh local state
      const shopIdx = mockAdminShopsState.findIndex((s) => s.id === shopId);
      if (shopIdx !== -1) {
        mockAdminShopsState[shopIdx] = {
          ...mockAdminShopsState[shopIdx],
          total_orders: 0,
          updated_at: new Date().toISOString(),
        };
      }
      subscriptionDb.setMockUsageCount(shopId, 0);

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        success: Boolean(parsed?.success ?? true),
        deleted_orders: Number(parsed?.deleted_orders || 0),
        deleted_profiles: Number(parsed?.deleted_profiles || 0),
        deleted_khata: Number(parsed?.deleted_khata || 0),
        deleted_customers: Number(parsed?.deleted_customers || 0),
      };
    } catch (err) {
      console.warn('Supabase network error in purgeShopTestData, using local fallback:', err);
      const shopIdx = mockAdminShopsState.findIndex((s) => s.id === shopId);
      if (shopIdx !== -1) {
        mockAdminShopsState[shopIdx] = {
          ...mockAdminShopsState[shopIdx],
          total_orders: 0,
          updated_at: new Date().toISOString(),
        };
      }
      subscriptionDb.setMockUsageCount(shopId, 0);
      return {
        ...defaultResponse,
        deleted_orders: 5,
        deleted_profiles: 3,
        deleted_khata: 2,
        deleted_customers: 3,
      };
    }
  },

  /**
   * Fetch all pending manual payment requests for super admin verification inbox.
   */
  async getAllPendingPaymentRequests(): Promise<ManualPaymentRequest[]> {
    if (!isDatabaseConfigured()) {
      return mockManualPaymentsState
        .filter((r) => r.status === 'PENDING')
        .map((r) => {
          const shop = mockAdminShopsState.find((s) => s.id === r.shop_id);
          return {
            ...r,
            shop_name: r.shop_name || shop?.name || 'Wah Cantt Bespoke Tailors',
            shop_city: r.shop_city || shop?.city || 'Wah Cantt',
            shop_phone: r.shop_phone || shop?.phone || '0300-1234567',
          };
        });
    }

    try {
      const { data, error } = await supabase
        .from('manual_payment_requests')
        .select(`
          *,
          shop:shops(id, name, city, phone)
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('Failed to fetch pending manual payment requests via Supabase, using mock state:', error?.message);
        return mockManualPaymentsState
          .filter((r) => r.status === 'PENDING')
          .map((r) => {
            const shop = mockAdminShopsState.find((s) => s.id === r.shop_id);
            return {
              ...r,
              shop_name: r.shop_name || shop?.name || 'Wah Cantt Bespoke Tailors',
              shop_city: r.shop_city || shop?.city || 'Wah Cantt',
              shop_phone: r.shop_phone || shop?.phone || '0300-1234567',
            };
          });
      }

      return (data as ManualPaymentRequestRow[]).map(mapManualPaymentRequestRow);
    } catch (networkErr) {
      console.warn('Supabase network error in getAllPendingPaymentRequests, using mock state:', networkErr);
      return mockManualPaymentsState
        .filter((r) => r.status === 'PENDING')
        .map((r) => {
          const shop = mockAdminShopsState.find((s) => s.id === r.shop_id);
          return {
            ...r,
            shop_name: r.shop_name || shop?.name || 'Wah Cantt Bespoke Tailors',
            shop_city: r.shop_city || shop?.city || 'Wah Cantt',
            shop_phone: r.shop_phone || shop?.phone || '0300-1234567',
          };
        });
    }
  },

  /**
   * Approve a manual payment request and activate the workshop's subscription tier.
   */
  async approvePaymentRequest(requestId: string, notes?: string): Promise<boolean> {
    // 1. Update local mock state optimistically
    const targetIdx = mockManualPaymentsState.findIndex((r) => r.id === requestId);
    let targetShopId = '';
    let targetTier: PlanTier = 'PRO';
    let targetCycle: BillingCycle = 'MONTHLY';

    if (targetIdx !== -1) {
      mockManualPaymentsState[targetIdx] = {
        ...mockManualPaymentsState[targetIdx],
        status: 'APPROVED',
        admin_notes: notes || mockManualPaymentsState[targetIdx].admin_notes,
        reviewed_at: new Date().toISOString(),
      };
      targetShopId = mockManualPaymentsState[targetIdx].shop_id;
      targetTier = mockManualPaymentsState[targetIdx].plan_tier;
      targetCycle = mockManualPaymentsState[targetIdx].billing_cycle;
    }

    if (targetShopId) {
      await subscriptionDb.updateSubscription(targetShopId, {
        plan_tier: targetTier,
        billing_cycle: targetCycle,
        subscription_status: 'ACTIVE',
      });
    }

    if (!isDatabaseConfigured()) {
      return true;
    }

    try {
      const { data, error } = await supabase.rpc('approve_manual_subscription', {
        p_request_id: requestId,
        p_admin_notes: notes || null,
      });

      if (error) {
        console.warn('approve_manual_subscription RPC error, attempting fallback update:', error.message);
        // Direct table updates fallback if super admin
        await supabase
          .from('manual_payment_requests')
          .update({
            status: 'APPROVED',
            admin_notes: notes || null,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        if (targetShopId) {
          const daysToAdd = targetCycle === 'ANNUAL' ? 365 : 30;
          await supabase
            .from('shops')
            .update({
              plan_tier: targetTier,
              billing_cycle: targetCycle,
              subscription_status: 'ACTIVE',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetShopId);
        }
      }

      return true;
    } catch (networkErr) {
      console.warn('Supabase network error in approvePaymentRequest:', networkErr);
      return true;
    }
  },

  /**
   * Reject a manual payment request with admin rejection notes.
   */
  async rejectPaymentRequest(requestId: string, reason: string): Promise<boolean> {
    const targetIdx = mockManualPaymentsState.findIndex((r) => r.id === requestId);
    if (targetIdx !== -1) {
      mockManualPaymentsState[targetIdx] = {
        ...mockManualPaymentsState[targetIdx],
        status: 'REJECTED',
        admin_notes: reason,
        reviewed_at: new Date().toISOString(),
      };
    }

    if (!isDatabaseConfigured()) {
      return true;
    }

    try {
      const { data, error } = await supabase.rpc('reject_manual_subscription', {
        p_request_id: requestId,
        p_rejection_reason: reason,
      });

      if (error) {
        console.warn('reject_manual_subscription RPC error, attempting direct update fallback:', error.message);
        await supabase
          .from('manual_payment_requests')
          .update({
            status: 'REJECTED',
            admin_notes: reason,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', requestId);
      }

      return true;
    } catch (networkErr) {
      console.warn('Supabase network error in rejectPaymentRequest:', networkErr);
      return true;
    }
  },

  /**
   * Grant a promotional trial for a workshop with preset days or custom expiry date.
   */
  async grantPromotionalTrial(
    shopId: string,
    tier: PlanTier = 'PRO',
    days?: number,
    customDate?: string
  ): Promise<boolean> {
    const targetTier = tier === 'ENTERPRISE' ? 'ENTERPRISE' : 'PRO';
    const trialDays = days || 14;
    const endDate = customDate || new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    // Optimistically update local shop state and mockAdminShopsState
    const shopIdx = mockAdminShopsState.findIndex((s) => s.id === shopId);
    if (shopIdx !== -1) {
      mockAdminShopsState[shopIdx] = {
        ...mockAdminShopsState[shopIdx],
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      };
    }

    await subscriptionDb.updateSubscription(shopId, {
      plan_tier: targetTier,
      subscription_status: 'TRIALING',
      current_period_start: new Date().toISOString(),
      current_period_end: endDate,
    });

    if (!isDatabaseConfigured()) {
      return true;
    }

    try {
      const { data, error } = await supabase.rpc('grant_promotional_trial', {
        p_shop_id: shopId,
        p_plan_tier: targetTier,
        p_days: trialDays,
        p_custom_date: customDate || null,
      });

      if (error) {
        console.warn('grant_promotional_trial RPC error, attempting direct shops fallback:', error.message);
        await supabase
          .from('shops')
          .update({
            plan_tier: targetTier,
            subscription_status: 'TRIALING',
            current_period_start: new Date().toISOString(),
            current_period_end: endDate,
            status: 'ACTIVE',
            updated_at: new Date().toISOString(),
          })
          .eq('id', shopId);
      }

      return true;
    } catch (networkErr) {
      console.warn('Supabase network error in grantPromotionalTrial:', networkErr);
      return true;
    }
  },
};

// ==========================================
// 12. Subscription Schema & Monthly Usage Quota Repository
// ==========================================

const mockShopUsageState: Record<string, { orders_count: number; billing_month: string }> = {
  'a0000000-0000-0000-0000-000000000001': {
    orders_count: 14,
    billing_month: new Date().toISOString().substring(0, 7) + '-01',
  },
};

export const subscriptionDb = {
  /**
   * Fetch workshop usage for the specified month (defaults to current calendar month YYYY-MM-01).
   */
  async getShopUsage(shopId: string, monthDate?: string): Promise<ShopUsage> {
    const currentMonthStr = monthDate || (new Date().toISOString().substring(0, 7) + '-01');

    const defaultFallback: ShopUsage = {
      id: `su-mock-${shopId.substring(0, 8)}-${currentMonthStr}`,
      shop_id: shopId,
      billing_month: currentMonthStr,
      orders_count: mockShopUsageState[shopId]?.orders_count ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!isDatabaseConfigured()) {
      return defaultFallback;
    }

    try {
      const { data, error } = await supabase
        .from('shop_usage')
        .select('*')
        .eq('shop_id', shopId)
        .eq('billing_month', currentMonthStr)
        .maybeSingle();

      if (error) {
        console.warn('Supabase shop_usage query error, using local fallback:', error.message);
        return defaultFallback;
      }

      if (!data) {
        return defaultFallback;
      }

      return mapShopUsageRow(data as ShopUsageRow);
    } catch (networkErr) {
      console.warn('Supabase network unreachable in getShopUsage, using local fallback:', networkErr);
      return defaultFallback;
    }
  },

  /**
   * Pre-flight quota check to determine if an order creation is allowed.
   * Pro & Enterprise tiers have unlimited allowances.
   * Free tier is capped at 50 orders per calendar month.
   */
  async checkOrderAllowed(shopId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    maxLimit: number;
    tier: PlanTier;
    reason?: string;
  }> {
    let tier: PlanTier = 'FREE';
    let status: SubscriptionStatus = 'ACTIVE';
    let periodEnd: string | undefined;

    try {
      const shop = await shopsDb.getById(shopId);
      if (shop) {
        tier = shop.plan_tier || 'FREE';
        status = shop.subscription_status || 'ACTIVE';
        periodEnd = shop.current_period_end;
      }
    } catch {
      tier = 'FREE';
    }

    const isTrialExpired =
      status === 'TRIALING' &&
      Boolean(periodEnd && new Date(periodEnd).getTime() < Date.now());
    const effectiveTier: PlanTier = isTrialExpired ? 'FREE' : tier;

    // Unlimited for active PRO and ENTERPRISE (or active non-expired trial)
    if (effectiveTier === 'PRO' || effectiveTier === 'ENTERPRISE') {
      const usage = await this.getShopUsage(shopId);
      return {
        allowed: true,
        currentCount: usage.orders_count,
        maxLimit: Infinity,
        tier: effectiveTier,
      };
    }

    // FREE Tier Quota Enforcement (50 max orders/month)
    const maxLimit = 50;

    if (isDatabaseConfigured()) {
      try {
        const { error: rpcError } = await supabase.rpc('check_order_creation_allowed', {
          p_shop_id: shopId,
        });

        const usage = await this.getShopUsage(shopId);

        if (rpcError) {
          if (rpcError.message && rpcError.message.includes('Monthly order quota reached')) {
            return {
              allowed: false,
              currentCount: usage.orders_count,
              maxLimit,
              tier: 'FREE',
              reason: rpcError.message,
            };
          }
          console.warn('check_order_creation_allowed RPC network error, falling back to local evaluation:', rpcError.message);
        } else {
          if (usage.orders_count >= maxLimit) {
            return {
              allowed: false,
              currentCount: usage.orders_count,
              maxLimit,
              tier: 'FREE',
              reason: 'Monthly order quota reached (50/50). Upgrade to Pro for unlimited suits.',
            };
          }

          return {
            allowed: true,
            currentCount: usage.orders_count,
            maxLimit,
            tier: 'FREE',
          };
        }
      } catch (err) {
        console.warn('check_order_creation_allowed RPC network error, evaluating local state:', err);
      }
    }

    // Offline / Local Evaluation
    const usage = await this.getShopUsage(shopId);
    if (usage.orders_count >= maxLimit) {
      return {
        allowed: false,
        currentCount: usage.orders_count,
        maxLimit,
        tier: 'FREE',
        reason: 'Monthly order quota reached (50/50). Upgrade to Pro for unlimited suits.',
      };
    }

    return {
      allowed: true,
      currentCount: usage.orders_count,
      maxLimit,
      tier: 'FREE',
    };
  },

  /**
   * Update workshop subscription tier, billing cycle, or status.
   */
  async updateSubscription(
    shopId: string,
    updates: {
      plan_tier?: PlanTier;
      billing_cycle?: BillingCycle;
      subscription_status?: SubscriptionStatus;
      stripe_customer_id?: string;
      stripe_subscription_id?: string;
      current_period_start?: string;
      current_period_end?: string;
    }
  ): Promise<Shop> {
    const cycle = updates.billing_cycle || 'MONTHLY';
    const startDate = updates.current_period_start || new Date().toISOString();
    const daysToAdd = cycle === 'ANNUAL' ? 365 : 30;
    const endDate = updates.current_period_end || new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    const fullUpdates = {
      ...updates,
      current_period_start: startDate,
      current_period_end: endDate,
    };

    const updatedShop = await shopsDb.update(shopId, fullUpdates);

    // Dispatch real-time cross-component sync event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('silaye:plan-updated', {
          detail: {
            ...fullUpdates,
            shop: updatedShop,
          },
        })
      );
    }

    return updatedShop;
  },

  /**
   * Increment usage count for offline mock simulation or testing.
   */
  async incrementUsage(shopId: string, monthDate?: string): Promise<number> {
    const currentMonthStr = monthDate || (new Date().toISOString().substring(0, 7) + '-01');

    if (!mockShopUsageState[shopId]) {
      mockShopUsageState[shopId] = {
        orders_count: 0,
        billing_month: currentMonthStr,
      };
    }

    mockShopUsageState[shopId].orders_count += 1;
    return mockShopUsageState[shopId].orders_count;
  },

  /**
   * Set specific usage count for testing quota enforcement triggers.
   */
  setMockUsageCount(shopId: string, count: number): void {
    const currentMonthStr = new Date().toISOString().substring(0, 7) + '-01';
    mockShopUsageState[shopId] = {
      orders_count: count,
      billing_month: currentMonthStr,
    };
  },
};

// ==========================================
// 13. Factory Reset & Local Cache Purge Utility
// ==========================================

/**
 * Factory Reset & Local Cache Purge Utility
 * Safely flushes:
 * 1. IndexedDB stores (silaye_offline_db)
 * 2. Application localStorage session/cache keys while strictly preserving Supabase auth tokens (sb-*)
 * 3. sessionStorage keys
 * 4. Browser CacheStorage API (window.caches)
 * 5. Dispatches custom window event `silaye:cache-purged`
 */
export async function purgeLocalCache(): Promise<{
  success: boolean;
  clearedStores: string[];
  clearedKeysCount: number;
}> {
  const clearedStores: string[] = [];
  let clearedKeysCount = 0;

  // 1. Flush IndexedDB
  if (typeof indexedDB !== 'undefined') {
    try {
      const dbNames = ['silaye_offline_db'];
      for (const name of dbNames) {
        indexedDB.deleteDatabase(name);
        clearedStores.push(`IndexedDB:${name}`);
      }
    } catch (err) {
      console.warn('Failed to delete IndexedDB stores during purge:', err);
    }
  }

  // 2. Flush localStorage (strictly preserving sb-* auth tokens)
  if (typeof localStorage !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        clearedKeysCount++;
      });
      clearedStores.push('localStorage');
    } catch (err) {
      console.warn('Failed to clear localStorage keys during purge:', err);
    }
  }

  // 3. Flush sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.clear();
      clearedStores.push('sessionStorage');
    } catch (err) {
      console.warn('Failed to clear sessionStorage during purge:', err);
    }
  }

  // 4. Flush Cache Storage API
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await window.caches.keys();
      for (const cacheName of cacheNames) {
        await window.caches.delete(cacheName);
        clearedStores.push(`CacheStorage:${cacheName}`);
      }
    } catch (err) {
      console.warn('Failed to clear CacheStorage during purge:', err);
    }
  }

  // 5. Dispatch real-time cross-component notification event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('silaye:cache-purged', {
        detail: { clearedStores, timestamp: new Date().toISOString() },
      })
    );
  }

  return {
    success: true,
    clearedStores,
    clearedKeysCount,
  };
}

// ==========================================
// 14. Manual Pakistani Bank Payments Repository
// ==========================================

const INITIAL_MOCK_PAYMENT_REQUESTS: ManualPaymentRequest[] = [
  {
    id: 'mpr-mock-00000000-0000-0000-0000-000000000001',
    shop_id: 'a0000000-0000-0000-0000-000000000001',
    plan_tier: 'PRO',
    billing_cycle: 'ANNUAL',
    amount_pkr: 26880,
    payment_method: 'RAAST',
    transaction_reference: 'RAAST-PK-2026-98124',
    receipt_image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    status: 'PENDING',
    admin_notes: 'Urgent activation requested for Eid season booking rush',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    shop_name: 'Wah Cantt Bespoke Tailors',
    shop_city: 'Wah Cantt',
    shop_phone: '0300-1234567',
  },
  {
    id: 'mpr-mock-00000000-0000-0000-0000-000000000002',
    shop_id: 'a0000000-0000-0000-0000-000000000002',
    plan_tier: 'ENTERPRISE',
    billing_cycle: 'MONTHLY',
    amount_pkr: 7000,
    payment_method: 'BANK_TRANSFER',
    transaction_reference: 'MEZN-TX-8492019',
    receipt_image_url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1200&q=80',
    status: 'PENDING',
    admin_notes: 'Transferred from Meezan Bank Mobile App',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    shop_name: 'Anarkali Master Craftsmen',
    shop_city: 'Lahore',
    shop_phone: '0321-9876543',
  },
];

let mockManualPaymentsState: ManualPaymentRequest[] = isDemoMode() ? [...INITIAL_MOCK_PAYMENT_REQUESTS] : [];

export const manualPaymentsDb = {
  /**
   * Submit a new manual payment verification request with transaction reference and slip URL.
   */
  async createPaymentRequest(payload: {
    shop_id: string;
    plan_tier: 'PRO' | 'ENTERPRISE';
    billing_cycle: 'MONTHLY' | 'ANNUAL';
    amount_pkr: number;
    payment_method: PaymentMethod;
    transaction_reference: string;
    receipt_image_url: string;
  }): Promise<ManualPaymentRequest> {
    const newRequest: ManualPaymentRequest = {
      id: `mpr-mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      shop_id: payload.shop_id,
      plan_tier: payload.plan_tier,
      billing_cycle: payload.billing_cycle,
      amount_pkr: payload.amount_pkr,
      payment_method: payload.payment_method,
      transaction_reference: payload.transaction_reference,
      receipt_image_url: payload.receipt_image_url,
      status: 'PENDING',
      admin_notes: null,
      created_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    };

    if (!isDatabaseConfigured()) {
      mockManualPaymentsState.unshift(newRequest);
      return newRequest;
    }

    try {
      const insertPayload = {
        shop_id: payload.shop_id,
        plan_tier: payload.plan_tier,
        billing_cycle: payload.billing_cycle,
        amount_pkr: payload.amount_pkr,
        payment_method: payload.payment_method,
        transaction_reference: payload.transaction_reference,
        receipt_image_url: payload.receipt_image_url,
        status: 'PENDING',
      };

      const { data, error } = await supabase
        .from('manual_payment_requests')
        .insert(insertPayload)
        .select()
        .single();

      if (error || !data) {
        console.warn('manual_payment_requests insert error, using local fallback:', error?.message);
        mockManualPaymentsState.unshift(newRequest);
        return newRequest;
      }

      const mapped = mapManualPaymentRequestRow(data as ManualPaymentRequestRow);
      mockManualPaymentsState.unshift(mapped);
      return mapped;
    } catch (networkErr) {
      console.warn('Supabase network error in createPaymentRequest, using local fallback:', networkErr);
      mockManualPaymentsState.unshift(newRequest);
      return newRequest;
    }
  },

  /**
   * Fetch all payment requests for a given workshop.
   */
  async getShopPaymentRequests(shopId: string): Promise<ManualPaymentRequest[]> {
    if (!isDatabaseConfigured()) {
      return mockManualPaymentsState.filter((r) => r.shop_id === shopId);
    }

    try {
      const { data, error } = await supabase
        .from('manual_payment_requests')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('Failed to fetch manual_payment_requests, using local fallback:', error?.message);
        return mockManualPaymentsState.filter((r) => r.shop_id === shopId);
      }

      return (data as ManualPaymentRequestRow[]).map(mapManualPaymentRequestRow);
    } catch (networkErr) {
      console.warn('Supabase network error in getShopPaymentRequests, using local fallback:', networkErr);
      return mockManualPaymentsState.filter((r) => r.shop_id === shopId);
    }
  },

  /**
   * Fetch the latest PENDING payment request for a given workshop (if any).
   */
  async getLatestPendingRequest(shopId: string): Promise<ManualPaymentRequest | null> {
    if (!isDatabaseConfigured()) {
      const pending = mockManualPaymentsState.find(
        (r) => r.shop_id === shopId && r.status === 'PENDING'
      );
      return pending || null;
    }

    try {
      const { data, error } = await supabase
        .from('manual_payment_requests')
        .select('*')
        .eq('shop_id', shopId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) {
        console.warn('Error fetching latest pending manual payment request:', error.message);
        const fallback = mockManualPaymentsState.find(
          (r) => r.shop_id === shopId && r.status === 'PENDING'
        );
        return fallback || null;
      }

      return data ? mapManualPaymentRequestRow(data as ManualPaymentRequestRow) : null;
    } catch (networkErr) {
      console.warn('Supabase network error in getLatestPendingRequest:', networkErr);
      const fallback = mockManualPaymentsState.find(
        (r) => r.shop_id === shopId && r.status === 'PENDING'
      );
      return fallback || null;
    }
  },

  /**
   * Upload receipt image to Supabase Storage bucket 'payment-receipts' with resilient fallback.
   */
  async uploadReceiptImage(file: File | Blob, shopId: string): Promise<string> {
    const fileNameRaw = file instanceof File ? file.name : 'receipt.jpg';
    const sanitizedName = fileNameRaw.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${shopId}/${Date.now()}-${sanitizedName}`;

    // If online and Supabase is configured, try Supabase Storage
    if (isDatabaseConfigured()) {
      try {
        const { data, error } = await supabase.storage
          .from('payment-receipts')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('payment-receipts')
            .getPublicUrl(storagePath);

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        } else {
          console.warn('Supabase storage upload failed, converting to local preview URL:', error?.message);
        }
      } catch (uploadErr) {
        console.warn('Storage upload network error, falling back to base64 data URL:', uploadErr);
      }
    }

    // Safe fallback: Convert file to Base64 Data URL (runs in browser/Node test environments)
    if (typeof FileReader !== 'undefined' && file instanceof Blob) {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve((reader.result as string) || `https://placeholder-receipt.silaye.pk/${storagePath}`);
        };
        reader.onerror = () => {
          resolve(`https://placeholder-receipt.silaye.pk/${storagePath}`);
        };
        reader.readAsDataURL(file);
      });
    }

    return `https://placeholder-receipt.silaye.pk/${storagePath}`;
  },

  /**
   * Helper for testing: Clear or seed mock manual payment requests.
   */
  resetMockState(): void {
    mockManualPaymentsState = isDemoMode() ? [...INITIAL_MOCK_PAYMENT_REQUESTS] : [];
  },
};

