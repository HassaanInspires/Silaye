/**
 * lib/escpos.ts - ESC/POS Thermal Printing Byte Builder & Slip Layout Engine
 * Supports 58mm (32 chars/line) fabric staple tags and 80mm (48 chars/line) customer invoices.
 * Produces standard raw ESC/POS byte sequences and formatted text strings.
 */

import type {
  GarmentOrder,
  Customer,
  Shop,
  ShalwarKameezMeasurements,
} from '@/types/tailor';

// ============================================================================
// 1. ESC/POS Byte Command Constants
// ============================================================================

export const ESC_POS_COMMANDS = {
  // Initialization & Hardware Control
  INIT: new Uint8Array([0x1b, 0x40]), // ESC @ (Reset to printer defaults)
  CUT_FULL: new Uint8Array([0x1d, 0x56, 0x00]), // GS V 0 (Full Cut)
  CUT_PARTIAL: new Uint8Array([0x1d, 0x56, 0x01]), // GS V 1 (Partial Cut)
  DRAWER_KICK: new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]), // Cash drawer pulse

  // Text Alignment
  ALIGN_LEFT: new Uint8Array([0x1b, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: new Uint8Array([0x1b, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: new Uint8Array([0x1b, 0x61, 0x02]), // ESC a 2

  // Text Styling & Sizing
  BOLD_ON: new Uint8Array([0x1b, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: new Uint8Array([0x1b, 0x45, 0x00]), // ESC E 0
  DOUBLE_HEIGHT: new Uint8Array([0x1d, 0x21, 0x01]), // GS ! 1
  DOUBLE_WIDTH: new Uint8Array([0x1d, 0x21, 0x10]), // GS ! 16
  DOUBLE_SIZE: new Uint8Array([0x1d, 0x21, 0x11]), // GS ! 17 (Double width + height)
  RESET_SIZE: new Uint8Array([0x1d, 0x21, 0x00]), // GS ! 0
  UNDERLINE_ON: new Uint8Array([0x1b, 0x2d, 0x01]), // ESC - 1
  UNDERLINE_OFF: new Uint8Array([0x1b, 0x2d, 0x00]), // ESC - 0

  // Line Feed & Spacing
  FEED_LINE: new Uint8Array([0x0a]), // LF
  FEED_LINES: (n: number): Uint8Array => new Uint8Array([0x1b, 0x64, Math.max(1, Math.min(255, n))]), // ESC d n

  // Barcode Commands (Code 128 - GS k 73 / Function B)
  BARCODE_HEIGHT: (h: number): Uint8Array => new Uint8Array([0x1d, 0x68, Math.max(1, Math.min(255, h))]), // GS h n (1-255 dots)
  BARCODE_WIDTH: (w: number): Uint8Array => new Uint8Array([0x1d, 0x77, Math.max(2, Math.min(6, w))]), // GS w n (2-6 module width)
  BARCODE_HRI_BELOW: new Uint8Array([0x1d, 0x48, 0x02]), // GS H 2 (HRI characters below barcode)
  BARCODE_HRI_NONE: new Uint8Array([0x1d, 0x48, 0x00]), // GS H 0 (No HRI text)
};

// ============================================================================
// 2. Data Interface for Thermal Slips
// ============================================================================

export interface EscPosSlipData {
  shopName: string;
  shopAddress?: string | null;
  shopPhone?: string | null;
  orderNumber: string;
  bookingDate?: string;
  bookingTime?: string;
  customerName: string;
  customerPhone: string;
  garmentType: string;
  garmentTypeUr?: string;
  quantity?: number;
  trialDate?: string | null;
  deliveryDate: string;
  isUrgent?: boolean;
  measurements?: Partial<ShalwarKameezMeasurements>;
  cutStyles?: string[];
  pocketConfig?: string;
  fabricColor?: string | null;
  fabricBrand?: string | null;
  fabricSource?: string | null;
  // Financials
  stitchingRate?: number;
  fabricCharges?: number;
  addonsCharges?: number;
  discountAmount?: number;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentStatus?: string;
  publicTrackingUrl?: string;
  notes?: string | null;
}

// ============================================================================
// 3. String & Formatting Helper Utilities
// ============================================================================

/**
 * Centers text within a given column width.
 */
export function centerText(text: string, width: number): string {
  const clean = text.trim();
  if (clean.length >= width) return clean.slice(0, width);
  const leftPad = Math.floor((width - clean.length) / 2);
  const rightPad = width - clean.length - leftPad;
  return ' '.repeat(leftPad) + clean + ' '.repeat(rightPad);
}

/**
 * Generates a two-column line with left and right aligned text.
 */
export function padBetween(left: string, right: string, width: number): string {
  const l = left.trim();
  const r = right.trim();
  const totalLen = l.length + r.length;
  if (totalLen >= width) {
    // Truncate left if necessary to fit right
    const availableLeft = Math.max(4, width - r.length - 1);
    return `${l.slice(0, availableLeft)} ${r}`;
  }
  const spaces = width - totalLen;
  return l + ' '.repeat(spaces) + r;
}

/**
 * Formats 3 columns with even spacing across the specified width.
 */
export function format3Columns(col1: string, col2: string, col3: string, width: number): string {
  const c1 = col1.trim();
  const c2 = col2.trim();
  const c3 = col3.trim();
  
  if (width === 32) {
    const raw = `${c1} | ${c2} | ${c3}`;
    if (raw.length <= 32) {
      return centerText(raw, 32);
    }
    const compact = `${c1}|${c2}|${c3}`;
    if (compact.length <= 32) {
      return centerText(compact, 32);
    }
    return raw.slice(0, 32);
  }
  
  const colWidth = Math.floor((width - 4) / 3);
  const p1 = c1.padEnd(colWidth, ' ');
  const p2 = c2.padEnd(colWidth, ' ');
  const p3 = c3.padEnd(width - (colWidth * 2) - 4, ' ');
  return `${p1} | ${p2} | ${p3}`;
}

/**
 * Formats 4 columns with exact column widths for tabular invoice rows.
 */
export function format4Columns(
  c1: string,
  c2: string,
  c3: string,
  c4: string,
  widths: [number, number, number, number]
): string {
  const col1 = c1.slice(0, widths[0]).padEnd(widths[0], ' ');
  const col2 = c2.slice(0, widths[1]).padStart(widths[1], ' ');
  const col3 = c3.slice(0, widths[2]).padStart(widths[2], ' ');
  const col4 = c4.slice(0, widths[3]).padStart(widths[3], ' ');
  return `${col1} ${col2} ${col3} ${col4}`;
}

/**
 * Formats a number to Pakistani Rupee string (e.g., 2,800).
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-PK');
}

/**
 * Formats a measurement inch value to 2 decimal places with quote symbol.
 */
export function formatInch(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '--.--"';
  const str = val.toFixed(2);
  // Pad single digit before decimal (e.g. 8.50 -> 08.50)
  const parts = str.split('.');
  const integerPart = parts[0].padStart(2, '0');
  return `${integerPart}.${parts[1]}"`;
}

/**
 * Formats ISO / YYYY-MM-DD date string to clean display date (e.g., 28-Aug-2026).
 */
export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats ISO date or current timestamp to time string (e.g., 04:15 PM).
 */
export function formatTimeDisplay(dateStr?: string | null): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

// ============================================================================
// 4. Text Layout Generators (58mm Fabric Tag & 80mm Invoice)
// ============================================================================

/**
 * Generates the monospaced plain text for a 58mm (32-character) Fabric Staple Tag.
 */
export function generateFabricTagSlipText(data: EscPosSlipData): string {
  const W = 32;
  const dividerDouble = '='.repeat(W);
  const dividerSingle = '-'.repeat(W);
  const m = data.measurements || {};
  const qty = data.quantity || 1;
  const isUrgent = data.isUrgent;

  const itemLine = `ITEM: ${data.garmentType.toUpperCase()} (${qty} PR)`.slice(0, W);

  const lines: string[] = [
    dividerDouble,
    centerText('SILAYE TAG', W),
    centerText(data.shopName.toUpperCase(), W),
    dividerDouble,
    `Order #: ${data.orderNumber}`.slice(0, W),
    padBetween(`Date: ${data.bookingDate || formatDateDisplay(new Date().toISOString())}`, data.bookingTime || formatTimeDisplay(), W),
    `Cust: ${data.customerName}`.slice(0, W),
    `Phone: ${data.customerPhone}`.slice(0, W),
    dividerSingle,
    itemLine,
  ];

  if (data.trialDate) {
    lines.push(`TRIAL: ${formatDateDisplay(data.trialDate)}`.slice(0, W));
  }

  const delvText = `DELIVERY: ${formatDateDisplay(data.deliveryDate)}${isUrgent ? ' [URGENT]' : ''}`.slice(0, W);
  lines.push(delvText);
  lines.push(dividerSingle);

  // 3x3 Measurement Grid
  lines.push(centerText('MEASUREMENTS (INCH)', W));
  lines.push(
    format3Columns(
      `L:${formatInch(m.kameez_length)}`,
      `C:${formatInch(m.chest)}`,
      `W:${formatInch(m.waist)}`,
      W
    )
  );
  lines.push(
    format3Columns(
      `T:${formatInch(m.shoulder_teera)}`,
      `B:${formatInch(m.sleeve_length)}`,
      `G:${formatInch(m.neck_gala)}`,
      W
    )
  );
  lines.push(
    format3Columns(
      `P:${formatInch(m.paincha)}`,
      `A:${formatInch(m.aasan)}`,
      `D:${formatInch(m.daman_width)}`,
      W
    )
  );
  lines.push(dividerSingle);

  // Cuts & Specs
  if (data.cutStyles && data.cutStyles.length > 0) {
    lines.push(`CUT: ${data.cutStyles.join(' | ')}`.slice(0, W));
  }
  if (data.pocketConfig) {
    lines.push(`PKT: ${data.pocketConfig}`.slice(0, W));
  }
  if (data.fabricColor || data.fabricBrand) {
    const fab = [data.fabricColor, data.fabricBrand].filter(Boolean).join(' - ');
    lines.push(`FAB: ${fab}`.slice(0, W));
  }
  lines.push(dividerSingle);

  // Financials
  lines.push(padBetween(`Total: Rs. ${formatCurrency(data.totalAmount)}`, `Adv: Rs. ${formatCurrency(data.advancePaid)}`, W));
  lines.push(padBetween('BAL DUE:', `Rs. ${formatCurrency(data.balanceDue)}`, W));
  lines.push(dividerDouble);

  // Barcode & Token
  lines.push(centerText('||||||||||||||||||||', W));
  lines.push(centerText(`*${data.orderNumber}*`, W));
  lines.push(dividerDouble);

  return lines.join('\n');
}

/**
 * Generates the monospaced plain text for an 80mm (48-character) Customer Booking Invoice.
 */
export function generateCustomerInvoiceSlipText(data: EscPosSlipData): string {
  const W = 48;
  const dividerDouble = '='.repeat(W);
  const dividerSingle = '-'.repeat(W);
  const qty = data.quantity || 1;
  const status = data.paymentStatus || (data.balanceDue <= 0 ? 'PAID' : data.advancePaid > 0 ? 'PARTIAL' : 'BOOKED');

  const lines: string[] = [
    dividerDouble,
    centerText(data.shopName.toUpperCase(), W),
  ];

  if (data.shopAddress) {
    lines.push(centerText(data.shopAddress, W));
  }
  if (data.shopPhone) {
    lines.push(centerText(`Tel: ${data.shopPhone}`, W));
  }

  lines.push(dividerDouble);
  lines.push(padBetween(`Receipt #: ${data.orderNumber}`, `Date: ${data.bookingDate || formatDateDisplay(new Date().toISOString())}`, W));
  lines.push(padBetween(`Customer: ${data.customerName.slice(0, 22)}`, `Time: ${data.bookingTime || formatTimeDisplay()}`, W));
  lines.push(padBetween(`Phone: ${data.customerPhone}`, `Status: ${status}`, W));
  lines.push(dividerSingle);

  // Itemized Table Header (Widths: 24, 4, 8, 9 = 48)
  const widths: [number, number, number, number] = [24, 4, 8, 9];
  lines.push(format4Columns('Item Description', 'Qty', 'Rate', 'Amount', widths));
  lines.push(dividerSingle);

  // Main Stitching Row
  const rate = data.stitchingRate || Math.round(data.totalAmount / qty);
  const amount = rate * qty;
  lines.push(format4Columns(data.garmentType.slice(0, 24), `${qty}`, formatCurrency(rate), `${formatCurrency(amount)}.00`, widths));

  // Addons / Fabric Charges
  if (data.fabricCharges && data.fabricCharges > 0) {
    lines.push(format4Columns('Fabric Material Charges', '1', formatCurrency(data.fabricCharges), `${formatCurrency(data.fabricCharges)}.00`, widths));
  }
  if (data.addonsCharges && data.addonsCharges > 0) {
    lines.push(format4Columns('Styling & Addons', '1', formatCurrency(data.addonsCharges), `${formatCurrency(data.addonsCharges)}.00`, widths));
  }
  if (data.discountAmount && data.discountAmount > 0) {
    lines.push(format4Columns('Discount Applied', '1', `-${formatCurrency(data.discountAmount)}`, `-${formatCurrency(data.discountAmount)}.00`, widths));
  }

  lines.push(dividerSingle);
  lines.push(padBetween('Subtotal:', `Rs. ${formatCurrency(data.totalAmount)}`, W));
  lines.push(padBetween('Advance Deposit (Cash):', `Rs. ${formatCurrency(data.advancePaid)}`, W));
  lines.push(dividerSingle);
  lines.push(padBetween('NET BALANCE DUE UPON PICKUP:', `Rs. ${formatCurrency(data.balanceDue)}`, W));
  lines.push(dividerDouble);

  // Deadlines
  if (data.trialDate) {
    lines.push(padBetween('Trial Date:', formatDateDisplay(data.trialDate), W));
  }
  lines.push(padBetween('Delivery Date:', `${formatDateDisplay(data.deliveryDate)}${data.isUrgent ? ' (URGENT)' : ''}`, W));
  lines.push(dividerSingle);

  // Terms & Conditions
  lines.push('* NOTE: Please present this receipt at pickup.');
  lines.push('* Clothes not claimed within 30 days are not our');
  lines.push('  responsibility.');
  lines.push(dividerDouble);

  // Online Tracking & Barcode
  const trackingUrl = data.publicTrackingUrl || `https://silaye.com/track/${data.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
  lines.push(centerText(`Track Live: ${trackingUrl}`, W));
  lines.push(centerText('||||||||||||||||||||||||||||||||', W));
  lines.push(centerText(`*${data.orderNumber}*`, W));
  lines.push(dividerDouble);

  return lines.join('\n');
}

// ============================================================================
// 5. ESC/POS Byte Builder (Pure Uint8Array Output)
// ============================================================================

export class EscPosBuilder {
  private chunks: Uint8Array[] = [];
  private encoder: TextEncoder = new TextEncoder();
  public readonly width: 32 | 48;

  constructor(paperWidth: '58mm' | '80mm' = '58mm') {
    this.width = paperWidth === '58mm' ? 32 : 48;
    this.addBytes(ESC_POS_COMMANDS.INIT);
  }

  public addBytes(...byteArrays: Uint8Array[]): this {
    for (const arr of byteArrays) {
      this.chunks.push(arr);
    }
    return this;
  }

  public addText(text: string): this {
    this.chunks.push(this.encoder.encode(text));
    return this;
  }

  public addLine(text = ''): this {
    this.chunks.push(this.encoder.encode(text + '\n'));
    return this;
  }

  public addDivider(char = '-'): this {
    this.addLine(char.repeat(this.width));
    return this;
  }

  public alignLeft(): this {
    this.chunks.push(ESC_POS_COMMANDS.ALIGN_LEFT);
    return this;
  }

  public alignCenter(): this {
    this.chunks.push(ESC_POS_COMMANDS.ALIGN_CENTER);
    return this;
  }

  public alignRight(): this {
    this.chunks.push(ESC_POS_COMMANDS.ALIGN_RIGHT);
    return this;
  }

  public setBold(enabled = true): this {
    this.chunks.push(enabled ? ESC_POS_COMMANDS.BOLD_ON : ESC_POS_COMMANDS.BOLD_OFF);
    return this;
  }

  public setDoubleHeight(): this {
    this.chunks.push(ESC_POS_COMMANDS.DOUBLE_HEIGHT);
    return this;
  }

  public setDoubleSize(): this {
    this.chunks.push(ESC_POS_COMMANDS.DOUBLE_SIZE);
    return this;
  }

  public resetSize(): this {
    this.chunks.push(ESC_POS_COMMANDS.RESET_SIZE);
    return this;
  }

  public feedLines(n = 3): this {
    this.chunks.push(ESC_POS_COMMANDS.FEED_LINES(n));
    return this;
  }

  public cut(partial = true): this {
    this.chunks.push(partial ? ESC_POS_COMMANDS.CUT_PARTIAL : ESC_POS_COMMANDS.CUT_FULL);
    return this;
  }

  /**
   * Appends a Code 128 barcode command using standard ESC/POS GS k 73 command sequence.
   * Format: GS k 73 [len] [{B] [data...]
   */
  public addCode128Barcode(codeText: string, height = 50, moduleWidth = 2): this {
    this.alignCenter();
    this.chunks.push(ESC_POS_COMMANDS.BARCODE_HEIGHT(height));
    this.chunks.push(ESC_POS_COMMANDS.BARCODE_WIDTH(moduleWidth));
    this.chunks.push(ESC_POS_COMMANDS.BARCODE_HRI_BELOW);

    // Code 128 subset B header: '{' 'B' -> [0x7B, 0x42]
    const cleanText = codeText.replace(/[^\x20-\x7E]/g, '');
    const dataBytes = this.encoder.encode(cleanText);
    const totalLen = 2 + dataBytes.length;

    // GS k 73 (0x1D 0x6B 0x49) n {B data
    const header = new Uint8Array([0x1d, 0x6b, 0x49, totalLen, 0x7b, 0x42]);
    this.chunks.push(header);
    this.chunks.push(dataBytes);
    this.chunks.push(ESC_POS_COMMANDS.FEED_LINE);
    return this;
  }

  /**
   * Compiles all chunks into a single concatenated Uint8Array.
   */
  public toUint8Array(): Uint8Array {
    let totalLength = 0;
    for (const chunk of this.chunks) {
      totalLength += chunk.length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}

// ============================================================================
// 6. Complete Binary Slip Builders
// ============================================================================

/**
 * Builds the complete raw ESC/POS binary stream for a 58mm Fabric Staple Tag.
 */
export function buildFabricTagBinary(data: EscPosSlipData): Uint8Array {
  const builder = new EscPosBuilder('58mm');
  const W = 32;
  const m = data.measurements || {};
  const qty = data.quantity || 1;

  // 1. Header
  builder.alignCenter().setBold(true);
  builder.addLine('SILAYE TAG');
  builder.addLine(data.shopName.toUpperCase());
  builder.setBold(false).alignLeft();
  builder.addDivider('=');

  // 2. Order Metadata
  builder.addLine(`Order #: ${data.orderNumber}`);
  builder.addLine(padBetween(`Date: ${data.bookingDate || formatDateDisplay(new Date().toISOString())}`, data.bookingTime || formatTimeDisplay(), W));
  builder.addLine(`Cust: ${data.customerName.slice(0, 24)}`);
  builder.addLine(`Phone: ${data.customerPhone}`);
  builder.addDivider('-');

  // 3. Garment & Deadlines
  const itemLine = `ITEM: ${data.garmentType.toUpperCase()} (${qty} PR)`.slice(0, W);
  builder.addLine(itemLine);
  if (data.trialDate) {
    builder.addLine(`TRIAL: ${formatDateDisplay(data.trialDate)}`.slice(0, W));
  }
  builder.setBold(true);
  builder.addLine(`DELIVERY: ${formatDateDisplay(data.deliveryDate)}${data.isUrgent ? ' [URGENT]' : ''}`.slice(0, W));
  builder.setBold(false);
  builder.addDivider('-');

  // 4. Measurements Grid
  builder.alignCenter().setBold(true);
  builder.addLine('MEASUREMENTS (INCH)');
  builder.setBold(false).alignLeft();
  builder.addLine(
    format3Columns(
      `L:${formatInch(m.kameez_length)}`,
      `C:${formatInch(m.chest)}`,
      `W:${formatInch(m.waist)}`,
      W
    )
  );
  builder.addLine(
    format3Columns(
      `T:${formatInch(m.shoulder_teera)}`,
      `B:${formatInch(m.sleeve_length)}`,
      `G:${formatInch(m.neck_gala)}`,
      W
    )
  );
  builder.addLine(
    format3Columns(
      `P:${formatInch(m.paincha)}`,
      `A:${formatInch(m.aasan)}`,
      `D:${formatInch(m.daman_width)}`,
      W
    )
  );
  builder.addDivider('-');

  // 5. Styles & Cuts
  if (data.cutStyles && data.cutStyles.length > 0) {
    builder.addLine(`CUT: ${data.cutStyles.join(' | ')}`.slice(0, W));
  }
  if (data.pocketConfig) {
    builder.addLine(`PKT: ${data.pocketConfig}`.slice(0, W));
  }
  if (data.fabricColor || data.fabricBrand) {
    const fab = [data.fabricColor, data.fabricBrand].filter(Boolean).join(' - ');
    builder.addLine(`FAB: ${fab}`.slice(0, W));
  }
  builder.addDivider('-');

  // 6. Financials
  builder.addLine(padBetween(`Total: Rs. ${formatCurrency(data.totalAmount)}`, `Adv: Rs. ${formatCurrency(data.advancePaid)}`, W));
  builder.setBold(true).setDoubleHeight();
  builder.addLine(`BAL DUE: Rs. ${formatCurrency(data.balanceDue)}`);
  builder.resetSize().setBold(false);
  builder.addDivider('=');

  // 7. Barcode (Code 128)
  builder.addCode128Barcode(data.orderNumber, 48, 2);
  builder.addDivider('=');

  // 8. Feed & Partial Cut
  builder.feedLines(4);
  builder.cut(true);

  return builder.toUint8Array();
}

/**
 * Builds the complete raw ESC/POS binary stream for an 80mm Customer Booking Invoice.
 */
export function buildCustomerInvoiceBinary(data: EscPosSlipData): Uint8Array {
  const builder = new EscPosBuilder('80mm');
  const W = 48;
  const qty = data.quantity || 1;
  const widths: [number, number, number, number] = [24, 4, 8, 9];
  const status = data.paymentStatus || (data.balanceDue <= 0 ? 'PAID' : data.advancePaid > 0 ? 'PARTIAL' : 'BOOKED');

  // 1. Header Branding
  builder.alignCenter().setBold(true);
  builder.addLine(data.shopName.toUpperCase());
  builder.setBold(false);
  if (data.shopAddress) builder.addLine(data.shopAddress);
  if (data.shopPhone) builder.addLine(`Tel: ${data.shopPhone}`);
  builder.alignLeft();
  builder.addDivider('=');

  // 2. Receipt Metadata
  builder.addLine(padBetween(`Receipt #: ${data.orderNumber}`, `Date: ${data.bookingDate || formatDateDisplay(new Date().toISOString())}`, W));
  builder.addLine(padBetween(`Customer: ${data.customerName.slice(0, 22)}`, `Time: ${data.bookingTime || formatTimeDisplay()}`, W));
  builder.addLine(padBetween(`Phone: ${data.customerPhone}`, `Status: ${status}`, W));
  builder.addDivider('-');

  // 3. Itemized Table
  builder.addLine(format4Columns('Item Description', 'Qty', 'Rate', 'Amount', widths));
  builder.addDivider('-');

  const rate = data.stitchingRate || Math.round(data.totalAmount / qty);
  const amount = rate * qty;
  builder.addLine(format4Columns(data.garmentType.slice(0, 24), `${qty}`, formatCurrency(rate), `${formatCurrency(amount)}.00`, widths));

  if (data.fabricCharges && data.fabricCharges > 0) {
    builder.addLine(format4Columns('Fabric Material Charges', '1', formatCurrency(data.fabricCharges), `${formatCurrency(data.fabricCharges)}.00`, widths));
  }
  if (data.addonsCharges && data.addonsCharges > 0) {
    builder.addLine(format4Columns('Styling & Addons', '1', formatCurrency(data.addonsCharges), `${formatCurrency(data.addonsCharges)}.00`, widths));
  }
  if (data.discountAmount && data.discountAmount > 0) {
    builder.addLine(format4Columns('Discount Applied', '1', `-${formatCurrency(data.discountAmount)}`, `-${formatCurrency(data.discountAmount)}.00`, widths));
  }

  builder.addDivider('-');
  builder.addLine(padBetween('Subtotal:', `Rs. ${formatCurrency(data.totalAmount)}`, W));
  builder.addLine(padBetween('Advance Deposit (Cash):', `Rs. ${formatCurrency(data.advancePaid)}`, W));
  builder.addDivider('-');

  builder.setBold(true);
  builder.addLine(padBetween('NET BALANCE DUE UPON PICKUP:', `Rs. ${formatCurrency(data.balanceDue)}`, W));
  builder.setBold(false);
  builder.addDivider('=');

  // 4. Deadlines
  if (data.trialDate) {
    builder.addLine(padBetween('Trial Date:', formatDateDisplay(data.trialDate), W));
  }
  builder.addLine(padBetween('Delivery Date:', `${formatDateDisplay(data.deliveryDate)}${data.isUrgent ? ' (URGENT)' : ''}`, W));
  builder.addDivider('-');

  // 5. Terms & Online Tracking
  builder.addLine('* NOTE: Please present this receipt at pickup.');
  builder.addLine('* Clothes not claimed within 30 days are not our');
  builder.addLine('  responsibility.');
  builder.addDivider('=');

  const trackingUrl = data.publicTrackingUrl || `https://silaye.com/track/${data.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
  builder.alignCenter();
  builder.addLine(`Track Live: ${trackingUrl}`);
  builder.addCode128Barcode(data.orderNumber, 48, 2);
  builder.addDivider('=');

  // 6. Feed & Cut
  builder.feedLines(4);
  builder.cut(true);

  return builder.toUint8Array();
}

// ============================================================================
// 7. Order Entity Mapper Utility
// ============================================================================

const GARMENT_TYPE_LABELS: Record<string, { en: string; ur: string }> = {
  MEN_SHALWAR_KAMEEZ: { en: 'Men Shalwar Kameez', ur: 'مردانہ شلوار قمیض' },
  MEN_KURTA: { en: 'Men Kurta', ur: 'مردانہ کرتہ' },
  WAISTCOAT: { en: 'Waistcoat', ur: 'واسکٹ' },
  PRINCE_SUIT: { en: 'Prince Suit', ur: 'پرنس سوٹ' },
  TROUSER_SHIRT: { en: 'Trouser Shirt', ur: 'پینٹ شرٹ' },
  WOMEN_SUIT: { en: 'Ladies Suit', ur: 'زنانہ سوٹ' },
};

const COLLAR_LABELS: Record<string, string> = {
  FULL_BAN: 'Full Ban',
  HALF_BAN: 'Half Ban',
  SHERWANI_CUT: 'Sherwani Cut',
  SHIRT_COLLAR: 'Shirt Collar',
  GOL_GALA: 'Gol Gala',
};

const DAMAN_LABELS: Record<string, string> = {
  GOL_DAMAN: 'Gol Daman',
  CHORAS_DAMAN: 'Choras Daman',
};

const POCKET_LABELS: Record<string, string> = {
  FRONT_ONLY: 'Front Pocket Only',
  FRONT_ONE_SIDE: '1 Front + 1 Side',
  FRONT_TWO_SIDES: '1 Front + 2 Sides',
  TWO_SIDES_NO_FRONT: '2 Side Pockets',
  SECRET_ZIPPER_POCKET: 'Front + Secret Zip',
};

/**
 * Maps a GarmentOrder entity and related records into EscPosSlipData.
 */
export function mapOrderToSlipData(
  order: GarmentOrder,
  customer?: Customer,
  shop?: Shop
): EscPosSlipData {
  const gLabel = GARMENT_TYPE_LABELS[order.garment_type] || { en: order.garment_type, ur: '' };
  const styles = order.snapshot_styles;
  const cuts: string[] = [];

  if (styles?.collar_style) {
    cuts.push(COLLAR_LABELS[styles.collar_style] || styles.collar_style);
  }
  if (styles?.daman_style) {
    cuts.push(DAMAN_LABELS[styles.daman_style] || styles.daman_style);
  }

  const pocket = styles?.pocket_config ? POCKET_LABELS[styles.pocket_config] || styles.pocket_config : undefined;

  // Check delivery urgency (< 48 hours)
  const deliveryDateObj = new Date(order.delivery_date);
  const now = new Date();
  const diffDays = Math.round((deliveryDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = diffDays <= 2;

  return {
    shopName: shop?.name || 'AL-MADINA TAILORS',
    shopAddress: shop?.address || 'Main Bazaar, Saddar, Wah Cantt',
    shopPhone: shop?.owner_phone || '+92 300 1234567',
    orderNumber: order.order_number,
    bookingDate: formatDateDisplay(order.booking_date),
    bookingTime: formatTimeDisplay(order.booking_date),
    customerName: customer?.full_name || order.customer?.full_name || 'Walk-in Customer',
    customerPhone: customer?.phone || order.customer?.phone || '0300-0000000',
    garmentType: gLabel.en,
    garmentTypeUr: gLabel.ur,
    quantity: order.quantity || 1,
    trialDate: order.trial_date,
    deliveryDate: order.delivery_date,
    isUrgent,
    measurements: order.snapshot_measurements,
    cutStyles: cuts,
    pocketConfig: pocket,
    fabricColor: order.fabric_color,
    fabricBrand: order.fabric_brand,
    fabricSource: order.fabric_provided_by,
    stitchingRate: order.stitching_rate,
    fabricCharges: order.fabric_charges,
    addonsCharges: order.addons_charges,
    discountAmount: order.discount_amount,
    totalAmount: order.total_amount,
    advancePaid: order.advance_paid,
    balanceDue: order.balance_due,
    paymentStatus: order.payment_status,
    publicTrackingUrl: `https://silaye.com/track/${order.public_tracking_key || order.order_number}`,
    notes: order.fabric_notes,
  };
}

// ============================================================================
// 8. File Download Helper (Browser Blob Export)
// ============================================================================

/**
 * Triggers a download of raw ESC/POS binary data as a .bin file in the browser.
 */
export function downloadEscPosBinaryFile(
  bytes: Uint8Array,
  filename = 'thermal-slip.bin'
): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
