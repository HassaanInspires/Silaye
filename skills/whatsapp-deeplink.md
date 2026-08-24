# skills/whatsapp-deeplink.md - WhatsApp Deep-Link Construction & Receipt Generator

## 1. Overview & Protocol Specification

Silaye uses 1-click WhatsApp deep-linking (`wa.me`) to deliver instant, zero-cost digital receipts, ready-for-pickup notifications, and *khata* balance reminders without incurring per-message SMS or API aggregator costs.

### 1.1 Deep-Link Protocol Standard
```text
[https://wa.me/](https://wa.me/){sanitized_phone_number}?text={encoded_uri_message}

```

### 1.2 Cross-Platform Execution Handlers

* **Web (Browser):** Opens `window.open(url, '_blank')`.
* **Desktop (`.exe` via Electron):** Uses Electron's native shell integration: `shell.openExternal(url)`.
* **Mobile (`.apk` via Capacitor):** Uses `@capacitor/app-launcher` or `@capacitor/browser` to trigger the installed WhatsApp app directly.

---

## 2. Phone Number Sanitization (Pakistan Locale Spec)

Pakistani phone numbers are entered in various formats (`03001234567`, `0300-1234567`, `+923001234567`, `923001234567`). They must be strictly sanitized into the international E.164 numerical format without leading pluses or hyphens (`923001234567`).

```typescript
/**
 * Sanitizes any Pakistani phone string into international WhatsApp format (923XXXXXXXXX)
 */
export function sanitizePakistaniPhone(rawPhone: string): string {
  // Strip all non-digit characters
  const digitsOnly = rawPhone.replace(/\D/g, '');

  // Handle formats: 03001234567 -> 923001234567
  if (digitsOnly.startsWith('03') && digitsOnly.length === 11) {
    return `92${digitsOnly.slice(1)}`;
  }

  // Handle formats: 923001234567
  if (digitsOnly.startsWith('923') && digitsOnly.length === 12) {
    return digitsOnly;
  }

  // Handle formats: 3001234567 -> 923001234567
  if (digitsOnly.startsWith('3') && digitsOnly.length === 10) {
    return `92${digitsOnly}`;
  }

  return digitsOnly;
}

```

---

## 3. Dynamic Message Templates & Formatting Rules

### 3.1 WhatsApp Markdown Formatting Conventions

* **Bold:** Wrap text in asterisks `*Text*`
* **Italics:** Wrap text in underscores `_Text_`
* **Monospace (Numbers/Codes):** Wrap text in triple backticks ````CODE````
* **Line Breaks:** Use literal `\n` in string templates, mapped to `%0A` upon URI encoding.

---

### 3.2 Template Generators (TypeScript)

```typescript
export interface WhatsAppReceiptPayload {
  shopName: string;
  shopPhone: string;
  shopAddress?: string;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  garmentTypeUrdu: string;
  quantity: number;
  deliveryDate: string; // e.g. "28 Aug 2026"
  trialDate?: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  trackingUrl: string;
}

/**
 * 1. Order Booking & Advance Deposit Receipt
 */
export function generateBookingReceiptMessage(data: WhatsAppReceiptPayload): string {
  const lines = [
    `السلام علیکم *${data.customerName}* صاحب،`,
    `آپ کا آرڈر *${data.shopName}* پر کامیابی سے بک ہو چکا ہے۔`,
    ``,
    `📋 *آرڈر کی تفصیلات:*`,
    `▫️ *آرڈر نمبر:* #${data.orderNumber}`,
    `▫️ *آئٹم:* ${data.garmentTypeUrdu} (${data.quantity} عدد)`,
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
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * 2. Order Ready for Pickup / Trial Alert
 */
export function generateOrderReadyMessage(data: WhatsAppReceiptPayload): string {
  const lines = [
    `السلام علیکم *${data.customerName}* صاحب،`,
    `خوشخبری! آپ کا آرڈر *${data.shopName}* پر تیار ہو چکا ہے۔`,
    ``,
    `📋 *آرڈر نمبر:* #${data.orderNumber}`,
    `👔 *آئٹم:* ${data.garmentTypeUrdu}`,
    `⚠️ *بقایا واجب الادا رقم:* *Rs. ${data.balanceDue.toLocaleString()}*`,
    ``,
    data.shopAddress ? `📍 *شاپ کا پتہ:*\n${data.shopAddress}\n` : null,
    `براہ کرم تشریف لا کر اپنا آرڈر وصول فرمائیں۔`,
    `شکریہ! *${data.shopName}*`,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * 3. Khata / Udhaar Pending Balance Reminder
 */
export function generateKhataReminderMessage(
  customerName: string,
  shopName: string,
  totalPendingBalance: number,
  shopPhone: string
): string {
  const lines = [
    `السلام علیکم *${customerName}* صاحب،`,
    `امید ہے آپ خیریت سے ہوں گے۔ یہ پیغام *${shopName}* کی طرف سے بقایا کھاتہ بیلنس کی یاد دہانی کے لیے ہے۔`,
    ``,
    `💰 *کل واجب الادا رقم:* *Rs. ${totalPendingBalance.toLocaleString()}*`,
    ``,
    `براہِ کرم جلد از جلد بقایا رقم ادا کر کے کھاتہ کلیئر فرمائیں۔`,
    `کسی بھی سوال کی صورت میں ہم سے رابطہ کریں:`,
    `📞 ${shopPhone}`,
    ``,
    `شکریہ!`,
    `*${shopName}*`,
  ];

  return lines.join('\n');
}

```

---

## 4. Deep-Link URL Builder Utility

```typescript
/**
 * Assembles the final executable WhatsApp URL
 */
export function buildWhatsAppLink(rawPhone: string, rawMessage: string): string {
  const sanitizedPhone = sanitizePakistaniPhone(rawPhone);
  const encodedText = encodeURIComponent(rawMessage);
  return `[https://wa.me/$](https://wa.me/$){sanitizedPhone}?text=${encodedText}`;
}

/**
 * Dispatches the WhatsApp deep-link safely across Web, Desktop, and Mobile environments
 */
export async function openWhatsAppLink(url: string): Promise<void> {
  // 1. Check if running inside Electron Desktop Runtime
  if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
    await (window as any).electronAPI.openExternal(url);
    return;
  }

  // 2. Check if running inside Capacitor Mobile Runtime
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
    try {
      const { AppLauncher } = await import('@capacitor/app-launcher');
      const canOpen = await AppLauncher.canOpenUrl({ url });
      if (canOpen.value) {
        await AppLauncher.openUrl({ url });
        return;
      }
    } catch {
      // Fallback to standard window.open if plugin unavailable
    }
  }

  // 3. Fallback for Standard Web Browser
  window.open(url, '_blank', 'noopener,noreferrer');
}

```

```

```
