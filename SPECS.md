# specs.md - Product Architecture, Data Models & Technical Specifications

## 1. System Overview
**DarziPro** is a multi-tenant workshop operating system and customer relationship management (CRM) platform engineered for bespoke tailoring houses, master cutting workshops, and retail boutiques in Pakistan.

The system synchronizes across three target distribution formats from a single codebase:
1. **Web Dashboard:** Edge-hosted Next.js application for administration, customer self-service order tracking, and multi-branch management.
2. **Windows Desktop App (`.exe` via Electron):** Offline-resilient counter terminal with direct USB thermal receipt and barcode printing.
3. **Mobile Android App (`.apk` via Capacitor):** Portable workshop tablet and smartphone interface for on-the-floor measurement capture and 1-tap WhatsApp communication.

---

## 2. Core Domain Taxonomy & Measurement Standards

### 2.1 Unit System
* All body and garment measurements are recorded in standard **Inches**.
* Fractional precision is strictly quantized to quarter-inch increments: `.00` ($0$), `.25` ($\frac{1}{4}$), `.50` ($\frac{1}{2}$), and `.75` ($\frac{3}{4}$).

### 2.2 Measurement Key Profiles (Bilingual Spec)

#### A. Kameez / Kurta (قمیض / کرتہ)
| English Parameter | Urdu Term | Notation Key | Default Range (Inches) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Length** | لمبائی | `kameez_length` | 36.00 – 48.00 | Shoulder seam to bottom hem line |
| **Chest** | چھاتی | `chest` | 32.00 – 56.00 | Circumference around widest chest point |
| **Waist** | کمر | `waist` | 28.00 – 54.00 | Circumference around natural waistline |
| **Hips / Seat** | ہپ / گھیرا | `hips` | 32.00 – 58.00 | Circumference around widest hip point |
| **Shoulder** | تیرا | `shoulder_teera` | 15.00 – 22.00 | Tip of left shoulder bone to right shoulder bone |
| **Sleeve Length** | بازو | `sleeve_length` | 20.00 – 28.00 | Shoulder tip to wrist bone |
| **Armhole** | موڈھا | `armhole_moodha` | 8.00 – 14.00 | Diagonal sleeve hole depth |
| **Neck / Collar** | گلا / بین | `neck_gala` | 13.00 – 20.00 | Circumference around base of neck |
| **Daman / Bottom Width** | دامن / گھیرا | `daman_width` | 18.00 – 32.00 | Width across the lower bottom hem |
| **Bicep** | ڈولا | `bicep_dola` | 6.00 – 12.00 | Sleeve upper arm circumference |
| **Cuff Width** | کف چوڑائی | `cuff_width` | 2.00 – 3.50 | Width of cuff fabric band |
| **Cuff Circumference** | کف گھیرا | `cuff_length` | 8.00 – 12.00 | Wrist opening circumference |

#### B. Shalwar / Pajama / Trouser (شلوار / پاجامہ / ٹراؤزر)
| English Parameter | Urdu Term | Notation Key | Default Range (Inches) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Length** | لمبائی | `shalwar_length` | 34.00 – 46.00 | Waistband/elastic top to bottom hem |
| **Paincha / Bottom Opening** | پائینچہ | `paincha` | 6.00 – 12.00 | Flat width of leg opening |
| **Aasan / Crotch Depth** | آسن | `aasan` | 14.00 – 22.00 | Top of waistband to crotch seam |
| **Ghera / Thigh Width** | گھیرا / پاٹ | `shalwar_ghera` | 14.00 – 26.00 | Flat width across upper thigh |
| **Fly / Inseam** | نالی | `inseam` | 22.00 – 34.00 | Crotch seam to bottom paincha hem |

#### C. Style & Cut Preference Enums
* **Collar Cut (`collar_style`):** `FULL_BAN`, `HALF_BAN`, `SHERWANI_CUT`, `SHIRT_COLLAR`, `GOL_GALA`
* **Daman Cut (`daman_style`):** `GOL_DAMAN` (Round), `CHORAS_DAMAN` (Square)
* **Pocket Configuration (`pocket_config`):** `FRONT_ONLY`, `FRONT_ONE_SIDE`, `FRONT_TWO_SIDES`, `TWO_SIDES_NO_FRONT`, `SECRET_ZIPPER_POCKET`
* **Front Placket (`front_patti`):** `GUM_PATTI` (Concealed), `CHORI_PATTI` (Wide), `BAREEK_PATTI` (Slim), `DOUBLE_STITCH`
* **Bottom Style (`bottom_type`):** `SHALWAR_TRADITIONAL`, `SHALWAR_POCKET`, `TROUSER_PANT_CUT`, `CHURIDAR`
* **Stitch Finish (`stitch_type`):** `SINGLE_KANDHA`, `DOUBLE_SILAI`, `OVERLOCK_FINISH`, `HAND_TAILORED_TURPAI`

---

## 3. Database Schema (PostgreSQL / Supabase Engine)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants / Workshop Shops
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(32) NOT NULL,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Wah Cantt',
    country VARCHAR(10) DEFAULT 'PK',
    currency VARCHAR(10) DEFAULT 'PKR',
    receipt_header TEXT,
    receipt_footer TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff & Workshop Operators
CREATE TYPE staff_role AS ENUM ('OWNER', 'MANAGER', 'CUTTING_MASTER', 'STITCHER', 'PRESSMAN', 'COUNTER_CLERK');

CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    role staff_role DEFAULT 'STITCHER',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    alternate_phone VARCHAR(32),
    address TEXT,
    city VARCHAR(100),
    notes TEXT,
    total_orders_count INT DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    current_khata_balance NUMERIC(12, 2) DEFAULT 0.00, -- Positive = Customer owes shop (Udhaar), Negative = Advance credit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, phone)
);

-- 4. Measurement Profiles (Permanent Body Cards)
CREATE TYPE garment_type AS ENUM ('MEN_SHALWAR_KAMEEZ', 'MEN_KURTA', 'WAISTCOAT', 'PRINCE_SUIT', 'TROUSER_SHIRT', 'WOMEN_SUIT');

CREATE TABLE measurement_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    profile_name VARCHAR(100) DEFAULT 'Standard Fit',
    garment_type garment_type DEFAULT 'MEN_SHALWAR_KAMEEZ',
    measurements JSONB NOT NULL, -- Key-value pairs matching Section 2.2 notation keys
    style_preferences JSONB NOT NULL, -- Selected cut preferences (collar, daman, pockets)
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Orders & Garment Bookings
CREATE TYPE order_status AS ENUM (
    'BOOKED',
    'FABRIC_RECEIVED',
    'IN_CUTTING',
    'IN_STITCHING',
    'KAJ_BUTTON',
    'PRESSING',
    'READY_FOR_TRIAL',
    'READY_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE payment_status AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'FULLY_PAID');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(64) NOT NULL, -- e.g., DP-2026-0801
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    measurement_profile_id UUID REFERENCES measurement_profiles(id) ON DELETE SET NULL,
    status order_status DEFAULT 'BOOKED',
    garment_type garment_type DEFAULT 'MEN_SHALWAR_KAMEEZ',
    quantity INT DEFAULT 1,
    
    -- Schedule & Deadlines
    booking_date TIMESTAMPTZ DEFAULT NOW(),
    trial_date DATE,
    delivery_date DATE NOT NULL,
    actual_delivery_date TIMESTAMPTZ,
    
    -- Fabric Information
    fabric_provided_by VARCHAR(50) DEFAULT 'CUSTOMER', -- 'CUSTOMER' or 'SHOP'
    fabric_color VARCHAR(100),
    fabric_brand VARCHAR(100),
    fabric_pieces_count INT DEFAULT 1,
    fabric_notes TEXT,
    
    -- Pricing & Financials (PKR)
    stitching_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fabric_charges NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    addons_charges NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Collar buttons, fancy embroidery, lining
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    advance_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_status payment_status DEFAULT 'UNPAID',
    
    -- Workshop Assignments
    assigned_cutter_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    assigned_stitcher_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    
    -- Custom Specs Snapshot at Booking Time (Preserves historical record even if profile updates)
    snapshot_measurements JSONB NOT NULL,
    snapshot_styles JSONB NOT NULL,
    
    barcode_token VARCHAR(64) UNIQUE NOT NULL,
    public_tracking_key UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, order_number)
);

-- 6. Khata & Financial Ledger
CREATE TYPE transaction_type AS ENUM ('ORDER_ADVANCE', 'ORDER_FINAL_PAYMENT', 'MANUAL_CREDIT', 'MANUAL_DEBIT', 'DISCOUNT_ADJUSTMENT');

CREATE TABLE khata_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Production Audit Trail
CREATE TABLE order_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status order_status,
    new_status order_status NOT NULL,
    changed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

```

---

## 4. Lifecycle Pipeline & Workflow State Transitions

```
[ BOOKED ]
    │
    ▼
[ FABRIC_RECEIVED ] (Tag printed & stapled)
    │
    ▼
[ IN_CUTTING ] (Assigned to Master Cutter)
    │
    ▼
[ IN_STITCHING ] (Assigned to Stitcher Unit)
    │
    ▼
[ KAJ_BUTTON ] (Buttonholes, pressing preparation)
    │
    ▼
[ PRESSING ] (Final iron, steam & packaging)
    │
    ├─────────────────────────────┐
    ▼                             ▼
[ READY_FOR_TRIAL ]       [ READY_FOR_DELIVERY ]
    │                             │ (WhatsApp Alert Dispatched)
    └──────────────┬──────────────┘
                   ▼
             [ COMPLETED ] (Balance Settled & Handed Over)

```

---

## 5. WhatsApp URI & Messaging Specification

### 5.1 Deep-Link URL Format

```
[https://wa.me/92](https://wa.me/92){clean_phone}?text={encoded_message}

```

### 5.2 Dynamic Message Templates

#### Template A: Order Confirmation & Advance Receipt

```text
السلام علیکم *{customer_name}* صاحب،
آپ کا سوٹ *{shop_name}* پر بک ہو چکا ہے۔

📋 *آرڈر نمبر:* #{order_number}
👔 *آئٹمز:* {garment_type_ur} ({quantity} عدد)
📅 *ڈیلیوری کی تاریخ:* {delivery_date_formatted}

💰 *کل رقم:* Rs. {total_amount}
💵 *ایڈوانس وصول:* Rs. {advance_paid}
⚠️ *بقیہ رقم:* Rs. {balance_due}

🔍 اپنے آرڈر کی لائیو تیاری چیک کریں:
[https://silaye.com/track/](https://silaye.com/track/){public_tracking_key}

شکریہ!
*{shop_name}*
📞 {shop_phone}

```

#### Template B: Ready for Pickup & Balance Notification

```text
السلام علیکم *{customer_name}* صاحب،
خوشخبری! آپ کا سوٹ تیار ہو چکا ہے اور ٹرائل / وصولی کے لیے شاپ پر موجود ہے۔

📋 *آرڈر نمبر:* #{order_number}
📅 *بکنگ تاریخ:* {booking_date_formatted}
⚠️ *بقیہ واجب الادا رقم:* Rs. {balance_due}

📍 دکان کا پتہ:
{shop_address}

براہ کرم تشریف لا کر اپنا آرڈر وصول فرمائیں۔
*{shop_name}*

```

---

## 6. Offline-First Synchronization Architecture

### 6.1 IndexedDB Local Store (Client Side)

Local offline persistence is managed via an IndexedDB store containing tables mirroring cloud entities:

* `offline_orders`
* `offline_customers`
* `offline_measurements`
* `sync_queue`

### 6.2 Sync Queue Schema

```typescript
interface SyncQueueItem {
  id: string; // UUID
  endpoint: string; // Target API route
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: Record<string, any>;
  created_at: number; // Epoch timestamp
  retry_count: number;
  status: 'PENDING' | 'PROCESSING' | 'FAILED';
  error_message?: string;
}

```

### 6.3 Conflict Resolution Strategy

* **Timestamp-Based Last-Write-Wins (LWW):** Mutation operations carry an ISO client timestamp `client_updated_at`. If the remote record has a newer `updated_at` timestamp from another node, the local client receives the latest remote record and raises a reconciliation notification.
* **Append-Only Khata Ledger:** Financial transactions are strictly append-only. Double-spend or balance desyncs are resolved by summing all historical immutable ledger entries.

---

## 7. Thermal Slip & Barcode Printing Specification

### 7.1 Receipt Formats

* **Standard Widths:** $58\text{ mm}$ ($384\text{ dots/line}$) and $80\text{ mm}$ ($576\text{ dots/line}$).
* **Character Pitch:** Font A ($12\times24$) at 32 characters per line ($58\text{ mm}$) or 48 characters per line ($80\text{ mm}$).

### 7.2 Fabric Tag Structural Layout

```text
+------------------------------------------+
|               SILAYE SLIP                |
|            {SHOP_NAME_UPPER}             |
+------------------------------------------+
| Order: #{ORDER_NUM}     Date: {TODAY}    |
| Cust: {CUSTOMER_NAME}                    |
| Phone: {CUSTOMER_PHONE}                  |
+------------------------------------------+
| ITEM: {GARMENT_TYPE}  QTY: {QUANTITY}    |
| TRIAL: {TRIAL_DATE}  DELV: {DELV_DATE}   |
+------------------------------------------+
|              MEASUREMENTS                |
| L: {LEN}" | C: {CHEST}" | W: {WAIST}"    |
| T: {TEE}" | B: {BAZ}"   | G: {GALA}"     |
| P: {PAN}" | A: {AAS}"   | D: {DAMAN}"    |
+------------------------------------------+
| CUT: {COLLAR_STYLE} | {DAMAN_STYLE}      |
+------------------------------------------+
| Total: Rs.{TOTAL}    Adv: Rs.{ADVANCE}   |
| BAL DUE: Rs.{BALANCE_DUE}                |
+------------------------------------------+
|              ||||||||||||||||            |
|               *DP-2026-0801*             |
+------------------------------------------+

```

```

```
