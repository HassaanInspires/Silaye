# skills/urdu-typography.md - Urdu Typography, RTL Layout & Vertical Baseline Guide

## 1. Core Typography Strategy

Urdu text behaves fundamentally differently from Latin text due to its cursive nature, baseline positioning, and tall ascenders/descenders. To avoid the standard layout bugs (vertical clipping in inputs, shifted tables, and misaligned numbers), Silaye utilizes a **two-tier font strategy**:

| Layer | Recommended Font | Fallback Stack | Use Case |
| :--- | :--- | :--- | :--- |
| **Data Intake & UI Tables** | **Noto Sans Arabic** / **Readex Pro** | `system-ui`, `sans-serif` | Forms, measurement inputs, dense data tables, POS queue chips, navigation items. |
| **Luxury Display & Print** | **Noto Nastaliq Urdu** / **Gulzar** | `'Traditional Arabic'`, `serif` | Hero titles, editorial banners, customer-facing PDF receipts, luxury marketing modals. |

---

## 2. Eliminating Vertical Line Clipping (The Nastaliq Dilemma)

### 2.1 The Root Cause
Standard CSS `line-height: 1` or `leading-tight` crops Urdu diacritics (*Zer*, *Zabar*, *Pesh*) and descenders (*Noon Ghunna*, *Choti Yeh*, *Bari Yeh*) because Nastaliq glyph heights exceed standard Latin em-boxes by up to 40%.

### 2.2 Standardized Line-Height Multipliers
* **For UI Text (`Noto Sans Arabic`):** Always use a minimum line-height of `1.6` (`leading-relaxed`).
* **For Nastaliq Headings (`Noto Nastaliq Urdu`):** Always use a minimum line-height of `2.0` to `2.2` (`leading-[2.2]`) and provide extra vertical padding (`py-2` or `py-3`) on containers to prevent bounding box overflow.

```css
/* Urdu Input & Label Utility Classes */
.urdu-data-text {
  font-family: var(--font-urdu-sans), system-ui, sans-serif;
  line-height: 1.65;
  text-rendering: optimizeLegibility;
}

.urdu-display-text {
  font-family: var(--font-urdu-serif), 'Traditional Arabic', serif;
  line-height: 2.2;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

```

---

## 3. Bidirectional (BiDi) & RTL Layout Rules

### 3.1 Document vs. Component Directionality

* The global application shell remains `dir="ltr"` for consistent grid layout across all three platforms (Web, Desktop `.exe`, Mobile `.apk`).
* Urdu-specific content cards, form labels, and customer message previews use localized directional containers:

```tsx
// Correct localized RTL container pattern
<div className="flex flex-col gap-1" dir="rtl">
  <label className="text-sm font-medium text-foreground urdu-data-text">
    لمبائی (قمیض)
  </label>
  <div dir="ltr">
    {/* Numbers and inputs stay LTR for standard decimal typing */}
    <MeasurementInputField name="kameez_length"/>
  </div>
</div>

```

### 3.2 Number & Measurement Isolation

* Phone numbers (`+92 300 1234567`), currency amounts (`Rs. 2,500`), and fractional measurements (`42.50"`) must always be wrapped in `<bdi>` (Bidirectional Isolation) tags or explicit `dir="ltr"` spans to avoid reversed punctuation and mangled digits.

```tsx
// Pattern for mixed text and numbers
<p className="urdu-data-text" dir="rtl">
  کل بقایا رقم: <bdi className="font-mono font-bold" dir="ltr">Rs. 2,500</bdi>
</p>

```

---

## 4. Standardized Tailoring Vocabulary Dictionary

Always use these verified industry terms across forms, labels, and receipts:

### 4.1 Measurement Dimensions

* **Length:** لمبائی (`Lambi`)
* **Chest:** چھاتی (`Chhati`)
* **Waist:** کمر (`Kamar`)
* **Shoulder:** تیرا (`Teera`)
* **Sleeve:** بازو (`Bazoo`)
* **Armhole:** موڈھا (`Moodha`)
* **Collar / Neck:** گلا / بین (`Gala / Ban`)
* **Bottom Hem / Daman:** دامن / گھیرا (`Daman / Ghera`)
* **Cuff:** کف (`Cuff`)
* **Bicep:** ڈولا (`Dola`)
* **Shalwar Length:** شلوار لمبائی (`Shalwar Lambi`)
* **Paincha / Leg Opening:** پائینچہ (`Paincha`)
* **Aasan / Crotch Depth:** آسن (`Aasan`)
* **Inseam / Fly:** نالی (`Naali`)

### 4.2 Garment Cut & Styling Options

* **Full Ban:** فل بین
* **Half Ban:** ہاف بین
* **Sherwani Cut:** شیروانی کٹ
* **Shirt Collar:** شرٹ کالر
* **Round Neck:** گول گلا
* **Round Daman:** گول دامن
* **Square Daman:** چورس دامن
* **Concealed Placket:** گم پٹی
* **Wide Placket:** چوڑی پٹی
* **Double Stitch:** ڈبل سلائی
* **Single Stitch:** سنگل سلائی
* **Secret Mobile Pocket:** موبائل زپ والی خفیہ جیب

### 4.3 Production Statuses

* **Booked:** آرڈر بک ہو گیا
* **Fabric Received:** کپڑا موصول ہوا
* **In Cutting:** کٹنگ جاری ہے
* **In Stitching:** سلائی جاری ہے
* **Kaj & Buttons:** کاج اور بٹن
* **Pressing & Packing:** پریسنگ اور پیکنگ
* **Ready for Trial:** ٹرائل کے لیے تیار
* **Ready for Delivery:** ڈیلیوری کے لیے تیار
* **Delivered:** مکمل ڈیلیور شدہ

---

## 5. Next.js & Tailwind Font Configuration

### 5.1 Font Setup (`app/layout.tsx`)

```typescript
import { Noto_Sans_Arabic, Noto_Nastaliq_Urdu } from 'next/font/google';

export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-urdu-sans',
  display: 'swap',
});

export const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-urdu-serif',
  display: 'swap',
});

```

### 5.2 Tailwind Utility Extension (`tailwind.config.ts`)

```typescript
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'urdu-sans': ['var(--font-urdu-sans)', 'sans-serif'],
        'urdu-serif': ['var(--font-urdu-serif)', 'serif'],
      },
    },
  },
};

```

```

```
