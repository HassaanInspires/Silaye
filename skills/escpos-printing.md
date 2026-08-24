# skills/escpos-printing.md - ESC/POS Thermal Printing, Fabric Tag Layout & Hardware Protocol

## 1. Hardware Standards & Paper Specifications

Pakistani workshop counters predominantly deploy low-cost thermal POS receipt printers (Xprinter, Rongta, Black Copper, Epson, Gprinter) connected via USB, Network (Ethernet/Wi-Fi), or Bluetooth.

### 1.1 Print Width Profiles
| Standard Width | Printable Dot Area | Max Characters (Font A: $12\times24$) | Max Characters (Font B: $9\times17$) | Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **58 mm (2-inch)** | 384 dots / line | **32 characters** | **42 characters** | Fabric Staple Tags, Compact Token Slips |
| **80 mm (3-inch)** | 576 dots / line | **48 characters** | **64 characters** | Full Customer Booking Slips, Khata Statements |

---

## 2. Low-Level ESC/POS Byte Command Reference

Raw ESC/POS command sequences used to format slips on receipt printers:

```typescript
export const ESC_POS = {
  // Initialization & Hardware Control
  INIT: Buffer.from([0x1b, 0x40]), // ESC @ (Reset to defaults)
  CUT_FULL: Buffer.from([0x1d, 0x56, 0x00]), // GS V 0 (Full Cut)
  CUT_PARTIAL: Buffer.from([0x1d, 0x56, 0x01]), // GS V 1 (Partial Cut)
  DRAWER_KICK: Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]), // Pulse to open cash drawer

  // Text Alignment
  ALIGN_LEFT: Buffer.from([0x1b, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([0x1b, 0x61, 0x01]),
  ALIGN_RIGHT: Buffer.from([0x1b, 0x61, 0x02]),

  // Text Styling & Sizing
  BOLD_ON: Buffer.from([0x1b, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([0x1b, 0x45, 0x00]),
  DOUBLE_HEIGHT: Buffer.from([0x1d, 0x21, 0x01]),
  DOUBLE_WIDTH: Buffer.from([0x1d, 0x21, 0x10]),
  DOUBLE_SIZE: Buffer.from([0x1d, 0x21, 0x11]), // Double width + Double height
  RESET_SIZE: Buffer.from([0x1d, 0x21, 0x00]),
  UNDERLINE_ON: Buffer.from([0x1b, 0x2d, 0x01]),
  UNDERLINE_OFF: Buffer.from([0x1b, 0x2d, 0x00]),

  // Line Feed & Spacing
  FEED_LINE: Buffer.from([0x0a]),
  FEED_LINES: (n: number) => Buffer.from([0x1b, 0x64, n]),
};

```

---

## 3. Fabric Tag & Customer Slip Layouts

### 3.1 58mm Fabric Staple Tag (Compact Workshop Cut Tag)

Designed to be stapled directly onto unstitched fabric pieces. Emphasizes Order ID, Delivery Deadline, and Key Cutting Dimensions:

```text
================================
           Silaye TAG          
        AL-MADINA TAILOR        
================================
Order #: DP-2026-0801
Date: 23-Aug-2026  Time: 04:15 PM
Customer: Muhammad Usman
Phone: 0300-1234567
--------------------------------
GARMENT: MEN SUIT (1 PAIR)
TRIAL: 27-Aug-2026
DELIVERY: 28-Aug-2026 [URGENT]
--------------------------------
        MEASUREMENTS (INCH)     
L: 42.50" | C: 40.00" | W: 36.00"
T: 18.00" | B: 24.50" | G: 16.00"
P: 08.50" | A: 16.00" | D: 23.50"
--------------------------------
CUT: Sherwani Collar | Gol Daman
PKT: 1 Front + 1 Secret Mobile
--------------------------------
Total: Rs. 2,800  Adv: Rs. 1,000
BAL DUE: Rs. 1,800
================================
          ||||||||||||||        
          *DP-2026-0801*        
================================

```

### 3.2 80mm Full Customer Booking Invoice

Contains complete workshop branding, itemized charges, and terms:

```text
================================================
                AL-MADINA TAILORS               
          Main Bazaar, Saddar, Wah Cantt        
              Tel: +92 300 1234567              
================================================
Receipt #: DP-2026-0801          Date: 23-Aug-2026
Customer: Muhammad Usman         Time: 04:15 PM
Phone: 0300-1234567              Status: BOOKED
------------------------------------------------
Item Description          Qty     Rate    Amount
------------------------------------------------
Men Shalwar Kameez         1    2,500   2,500.00
Fancy Button Addon         1      300     300.00
------------------------------------------------
Subtotal:                              Rs. 2,800
Advance Deposit (Cash):                Rs. 1,000
------------------------------------------------
NET BALANCE DUE UPON PICKUP:           Rs. 1,800
================================================
Trial Date:    27-Aug-2026
Delivery Date: 28-Aug-2026 (Friday Evening)
------------------------------------------------
* NOTE: Please bring this slip for trial/delivery.
* Clothes not claimed within 30 days are not our
  responsibility.
================================================
       Track Live: [silaye.com/track/801](https://silaye.com/track/801)       

```

---

## 4. Multi-Platform Print Handlers

```
┌─────────────────────────────────────────────────────────────┐
│                 Print Dispatch Controller                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Detects Execution Runtime
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Windows (.exe)   │  │ Mobile (.apk)    │  │ Web Browser      │
│ Electron Native  │  │ Capacitor        │  │ CSS @media print │
│ Direct USB / COM │  │ Bluetooth POS    │  │ or WebUSB API    │
└──────────────────┘  └──────────────────┘  └──────────────────┘

```

### 4.1 Windows Desktop Native Execution (Electron / Node Runtime)

Communicates directly with USB/Network printer endpoints without opening the OS print dialog:

```typescript
import { Buffer } from 'buffer';

export interface EscPosSlipData {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  garmentType: string;
  deliveryDate: string;
  trialDate?: string;
  measurements: Record<string, number>;
  cutStyles: string[];
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
}

export class EscPosBuilder {
  private buffer: Buffer[] = [];
  private width: 32 | 48;

  constructor(paperWidth: '58mm' | '80mm' = '58mm') {
    this.width = paperWidth === '58mm' ? 32 : 48;
    this.buffer.push(ESC_POS.INIT);
  }

  private addLine(text: string): this {
    this.buffer.push(Buffer.from(text + '\n', 'ascii'));
    return this;
  }

  private addDivider(char = '-'): this {
    this.buffer.push(Buffer.from(char.repeat(this.width) + '\n', 'ascii'));
    return this;
  }

  public buildFabricTag(data: EscPosSlipData): Buffer {
    // 1. Header
    this.buffer.push(ESC_POS.ALIGN_CENTER, ESC_POS.BOLD_ON);
    this.addLine('SILAYE TAG');
    this.addLine(data.shopName.toUpperCase());
    this.buffer.push(ESC_POS.BOLD_OFF);
    this.addDivider('=');

    // 2. Order Details
    this.buffer.push(ESC_POS.ALIGN_LEFT);
    this.addLine(`Order #: ${data.orderNumber}`);
    this.addLine(`Cust: ${data.customerName}`);
    this.addLine(`Phone: ${data.customerPhone}`);
    this.addDivider('-');

    // 3. Garment & Delivery
    this.addLine(`ITEM: ${data.garmentType}`);
    if (data.trialDate) this.addLine(`TRIAL: ${data.trialDate}`);
    this.buffer.push(ESC_POS.BOLD_ON);
    this.addLine(`DELV: ${data.deliveryDate}`);
    this.buffer.push(ESC_POS.BOLD_OFF);
    this.addDivider('-');

    // 4. Measurements Grid
    this.buffer.push(ESC_POS.ALIGN_CENTER, ESC_POS.BOLD_ON);
    this.addLine('MEASUREMENTS (INCH)');
    this.buffer.push(ESC_POS.BOLD_OFF, ESC_POS.ALIGN_LEFT);
    
    const m = data.measurements;
    this.addLine(`L: ${(m.kameez_length || 0).toFixed(2)}" | C: ${(m.chest || 0).toFixed(2)}" | W: ${(m.waist || 0).toFixed(2)}"`);
    this.addLine(`T: ${(m.shoulder_teera || 0).toFixed(2)}" | B: ${(m.sleeve_length || 0).toFixed(2)}" | G: ${(m.neck_gala || 0).toFixed(2)}"`);
    this.addLine(`P: ${(m.paincha || 0).toFixed(2)}" | A: ${(m.aasan || 0).toFixed(2)}" | D: ${(m.daman_width || 0).toFixed(2)}"`);
    this.addDivider('-');

    // 5. Styles & Cuts
    if (data.cutStyles.length > 0) {
      this.addLine(`CUT: ${data.cutStyles.join(' | ')}`);
      this.addDivider('-');
    }

    // 6. Financials
    this.addLine(`Total: Rs. ${data.totalAmount}  Adv: Rs. ${data.advancePaid}`);
    this.buffer.push(ESC_POS.BOLD_ON, ESC_POS.DOUBLE_HEIGHT);
    this.addLine(`BAL DUE: Rs. ${data.balanceDue}`);
    this.buffer.push(ESC_POS.RESET_SIZE, ESC_POS.BOLD_OFF);
    this.addDivider('=');

    // 7. Barcode (Code 128)
    this.buffer.push(ESC_POS.ALIGN_CENTER);
    this.buffer.push(Buffer.from([0x1d, 0x6b, 0x49, data.orderNumber.length]));
    this.buffer.push(Buffer.from(data.orderNumber, 'ascii'));
    this.buffer.push(ESC_POS.FEED_LINE);
    this.addLine(`*${data.orderNumber}*`);

    // 8. Feed and Cut
    this.buffer.push(ESC_POS.FEED_LINES(4));
    this.buffer.push(ESC_POS.CUT_PARTIAL);

    return Buffer.concat(this.buffer);
  }
}

```

---

## 5. Web Browser Printing Fallback (`@media print`)

For standard web browser users without USB driver access, a dedicated CSS print stylesheet renders the exact 58mm/80mm roll dimensions:

```css
/* Printable Thermal Roll Container */
@media print {
  @page {
    margin: 0;
    size: 58mm auto; /* Or 80mm auto */
  }

  body {
    background: #FFFFFF !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 2mm !important;
    font-family: 'Courier New', Courier, monospace !important;
    font-size: 11px !important;
    line-height: 1.2 !important;
  }

  .no-print,
  header,
  nav,
  aside,
  button {
    display: none !important;
  }

  .thermal-slip-container {
    width: 100% !important;
    max-width: 54mm !important;
    margin: 0 auto !important;
    page-break-after: always;
  }
}

```

---

## 6. Urdu Rendering on Thermal Printers (Bitmap Rasterization)

Thermal receipt printers do not natively support cursive Nastaliq or Arabic character shaping ROMs.

### 6.1 Urdu Printing Strategy

To print Urdu receipts on physical thermal paper:

1. Render the receipt component to an off-screen HTML5 `<canvas>` element using `Noto Sans Arabic` or `Noto Nastaliq Urdu`.
2. Convert the canvas into a monochrome 1-bit per pixel bitmap image array (thresholding at luminance $< 128$).
3. Stream the raster bitmap using the standard ESC/POS raster bit image command:
`GS v 0` (`\x1D\x76\x30\x00\x{xL}\x{xH}\x{yL}\x{yH}[data]`).

```

```
