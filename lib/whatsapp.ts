/**
 * lib/whatsapp.ts - 1-Click WhatsApp Deep-Link Engine & Message Template Generators
 * Zero-cost, direct wa.me messaging protocol for booking receipts, pickup alerts, and Khata reminders.
 */

import type { GarmentOrder, Customer, Shop, GarmentType } from '@/types/tailor';

// ============================================================================
// 1. Pakistani Phone Number Sanitization & Formatting
// ============================================================================

/**
 * Sanitizes any Pakistani phone string into international WhatsApp format (923XXXXXXXXX).
 * Handles all common formats:
 * - 03001234567   -> 923001234567
 * - +923001234567 -> 923001234567
 * - 923001234567  -> 923001234567
 * - 3001234567    -> 923001234567
 * - 0300-1234567  -> 923001234567
 * - 00923001234567 -> 923001234567
 */
export function sanitizePakistaniPhone(rawPhone: string): string {
  if (!rawPhone) return '';

  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  // Handle leading 0092... (e.g. 00923001234567 -> 923001234567)
  if (digits.startsWith('0092')) {
    digits = digits.slice(2);
  }

  // Handle 03XXXXXXXXX (11 digits) -> 923XXXXXXXXX
  if (digits.startsWith('03') && digits.length === 11) {
    return `92${digits.slice(1)}`;
  }

  // Handle 923XXXXXXXXX (12 digits)
  if (digits.startsWith('923') && digits.length === 12) {
    return digits;
  }

  // Handle 3XXXXXXXXX (10 digits without leading 0) -> 923XXXXXXXXX
  if (digits.startsWith('3') && digits.length === 10) {
    return `92${digits}`;
  }

  return digits;
}

/**
 * Validates whether a given phone string conforms to a valid Pakistani mobile number.
 */
export function isValidPakistaniPhone(rawPhone: string): boolean {
  const sanitized = sanitizePakistaniPhone(rawPhone);
  return /^923\d{9}$/.test(sanitized);
}

/**
 * Formats a sanitized or raw Pakistani phone number into human-readable display (+92 3XX XXXXXXX).
 */
export function formatPakistaniPhoneDisplay(rawPhone: string): string {
  const sanitized = sanitizePakistaniPhone(rawPhone);
  if (/^923\d{9}$/.test(sanitized)) {
    return `+92 ${sanitized.slice(2, 5)} ${sanitized.slice(5)}`;
  }
  return rawPhone;
}

// ============================================================================
// 2. Garment Urdu Translation Dictionary
// ============================================================================

export const GARMENT_TYPE_URDU_MAP: Record<GarmentType, string> = {
  MEN_SHALWAR_KAMEEZ: 'مردانہ شلوار قمیض',
  MEN_KURTA: 'مردانہ کرتہ',
  WAISTCOAT: 'واسکٹ',
  PRINCE_SUIT: 'پرنس سوٹ',
  TROUSER_SHIRT: 'پینٹ شرٹ',
  WOMEN_SUIT: 'زنانہ سوٹ',
};

// ============================================================================
// 3. Payload Definitions
// ============================================================================

export interface WhatsAppReceiptPayload {
  shopName: string;
  shopPhone: string;
  shopAddress?: string;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  garmentTypeUrdu: string;
  quantity: number;
  bookingDate?: string;
  deliveryDate: string; // e.g. "28 Aug 2026"
  trialDate?: string;
  pocketStylesUrdu?: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  trackingUrl: string;
}

export interface WhatsAppKhataPayload {
  customerName: string;
  customerPhone: string;
  shopName: string;
  shopPhone: string;
  totalPendingBalance: number;
  shopAddress?: string;
}

// ============================================================================
// 4. Dynamic Message Templates (Bilingual Urdu/English)
// ============================================================================

/**
 * Template 1: Order Booking & Advance Deposit Receipt
 */
export function generateBookingReceiptMessage(data: WhatsAppReceiptPayload): string {
  const lines: (string | null | undefined)[] = [
    `السلام علیکم *${data.customerName}* صاحب،`,
    `آپ کا آرڈر *${data.shopName}* پر کامیابی سے بک ہو چکا ہے۔`,
    ``,
    `📋 *آرڈر کی تفصیلات:*`,
    `▫️ *آرڈر نمبر:* #${data.orderNumber}`,
    `▫️ *آئٹم:* ${data.garmentTypeUrdu} (${data.quantity} عدد)`,
    data.pocketStylesUrdu ? `▫️ *جیبیں:* ${data.pocketStylesUrdu}` : null,
    data.trialDate ? `▫️ *ٹرائل تاریخ:* ${data.trialDate}` : null,
    `▫️ *ڈیلیوری کی تاریخ:* ${data.deliveryDate}`,
    ``,
    `💰 *حساب کتاب:*`,
    `▫️ کل رقم: *Rs. ${data.totalAmount.toLocaleString()}*`,
    `▫️ ایڈوانس وصول: *Rs. ${data.advancePaid.toLocaleString()}*`,
    `▫️ *بقایا رقم:* *Rs. ${data.balanceDue.toLocaleString()}*`,
    ``,
    `🔍 *لائیو آرڈر سٹیٹس چیک کریں:*`,
    `${data.trackingUrl}`,
    ``,
    `شکریہ!`,
    `*${data.shopName}*`,
    `📞 رابطہ: ${data.shopPhone}`,
  ];

  return lines.filter((line) => line !== null && line !== undefined).join('\n');
}

/**
 * Template 2: Order Ready for Pickup / Trial Alert
 */
export function generateOrderReadyMessage(data: WhatsAppReceiptPayload): string {
  const lines: (string | null | undefined)[] = [
    `السلام علیکم *${data.customerName}* صاحب،`,
    `خوشخبری! آپ کا آرڈر *${data.shopName}* پر تیار ہو چکا ہے۔`,
    ``,
    `📋 *آرڈر نمبر:* #${data.orderNumber}`,
    `👔 *آئٹم:* ${data.garmentTypeUrdu}`,
    data.balanceDue > 0
      ? `⚠️ *بقایا واجب الادا رقم:* *Rs. ${data.balanceDue.toLocaleString()}*`
      : `✅ *واجب الادا رقم:* *مکمل ادا شدہ (Rs. 0)*`,
    ``,
    data.shopAddress ? `📍 *شاپ کا پتہ:*\n${data.shopAddress}\n` : null,
    `براہ کرم تشریف لا کر اپنا آرڈر وصول فرمائیں۔`,
    ``,
    `شکریہ!`,
    `*${data.shopName}*`,
    `📞 رابطہ: ${data.shopPhone}`,
  ];

  return lines.filter((line) => line !== null && line !== undefined).join('\n');
}

/**
 * Template 3: Khata / Udhaar Pending Balance Reminder
 */
export function generateKhataReminderMessage(
  customerNameOrPayload: string | WhatsAppKhataPayload,
  shopName?: string,
  totalPendingBalance?: number,
  shopPhone?: string
): string {
  let customerName = '';
  let shop = '';
  let balance = 0;
  let phone = '';

  if (typeof customerNameOrPayload === 'object') {
    customerName = customerNameOrPayload.customerName;
    shop = customerNameOrPayload.shopName;
    balance = customerNameOrPayload.totalPendingBalance;
    phone = customerNameOrPayload.shopPhone;
  } else {
    customerName = customerNameOrPayload;
    shop = shopName || 'Silaye Tailors';
    balance = totalPendingBalance || 0;
    phone = shopPhone || '';
  }

  const lines: string[] = [
    `السلام علیکم *${customerName}* صاحب،`,
    `امید ہے آپ خیریت سے ہوں گے۔ یہ پیغام *${shop}* کی طرف سے بقایا کھاتہ بیلنس کی یاد دہانی کے لیے ہے۔`,
    ``,
    `💰 *کل واجب الادا رقم:* *Rs. ${balance.toLocaleString()}*`,
    ``,
    `براہِ کرم جلد از جلد بقایا رقم ادا کر کے کھاتہ کلیئر فرمائیں۔`,
    `کسی بھی سوال کی صورت میں ہم سے رابطہ کریں:`,
    phone ? `📞 ${phone}` : '',
    ``,
    `شکریہ!`,
    `*${shop}*`,
  ];

  return lines.filter(Boolean).join('\n');
}

// ============================================================================
// 5. Payload Transformer Helpers
// ============================================================================

/**
 * Converts domain entities (GarmentOrder, Customer, Shop) into a normalized WhatsAppReceiptPayload.
 */
export function createReceiptPayload(
  order: GarmentOrder,
  customer: Customer,
  shop?: Shop | null
): WhatsAppReceiptPayload {
  const shopName = shop?.name || 'Silaye Master Tailors & Fabrics';
  const shopPhone = shop?.owner_phone || '0300-5551234';
  const shopAddress = shop?.address || 'Shop #14, Main Bazaar, Wah Cantt';

  // Format delivery date
  let formattedDeliveryDate = order.delivery_date;
  try {
    const d = new Date(order.delivery_date);
    if (!isNaN(d.getTime())) {
      formattedDeliveryDate = d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch {
    formattedDeliveryDate = order.delivery_date;
  }

  // Format trial date if present
  let formattedTrialDate: string | undefined;
  if (order.trial_date) {
    try {
      const td = new Date(order.trial_date);
      if (!isNaN(td.getTime())) {
        formattedTrialDate = td.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch {
      formattedTrialDate = order.trial_date;
    }
  }

  const garmentUrdu = GARMENT_TYPE_URDU_MAP[order.garment_type] || 'مردانہ سوٹ';
  const trackingUrl = `https://silaye.pk/track/${order.order_number}`;

  let pocketStylesUrdu: string | undefined;
  if (order.snapshot_styles?.pockets && order.snapshot_styles.pockets.length > 0) {
    const POCKET_MAP: Record<string, string> = {
      FRONT_CHEST: 'سامنے جیب',
      LEFT_SIDE: 'بائیں جیب',
      RIGHT_SIDE: 'دائیں جیب',
      SECRET_ZIP: 'موبائل زپ',
      FRONT_ONLY: 'صرف سامنے جیب',
      FRONT_ONE_SIDE: 'ایک طرف جیب',
      FRONT_TWO_SIDES: 'دونوں طرف جیب',
      TWO_SIDES_NO_FRONT: 'سائیڈ جیبیں',
      SECRET_ZIPPER_POCKET: 'موبائل زپ',
    };
    pocketStylesUrdu = order.snapshot_styles.pockets.map((p) => POCKET_MAP[p] || p).join('، ');
  } else if (order.snapshot_styles?.pocket_config) {
    const POCKET_MAP: Record<string, string> = {
      FRONT_ONLY: 'صرف سامنے جیب',
      FRONT_ONE_SIDE: 'ایک طرف جیب',
      FRONT_TWO_SIDES: 'دونوں طرف جیب',
      TWO_SIDES_NO_FRONT: 'سائیڈ جیبیں',
      SECRET_ZIPPER_POCKET: 'موبائل زپ',
    };
    pocketStylesUrdu = POCKET_MAP[order.snapshot_styles.pocket_config] || order.snapshot_styles.pocket_config;
  }

  return {
    shopName,
    shopPhone,
    shopAddress,
    customerName: customer.full_name,
    customerPhone: customer.phone,
    orderNumber: order.order_number,
    garmentTypeUrdu: garmentUrdu,
    quantity: order.quantity || 1,
    bookingDate: order.booking_date,
    deliveryDate: formattedDeliveryDate,
    trialDate: formattedTrialDate,
    pocketStylesUrdu,
    totalAmount: order.total_amount,
    advancePaid: order.advance_paid,
    balanceDue: order.balance_due,
    trackingUrl,
  };
}

/**
 * Converts Customer & Shop entities into WhatsAppKhataPayload.
 */
export function createKhataPayload(
  customer: Customer,
  shop?: Shop | null
): WhatsAppKhataPayload {
  return {
    customerName: customer.full_name,
    customerPhone: customer.phone,
    shopName: shop?.name || 'Silaye Master Tailors & Fabrics',
    shopPhone: shop?.owner_phone || '0300-5551234',
    totalPendingBalance: Math.max(0, customer.current_khata_balance),
    shopAddress: shop?.address || 'Shop #14, Main Bazaar, Wah Cantt',
  };
}

// ============================================================================
// 6. Deep-Link Builder & Cross-Platform Dispatch Controller
// ============================================================================

/**
 * Assembles the executable WhatsApp deep-link URL (wa.me) with URI-encoded text.
 */
export function buildWhatsAppLink(rawPhone: string, rawMessage: string): string {
  const sanitizedPhone = sanitizePakistaniPhone(rawPhone);
  const encodedText = encodeURIComponent(rawMessage);
  return `https://wa.me/${sanitizedPhone}?text=${encodedText}`;
}

/**
 * Dispatches the WhatsApp deep-link safely across Web, Desktop, and Mobile environments.
 * - Desktop Electron: invokes window.electronAPI.openExternal(url)
 * - Mobile Capacitor: dynamically invokes @capacitor/app-launcher AppLauncher.openUrl({ url })
 * - Web Browser: opens window.open(url, '_blank', 'noopener,noreferrer')
 */
export async function openWhatsAppLink(url: string): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Check if running inside Electron Desktop Runtime
  if (window.electronAPI?.openExternal) {
    await window.electronAPI.openExternal(url);
    return;
  }

  // 2. Check if running inside Capacitor Mobile Runtime
  if (window.Capacitor?.isNativePlatform()) {
    try {
      const { AppLauncher } = await import('@capacitor/app-launcher');
      const canOpen = await AppLauncher.canOpenUrl({ url });
      if (canOpen?.value) {
        await AppLauncher.openUrl({ url });
        return;
      }
    } catch {
      // Fallback to standard window.open if plugin is unavailable or fails
    }
  }

  // 3. Fallback for Standard Web Browser
  window.open(url, '_blank', 'noopener,noreferrer');
}

