/**
 * types/tailor.ts - Domain Type Definitions & Database Models
 * Strictly typed interfaces matching specs.md and PostgreSQL schema.
 */

// ==========================================
// 1. Domain Enums & Union Types
// ==========================================

export type GarmentType =
  | 'MEN_SHALWAR_KAMEEZ'
  | 'MEN_KURTA'
  | 'WAISTCOAT'
  | 'PRINCE_SUIT'
  | 'TROUSER_SHIRT'
  | 'WOMEN_SUIT';

export type OrderStatus =
  | 'BOOKED'
  | 'FABRIC_RECEIVED'
  | 'IN_CUTTING'
  | 'IN_STITCHING'
  | 'KAJ_BUTTON'
  | 'PRESSING'
  | 'READY_FOR_TRIAL'
  | 'READY_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'FULLY_PAID';

export type StaffRole =
  | 'OWNER'
  | 'MANAGER'
  | 'CUTTING_MASTER'
  | 'STITCHER'
  | 'PRESSMAN'
  | 'COUNTER_CLERK';

export type ShopMemberRole =
  | 'OWNER'
  | 'STAFF'
  | 'MANAGER'
  | 'CUTTING_MASTER'
  | 'STITCHER'
  | 'PRESSMAN'
  | 'COUNTER_CLERK';

export type CollarStyle =
  | 'FULL_BAN'
  | 'HALF_BAN'
  | 'SHERWANI_CUT'
  | 'SHIRT_COLLAR'
  | 'GOL_GALA';

export type DamanStyle =
  | 'GOL_DAMAN'
  | 'CHORAS_DAMAN';

export type PocketConfig =
  | 'FRONT_ONLY'
  | 'FRONT_ONE_SIDE'
  | 'FRONT_TWO_SIDES'
  | 'TWO_SIDES_NO_FRONT'
  | 'SECRET_ZIPPER_POCKET';

export type PocketOption =
  | 'FRONT_CHEST'
  | 'LEFT_SIDE'
  | 'RIGHT_SIDE'
  | 'SECRET_ZIP';

export type FrontPatti =
  | 'GUM_PATTI'
  | 'CHORI_PATTI'
  | 'BAREEK_PATTI'
  | 'DOUBLE_STITCH';

export type BottomType =
  | 'SHALWAR_TRADITIONAL'
  | 'SHALWAR_POCKET'
  | 'TROUSER_PANT_CUT'
  | 'CHURIDAR';

export type StitchType =
  | 'SINGLE_KANDHA'
  | 'DOUBLE_SILAI'
  | 'OVERLOCK_FINISH'
  | 'HAND_TAILORED_TURPAI';

export type CuffStyle =
  | 'GOL_CUFF'
  | 'CHORAS_CUFF'
  | 'OPEN_CUFF';

export type TransactionType =
  | 'ORDER_ADVANCE'
  | 'ORDER_FINAL_PAYMENT'
  | 'MANUAL_CREDIT'
  | 'MANUAL_DEBIT'
  | 'DISCOUNT_ADJUSTMENT';

export type FabricSource = 'CUSTOMER' | 'SHOP';

// ==========================================
// 2. Body Measurements & Style Preferences
// ==========================================

export interface ShalwarKameezMeasurements {
  // Kameez / Kurta dimensions (in fractional inches)
  kameez_length: number;
  chest: number;
  waist: number;
  hips?: number;
  shoulder_teera: number;
  sleeve_length: number;
  armhole_moodha?: number;
  neck_gala: number;
  daman_width: number;
  bicep_dola?: number;
  cuff_width?: number;
  cuff_length?: number;

  // Shalwar / Trouser dimensions (in fractional inches)
  shalwar_length: number;
  paincha: number;
  aasan: number;
  shalwar_ghera?: number;
  inseam?: number;
}

export interface StylePreferences {
  collar_style: CollarStyle;
  daman_style: DamanStyle;
  pocket_config?: PocketConfig;
  pockets?: string[];
  front_patti: FrontPatti;
  bottom_type: BottomType;
  stitch_type: StitchType;
  cuff_style?: CuffStyle;
  notes?: string;
}

// ==========================================
// 3. Database Schema Models (PostgreSQL Entities)
// ==========================================

/**
 * Tenant / Workshop Shop
 */
export interface Shop {
  id: string; // UUID
  name: string;
  phone?: string | null;
  secondary_phone?: string | null;
  address?: string | null;
  city?: string;
  ntn_number?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  slug?: string;
  owner_name?: string;
  owner_phone?: string;
  country?: string;
  currency?: string;
  is_active?: boolean;
  created_at?: string; // ISO 8601 timestamp
  updated_at?: string; // ISO 8601 timestamp
}

/**
 * Shop Member & Role Assignment
 */
export interface ShopMember {
  id: string; // UUID
  shop_id: string; // UUID
  user_id: string; // UUID
  role: ShopMemberRole;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Staff & Workshop Operators
 */
export interface Staff {
  id: string; // UUID
  shop_id: string; // UUID
  name: string;
  phone: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string; // ISO 8601 timestamp
}

/**
 * Customer Profile
 */
export interface Customer {
  id: string; // UUID
  shop_id: string; // UUID
  full_name: string;
  phone: string;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  total_orders_count: number;
  total_spent: number;
  /**
   * Positive = Customer owes shop (Udhaar / Receivable)
   * Negative = Advance credit deposit
   * Zero = Balanced
   */
  current_khata_balance: number;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Permanent Body Measurement Profile
 */
export interface MeasurementProfile {
  id: string; // UUID
  shop_id: string; // UUID
  customer_id: string; // UUID
  profile_name: string;
  garment_type: GarmentType;
  measurements: ShalwarKameezMeasurements;
  style_preferences: StylePreferences;
  is_default: boolean;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Garment Order & Production Ticket
 */
export interface GarmentOrder {
  id: string; // UUID
  order_number: string; // e.g., DP-2026-0801
  shop_id: string; // UUID
  customer_id: string; // UUID
  measurement_profile_id: string | null;
  status: OrderStatus;
  garment_type: GarmentType;
  quantity: number;

  // Schedule & Deadlines
  booking_date: string; // ISO 8601 timestamp
  trial_date: string | null; // YYYY-MM-DD
  delivery_date: string; // YYYY-MM-DD
  actual_delivery_date: string | null; // ISO 8601 timestamp

  // Fabric Details
  fabric_provided_by: FabricSource;
  fabric_color: string | null;
  fabric_brand: string | null;
  fabric_pieces_count: number;
  fabric_notes: string | null;

  // Pricing & Financials (PKR)
  stitching_rate: number;
  fabric_charges: number;
  addons_charges: number;
  discount_amount: number;
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  payment_status: PaymentStatus;

  // Workshop Assignments
  assigned_cutter_id: string | null;
  assigned_stitcher_id: string | null;

  // Historical Snapshot at Booking
  snapshot_measurements: ShalwarKameezMeasurements;
  snapshot_styles: StylePreferences;

  barcode_token: string;
  public_tracking_key: string; // UUID
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp

  // Relational references (optional joins)
  customer?: Customer;
  assigned_cutter?: Staff | null;
  assigned_stitcher?: Staff | null;
  status_logs?: OrderStatusLog[];
}

/**
 * Khata Ledger & Financial Transaction
 */
export interface KhataTransaction {
  id: string; // UUID
  shop_id: string; // UUID
  customer_id: string; // UUID
  order_id: string | null; // UUID
  transaction_type: TransactionType;
  amount: number;
  balance_after: number;
  notes: string | null;
  created_by: string | null; // Staff UUID
  created_at: string; // ISO 8601 timestamp

  // Relational references (optional joins)
  customer?: Customer;
  order?: GarmentOrder | null;
  creator?: Staff | null;
}

/**
 * Production Stage Audit Trail
 */
export interface OrderStatusLog {
  id: string; // UUID
  order_id: string; // UUID
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string | null; // Staff UUID
  notes: string | null;
  created_at: string; // ISO 8601 timestamp

  // Relational references (optional joins)
  changed_by_staff?: Staff | null;
}

/**
 * Offline Sync Queue Item
 */
export interface SyncQueueItem {
  id: string; // UUID
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: Record<string, unknown>;
  created_at: number; // Epoch timestamp
  retry_count: number;
  status: 'PENDING' | 'PROCESSING' | 'FAILED';
  error_message?: string;
}
