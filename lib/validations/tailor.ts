/**
 * lib/validations/tailor.ts - Zod Validation Schemas for Silaye Domain
 * Includes Pakistani phone formatting, quarter-inch fractional measurement checks,
 * customer profiles, orders, and khata transactions.
 */

import { z } from 'zod';
import type {
  GarmentType,
  OrderStatus,
  PaymentStatus,
  StaffRole,
  CollarStyle,
  DamanStyle,
  PocketConfig,
  FrontPatti,
  BottomType,
  StitchType,
  CuffStyle,
  TransactionType,
  FabricSource,
} from '@/types/tailor';

// ==========================================
// 1. Phone & Number Validation Helpers
// ==========================================

/**
 * Standard Pakistani mobile regex matching:
 * - 0300-1234567, 03001234567, 0300 1234567
 * - +923001234567, +92 300 1234567, +92-300-1234567
 * - 923001234567, 00923001234567
 */
export const PAKISTANI_PHONE_REGEX = /^(?:(?:\+|00)?92|0)?[- ]?3\d{2}[- ]?\d{7}$/;

export const pakistaniPhoneSchema = z
  .string({
    required_error: 'Phone number is required',
    invalid_type_error: 'Phone number must be a string',
  })
  .trim()
  .min(10, 'Phone number is too short')
  .max(16, 'Phone number is too long')
  .regex(
    PAKISTANI_PHONE_REGEX,
    'Must be a valid Pakistani mobile number (e.g., 0300-1234567, +923001234567)'
  );

export const optionalPakistaniPhoneSchema = z
  .string()
  .trim()
  .regex(
    PAKISTANI_PHONE_REGEX,
    'Must be a valid Pakistani mobile number (e.g., 0300-1234567, +923001234567)'
  )
  .optional()
  .nullable()
  .or(z.literal(''));

/**
 * Normalizes any valid Pakistani phone number string into clean international format (923XXXXXXXXX).
 */
export function normalizePakistaniPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00923')) {
    return digits.slice(2);
  }
  if (digits.startsWith('923')) {
    return digits;
  }
  if (digits.startsWith('03')) {
    return `92${digits.slice(1)}`;
  }
  if (digits.startsWith('3') && digits.length === 10) {
    return `92${digits}`;
  }
  return digits;
}

/**
 * Normalizes any valid Pakistani phone number string into standard domestic display format (03XX-XXXXXXX).
 */
export function formatPakistaniPhone(phone: string): string {
  const clean = normalizePakistaniPhone(phone);
  if (clean.startsWith('923') && clean.length === 12) {
    const local = `0${clean.slice(2)}`;
    return `${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return phone;
}

// ==========================================
// 2. Fractional Measurement Validator
// ==========================================

/**
 * Validates that a numeric measurement is strictly in quarter-inch steps (.00, .25, .50, .75).
 */
export function isQuarterInch(val: number): boolean {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return false;
  // Scaled to integer cents to avoid IEEE 754 precision drift
  const scaled = Math.round(val * 100);
  return scaled % 25 === 0;
}

/**
 * Creates a Zod number schema enforcing quarter-inch fractional quantization and range.
 */
export function fractionalMeasurement(min = 0, max = 100, fieldName = 'Measurement') {
  return z
    .number({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a number`,
    })
    .min(min, `${fieldName} must be at least ${min} inches`)
    .max(max, `${fieldName} cannot exceed ${max} inches`)
    .refine((val) => isQuarterInch(val), {
      message: `${fieldName} must be in quarter-inch increments (.00, .25, .50, .75)`,
    });
}

export function optionalFractionalMeasurement(min = 0, max = 100, fieldName = 'Measurement') {
  return z
    .number({
      invalid_type_error: `${fieldName} must be a number`,
    })
    .min(min, `${fieldName} must be at least ${min} inches`)
    .max(max, `${fieldName} cannot exceed ${max} inches`)
    .refine((val) => isQuarterInch(val), {
      message: `${fieldName} must be in quarter-inch increments (.00, .25, .50, .75)`,
    })
    .optional();
}

// ==========================================
// 3. Domain Enums Schemas
// ==========================================

export const garmentTypeSchema = z.enum([
  'MEN_SHALWAR_KAMEEZ',
  'MEN_KURTA',
  'WAISTCOAT',
  'PRINCE_SUIT',
  'TROUSER_SHIRT',
  'WOMEN_SUIT',
] as const satisfies readonly [GarmentType, ...GarmentType[]]);

export const orderStatusSchema = z.enum([
  'BOOKED',
  'FABRIC_RECEIVED',
  'IN_CUTTING',
  'IN_STITCHING',
  'KAJ_BUTTON',
  'PRESSING',
  'READY_FOR_TRIAL',
  'READY_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly [OrderStatus, ...OrderStatus[]]);

export const paymentStatusSchema = z.enum([
  'UNPAID',
  'PARTIALLY_PAID',
  'FULLY_PAID',
] as const satisfies readonly [PaymentStatus, ...PaymentStatus[]]);

export const staffRoleSchema = z.enum([
  'OWNER',
  'MANAGER',
  'CUTTING_MASTER',
  'STITCHER',
  'PRESSMAN',
  'COUNTER_CLERK',
] as const satisfies readonly [StaffRole, ...StaffRole[]]);

export const collarStyleSchema = z.enum([
  'FULL_BAN',
  'HALF_BAN',
  'SHERWANI_CUT',
  'SHIRT_COLLAR',
  'GOL_GALA',
] as const satisfies readonly [CollarStyle, ...CollarStyle[]]);

export const damanStyleSchema = z.enum([
  'GOL_DAMAN',
  'CHORAS_DAMAN',
] as const satisfies readonly [DamanStyle, ...DamanStyle[]]);

export const pocketConfigSchema = z.enum([
  'FRONT_ONLY',
  'FRONT_ONE_SIDE',
  'FRONT_TWO_SIDES',
  'TWO_SIDES_NO_FRONT',
  'SECRET_ZIPPER_POCKET',
] as const satisfies readonly [PocketConfig, ...PocketConfig[]]);

export const frontPattiSchema = z.enum([
  'GUM_PATTI',
  'CHORI_PATTI',
  'BAREEK_PATTI',
  'DOUBLE_STITCH',
] as const satisfies readonly [FrontPatti, ...FrontPatti[]]);

export const bottomTypeSchema = z.enum([
  'SHALWAR_TRADITIONAL',
  'SHALWAR_POCKET',
  'TROUSER_PANT_CUT',
  'CHURIDAR',
] as const satisfies readonly [BottomType, ...BottomType[]]);

export const stitchTypeSchema = z.enum([
  'SINGLE_KANDHA',
  'DOUBLE_SILAI',
  'OVERLOCK_FINISH',
  'HAND_TAILORED_TURPAI',
] as const satisfies readonly [StitchType, ...StitchType[]]);

export const cuffStyleSchema = z.enum([
  'GOL_CUFF',
  'CHORAS_CUFF',
  'OPEN_CUFF',
] as const satisfies readonly [CuffStyle, ...CuffStyle[]]);

export const transactionTypeSchema = z.enum([
  'ORDER_ADVANCE',
  'ORDER_FINAL_PAYMENT',
  'MANUAL_CREDIT',
  'MANUAL_DEBIT',
  'DISCOUNT_ADJUSTMENT',
] as const satisfies readonly [TransactionType, ...TransactionType[]]);

export const fabricSourceSchema = z.enum([
  'CUSTOMER',
  'SHOP',
] as const satisfies readonly [FabricSource, ...FabricSource[]]);

// ==========================================
// 4. Measurements & Style Schemas
// ==========================================

export const shalwarKameezMeasurementsSchema = z.object({
  // Kameez / Kurta mandatory dimensions
  kameez_length: fractionalMeasurement(20, 60, 'Kameez Length (لمبائی)'),
  chest: fractionalMeasurement(20, 70, 'Chest (چھاتی)'),
  waist: fractionalMeasurement(20, 70, 'Waist (کمر)'),
  hips: optionalFractionalMeasurement(20, 70, 'Hips / Seat (ہپ / گھیرا)'),
  shoulder_teera: fractionalMeasurement(10, 30, 'Shoulder (تیرا)'),
  sleeve_length: fractionalMeasurement(10, 38, 'Sleeve Length (بازو)'),
  armhole_moodha: optionalFractionalMeasurement(5, 25, 'Armhole (موڈھا)'),
  neck_gala: fractionalMeasurement(8, 25, 'Neck / Collar (گلا / بین)'),
  daman_width: fractionalMeasurement(12, 45, 'Daman Width (دامن / گھیرا)'),
  bicep_dola: optionalFractionalMeasurement(4, 25, 'Bicep (ڈولا)'),
  cuff_width: optionalFractionalMeasurement(1, 10, 'Cuff Width (کف چوڑائی)'),
  cuff_length: optionalFractionalMeasurement(5, 20, 'Cuff Circumference (کف گھیرا)'),

  // Shalwar / Trouser dimensions
  shalwar_length: fractionalMeasurement(20, 60, 'Shalwar Length (شلوار لمبائی)'),
  paincha: fractionalMeasurement(4, 20, 'Paincha (پائینچہ)'),
  aasan: fractionalMeasurement(8, 35, 'Aasan (آسن)'),
  shalwar_ghera: optionalFractionalMeasurement(10, 40, 'Shalwar Ghera (شلوار گھیرا)'),
  inseam: optionalFractionalMeasurement(15, 45, 'Inseam / Fly (نالی)'),
});

export const stylePreferencesSchema = z.object({
  collar_style: collarStyleSchema.default('FULL_BAN'),
  daman_style: damanStyleSchema.default('CHORAS_DAMAN'),
  pocket_config: pocketConfigSchema.default('FRONT_ONE_SIDE'),
  front_patti: frontPattiSchema.default('GUM_PATTI'),
  bottom_type: bottomTypeSchema.default('SHALWAR_TRADITIONAL'),
  stitch_type: stitchTypeSchema.default('DOUBLE_SILAI'),
  cuff_style: cuffStyleSchema.optional(),
  notes: z.string().max(500, 'Style notes cannot exceed 500 characters').optional(),
});

// ==========================================
// 5. Customer Schemas
// ==========================================

export const customerCreateSchema = z.object({
  shop_id: z.string().uuid('Invalid Shop UUID'),
  full_name: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(255, 'Customer name cannot exceed 255 characters'),
  phone: pakistaniPhoneSchema,
  alternate_phone: optionalPakistaniPhoneSchema,
  address: z.string().max(500).optional().nullable().or(z.literal('')),
  city: z.string().max(100).optional().nullable().or(z.literal('')),
  notes: z.string().max(1000).optional().nullable().or(z.literal('')),
});

export const customerUpdateSchema = customerCreateSchema.partial().extend({
  id: z.string().uuid('Invalid Customer UUID'),
});

// ==========================================
// 6. Measurement Profile Schemas
// ==========================================

export const measurementProfileCreateSchema = z.object({
  shop_id: z.string().uuid('Invalid Shop UUID'),
  customer_id: z.string().uuid('Invalid Customer UUID'),
  profile_name: z.string().min(1, 'Profile name is required').max(100).default('Standard Fit'),
  garment_type: garmentTypeSchema.default('MEN_SHALWAR_KAMEEZ'),
  measurements: shalwarKameezMeasurementsSchema,
  style_preferences: stylePreferencesSchema,
  is_default: z.boolean().default(true),
});

// ==========================================
// 7. Order Schemas & Calculations
// ==========================================

export const orderCreateSchema = z
  .object({
    shop_id: z.string().uuid('Invalid Shop UUID'),
    customer_id: z.string().uuid('Invalid Customer UUID'),
    measurement_profile_id: z.string().uuid().optional().nullable(),
    garment_type: garmentTypeSchema.default('MEN_SHALWAR_KAMEEZ'),
    quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1').default(1),

    // Deadlines
    trial_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Trial date must be in YYYY-MM-DD format')
      .optional()
      .nullable(),
    delivery_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Delivery date must be in YYYY-MM-DD format'),

    // Fabric details
    fabric_provided_by: fabricSourceSchema.default('CUSTOMER'),
    fabric_color: z.string().max(100).optional().nullable(),
    fabric_brand: z.string().max(100).optional().nullable(),
    fabric_pieces_count: z.number().int().min(1).default(1),
    fabric_notes: z.string().max(500).optional().nullable(),

    // Financials
    stitching_rate: z.number().min(0, 'Stitching rate cannot be negative'),
    fabric_charges: z.number().min(0, 'Fabric charges cannot be negative').default(0),
    addons_charges: z.number().min(0, 'Addon charges cannot be negative').default(0),
    discount_amount: z.number().min(0, 'Discount cannot be negative').default(0),
    advance_paid: z.number().min(0, 'Advance paid cannot be negative').default(0),

    // Workshop Staff
    assigned_cutter_id: z.string().uuid().optional().nullable(),
    assigned_stitcher_id: z.string().uuid().optional().nullable(),

    // Snapshots
    snapshot_measurements: shalwarKameezMeasurementsSchema,
    snapshot_styles: stylePreferencesSchema,
  })
  .refine(
    (data) => {
      const gross = (data.stitching_rate * data.quantity) + data.fabric_charges + data.addons_charges;
      return data.discount_amount <= gross;
    },
    {
      message: 'Discount amount cannot exceed total gross order cost',
      path: ['discount_amount'],
    }
  )
  .refine(
    (data) => {
      const gross = (data.stitching_rate * data.quantity) + data.fabric_charges + data.addons_charges;
      const net = gross - data.discount_amount;
      return data.advance_paid <= net;
    },
    {
      message: 'Advance paid cannot exceed net order total amount',
      path: ['advance_paid'],
    }
  );

/**
 * Computes derived financials for an order.
 */
export function calculateOrderFinancials(params: {
  stitching_rate: number;
  quantity?: number;
  fabric_charges?: number;
  addons_charges?: number;
  discount_amount?: number;
  advance_paid?: number;
}): {
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  payment_status: PaymentStatus;
} {
  const qty = params.quantity ?? 1;
  const fabric = params.fabric_charges ?? 0;
  const addons = params.addons_charges ?? 0;
  const discount = params.discount_amount ?? 0;
  const advance = params.advance_paid ?? 0;

  const total_amount = Math.max(0, (params.stitching_rate * qty) + fabric + addons - discount);
  const balance_due = Math.max(0, total_amount - advance);

  let payment_status: PaymentStatus = 'UNPAID';
  if (balance_due === 0 && total_amount > 0) {
    payment_status = 'FULLY_PAID';
  } else if (advance > 0) {
    payment_status = 'PARTIALLY_PAID';
  }

  return {
    total_amount,
    advance_paid: advance,
    balance_due,
    payment_status,
  };
}

// ==========================================
// 8. Khata Transaction Schemas
// ==========================================

export const khataTransactionCreateSchema = z.object({
  shop_id: z.string().uuid('Invalid Shop UUID'),
  customer_id: z.string().uuid('Invalid Customer UUID'),
  order_id: z.string().uuid('Invalid Order UUID').optional().nullable(),
  transaction_type: transactionTypeSchema,
  amount: z.number().positive('Transaction amount must be greater than zero'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
  created_by: z.string().uuid('Invalid Staff UUID').optional().nullable(),
});

// ==========================================
// 9. Order Status Transition Schema
// ==========================================

export const orderStatusUpdateSchema = z.object({
  order_id: z.string().uuid('Invalid Order UUID'),
  previous_status: orderStatusSchema.optional().nullable(),
  new_status: orderStatusSchema,
  changed_by: z.string().uuid('Invalid Staff UUID').optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
