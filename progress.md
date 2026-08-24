# progress.md - Project Execution History & Run Logs

## Phase 1: Project Initialization & Configuration (Completed)
* **Date:** 2026-08-24
* **Tasks Completed:**
  - `1.1` Initialized Next.js project with TypeScript Strict Mode (`tsconfig.json`), Tailwind CSS, and App Router.
  - `1.2` Configured `next.config.mjs` with static export (`output: 'export'`, `distDir: 'out'`, `trailingSlash: true`, `images: { unoptimized: true }`).
  - `1.3` Installed core runtime and dev dependencies: `lucide-react`, `zod`, `idb`, `clsx`, `tailwind-merge`, `canvas-confetti`, `concurrently`, `wait-on`, and type declarations.
  - `1.4` Configured Google Fonts in `app/layout.tsx` (`Geist Sans`, `Noto_Sans_Arabic` -> `--font-urdu-sans`, `Noto_Nastaliq_Urdu` -> `--font-urdu-serif`).
  - `1.5` Configured `tailwind.config.ts` and `app/globals.css` with semantic color tokens (Obsidian Dark `#0B0C0E` default, Raw Linen `#F5F2EB`, Tailor Gold accents, and Urdu baseline classes).

* **Active File Changes:**
  - `package.json`
  - `package-lock.json`
  - `tsconfig.json`
  - `next.config.mjs`
  - `postcss.config.mjs`
  - `tailwind.config.ts`
  - `app/globals.css`
  - `app/layout.tsx`
  - `app/page.tsx`
  - `lib/utils.ts`
  - `tasks.md`
  - `progress.md`

* **Verification Results:**
  - `npx tsc --noEmit`: 0 errors.
  - `npm run build`: Static export compiled successfully, generating static distribution into `out/`.

* **Next Immediate Task:**
  - Phase 2 (Completed)

---

## Phase 2: Type System, Schemas & Local State Foundations (Completed)
* **Date:** 2026-08-24
* **Tasks Completed:**
  - `2.1` Created `@/types/tailor.ts` declaring strict interfaces and enums for `GarmentType`, `OrderStatus`, `PaymentStatus`, `StaffRole`, `CollarStyle`, `DamanStyle`, `PocketConfig`, `FrontPatti`, `BottomType`, `StitchType`, `CuffStyle`, `TransactionType`, `ShalwarKameezMeasurements`, `StylePreferences`, `Shop`, `Staff`, `Customer`, `MeasurementProfile`, `GarmentOrder`, `KhataTransaction`, `OrderStatusLog`, and `SyncQueueItem` with zero `any` usage.
  - `2.2` Created Zod validation schemas in `@/lib/validations/tailor.ts` for customer creation/updates, quarter-inch fractional measurements (`.00`, `.25`, `.50`, `.75`), Pakistani phone formats (`03XX-XXXXXXX`, `+923XXXXXXXXX`), order booking, status transitions, and financial calculations (`calculateOrderFinancials`).
  - `2.3` Implemented realistic mock seed dataset in `@/lib/mock-data.ts` for Wah Cantt locale containing 1 shop, 3 staff members, 3 customers with active Khata balances (Udhaar, advance credit, settled), 3 garment orders across workflow pipeline stages, 2 khata transactions, and 12 order status audit logs.

* **Active File Changes:**
  - `types/tailor.ts`
  - `lib/validations/tailor.ts`
  - `lib/mock-data.ts`
  - `tasks.md`
  - `progress.md`

* **Verification Results:**
  - `npx tsc --noEmit`: 0 errors.
  - Runtime validation suite (`verify_phase2.ts`): All quarter-inch step validations, Pakistani phone regexes, and mock dataset entities validated successfully with zero errors.
  - `npm run build`: Production static export built successfully to `out/`.

* **Next Immediate Task:**
  - Phase 3 (Completed)

---

## Phase 3: Design Tokens & Reusable UI Primitives (Completed)
* **Date:** 2026-08-24
* **Tasks Completed:**
  - `3.1` Built `components/ui/` primitives: `Button` (5 variants × 4 sizes, `isLoading` spinner, `forwardRef`), `Input` (label/error/hint/leftIcon/rightIcon slots, `forwardRef`), `Card` (6 sub-components: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `elevated` prop), `Badge` (4 generic + 5 status-lifecycle variants), `Dialog` (native `<dialog>` via React portal, controlled/uncontrolled, Escape key + overlay-click-to-close), `Tabs` (controlled/uncontrolled, full ARIA semantics), `index.ts` barrel re-exporting all six.
  - `3.2` Built `components/tailor/fractional-pill-selector.tsx`: 1-tap `.00/.25/.50/.75` pill buttons with `tabIndex={-1}`, floating-point safe active detection, `aria-pressed` ARIA, semantic gold active state.
  - `3.3` Built `components/tailor/garment-style-chips.tsx`: Bilingual EN/UR selectable chips for `CollarStyle` (5 options), `DamanStyle` (2 options), `PocketConfig` (5 options), `FrontPatti` (4 options). Urdu labels use `font-urdu-sans` + `dir="rtl"` + `leading-urdu-data` (1.65) to prevent vertical clipping.
  - `3.4` Built `components/layout/app-shell.tsx`: `'use client'` master shell with sticky command bar (search + `/` shortcut, `ConnectionPill` online/offline listener, New Booking CTA, Settings), collapsible sidebar (CSS `transition-[width]`, icon-only collapsed mode), and scrollable `<main>` viewport.

* **Active File Changes:**
  - `components/ui/button.tsx` [NEW]
  - `components/ui/input.tsx` [NEW]
  - `components/ui/card.tsx` [NEW]
  - `components/ui/badge.tsx` [NEW]
  - `components/ui/dialog.tsx` [NEW]
  - `components/ui/tabs.tsx` [NEW]
  - `components/ui/index.ts` [NEW]
  - `components/tailor/fractional-pill-selector.tsx` [NEW]
  - `components/tailor/garment-style-chips.tsx` [NEW]
  - `components/layout/app-shell.tsx` [NEW]
  - `tasks.md`
  - `progress.md`

* **Verification Results:**
  - `npx tsc --noEmit`: 0 errors.

* **Next Immediate Task:**
  - Phase 4 (Completed)

---

## Phase 4: Bilingual Measurement Intake Engine (Completed)
* **Date:** 2026-08-24
* **Tasks Completed:**
  - `4.1` Built `components/tailor/measurement-intake-form.tsx`: Bilingual 17-field measurement form (Kameez 12 + Shalwar 5) with `CYCLE_FIELD_ORDER` array governing `Enter`-key sequential focus across 9 primary fields (`kameez_length → chest → waist → shoulder_teera → sleeve_length → neck_gala → daman_width → shalwar_length → paincha → aasan`). Optional fields grouped under `<details>` disclosure. `FractionalPillSelector` bound with `tabIndex={-1}` — never steals input focus.
  - `4.2` Implemented full bilingual labels on every `MeasurementRow`: EN label (standard sans, above) + UR label (`font-urdu-sans`, `dir="rtl"`, `lang="ur"`, `leading-urdu-data: 1.65`) below. Numeric values wrapped in `<bdi dir="ltr">` for bidirectional isolation. Section headings use `font-urdu-serif` with `leading-urdu-display: 2.2`. GarmentStyleChips integrated within the Kameez section for cut/collar/daman/pocket selection.
  - `4.3` Implemented customer auto-lookup in `app/orders/new/page.tsx`: `useEffect` fires on 10–11 digit phone entry, matches against `mockCustomers` (primary + alternate phone). On match: autofills name, address, default `MeasurementProfile`, all measurements, and style preferences. Shows "Profile Found" badge with Khata balance indicator (Udhaar/Credit/Settled). "New Revision" button clears profile lock without clearing the found customer. Unknown numbers display advisory note for new customer entry.
  - `4.4` Built `components/tailor/visual-mannequin-pad.tsx`: Pure inline SVG body silhouette (viewBox 120×310, static-export compatible) with 9 named body region paths (`head_neck`, `shoulder`, `torso_upper`, `torso_mid`, `torso_lower`, `arm_left`, `arm_right`, `hip_aasan`, `lower_leg`). `REGION_FIELD_MAP` maps each `ShalwarKameezMeasurements` key to its anatomical region. Active region renders gold `stroke` + `fill` glow with `transition-all duration-300`. Sticky in sidebar on `sm:` breakpoints. Toggle button (`Eye` / `EyeOff`) controls visibility.

* **Active File Changes:**
  - `components/tailor/measurement-intake-form.tsx` [NEW]
  - `components/tailor/visual-mannequin-pad.tsx` [NEW]
  - `app/orders/new/page.tsx` [NEW]
  - `tasks.md`
  - `progress.md`

* **Verification Results:**
  - `npx tsc --noEmit`: 0 errors. (Fixed `BadgeVariant` strings: `overdue` → `status-overdue`, `ready` → `status-ready`, `stitching` → `status-stitching`, `cutting` → `status-cutting`, `booked` → `status-booked` to match existing `Badge` component type union.)

* **Next Immediate Task:**
  - Phase 5 (Completed)

---

## Phase 5: Workshop Production Pipeline & Kanban Queue (Completed)
* **Date:** 2026-08-24
* **Tasks Completed:**
  - `5.1` Built `components/tailor/pipeline-board.tsx`: Horizontal scrolling Kanban board visualizer with 7 lifecycle stages (`Booked` ➔ `Cutting` ➔ `Stitching` ➔ `Kaj & Button` ➔ `Pressing` ➔ `Ready for Delivery` ➔ `Completed`). Each column header displays live order count, total PKR value in that stage, bilingual Urdu labels (`بک شدہ`, `کٹائی`, `سلائی`, `کاج اور بٹن`, `استری و پیکنگ`, `تیار شدہ`, `مکمل / حوالہ`), domain stage icons, and semantic CSS accent styling.
  - `5.2` Built `components/tailor/order-card.tsx` with 1-tap quick action stage advancement and rollback triggers. Optimistically updates order status and appends timestamped `OrderStatusLog` audit trail records with transition notes.
  - `5.3` Implemented dynamic delivery urgency indicators on each card (`safe` > 48h neutral badge, `warning` 24–48h amber badge, `critical` today/overdue pulsing red priority badge), Eid Rush / urgent order tags, fabric thumbnail swatches with color & brand notes, assigned Master Cutter and Stitcher name tags, and outstanding financial balance indicators with colored payment badges.
  - `5.4` Built primary workshop queue dashboard in `app/orders/page.tsx`: Unified Kanban / List View toggling, top metric summary ribbon (Active Queue, Due Today, Overdue, Ready for Pickup, Completed), 7-stage filter pills bar, real-time search across customer names, phone numbers, and order numbers (`#DP-2026-XXXX`), and instant urgency filter chips ("Today's Deliveries", "Ready for Pickup", "Overdue", Staff craftsman filter).
  - `5.5` Enriched `lib/mock-data.ts` with 4 additional orders across all 7 pipeline stages, 2 new customer profiles with Khata records, and historical progression audit logs.

* **Active File Changes:**
  - `components/tailor/order-card.tsx` [NEW]
  - `components/tailor/pipeline-board.tsx` [NEW]
  - `app/orders/page.tsx` [NEW]
  - `lib/mock-data.ts` [MODIFIED]
  - `components/layout/app-shell.tsx` [MODIFIED]
  - `tasks.md` [MODIFIED]
  - `progress.md` [MODIFIED]

* **Verification Results:**
  - `npx tsc --noEmit`: 0 type errors.
  - `npm run build`: Static export build compiled successfully, generating `/orders` and `/orders/new` into `out/` with zero runtime or compilation errors.

* **Next Immediate Task:**
  - Phase 6 (Completed)

---

## Phase 6: 1-Click WhatsApp Deep-Link Engine & Receipt Modal (Completed)
* **Date:** 2026-08-24
* **Tasks Completed:**
  - `6.1` Created `@/lib/whatsapp.ts`:
    * Implemented Pakistani phone number sanitization regex engine (`sanitizePakistaniPhone`) handling all 8+ formats (`03001234567`, `+923001234567`, `923001234567`, `3001234567`, `0300-1234567`, `+92 300 1234567`, `00923001234567`, `(0300) 1234567`) strictly into canonical `923XXXXXXXXX`.
    * Implemented `isValidPakistaniPhone` and `formatPakistaniPhoneDisplay` (`+92 3XX XXXXXXX`).
    * Built dynamic bilingual Urdu/English message template generators:
      1. Booking & Advance Deposit Receipt (`generateBookingReceiptMessage`).
      2. Ready for Pickup / Trial Alert (`generateOrderReadyMessage`).
      3. Khata / Udhaar Debt Balance Reminder (`generateKhataReminderMessage`).
    * Built URI builder `buildWhatsAppLink` using standard `https://wa.me/{sanitized_phone}?text={encoded_message}` format with proper line break (`%0A`) and Arabic/Urdu UTF-8 encoding.
  - `6.2` Built `components/tailor/whatsapp-receipt-modal.tsx`:
    * Interactive modal dialog utilizing `@/components/ui/dialog` and `@/components/ui/tabs`.
    * Tabbed template switcher (`Booking`, `Ready Alert`, `Khata Balance`).
    * Dark terminal WhatsApp chat bubble preview card (`#0c1317` container with `#005c4b` emerald bubble, timestamp, double blue tick indicators, and RTL Urdu script).
    * Custom editable message toggle mode with char counter.
    * 1-tap "Copy Message" with clipboard API & "Copied!" checkmark feedback.
    * 1-tap "Send on WhatsApp" with WhatsApp brand green styling and temporary dispatch animation.
    * Customer phone verification badge & fallback inline editor for missing/invalid numbers.
  - `6.3` Implemented cross-platform dispatch controller `openWhatsAppLink`:
    * Electron Desktop: `window.electronAPI.openExternal(url)`.
    * Mobile Capacitor: dynamic `@capacitor/app-launcher` `AppLauncher.openUrl({ url })`.
    * Web Browser: `window.open(url, '_blank', 'noopener,noreferrer')`.
    * Integrated WhatsApp modal triggers across `components/tailor/order-card.tsx`, `components/tailor/pipeline-board.tsx`, `app/orders/page.tsx`, and `app/orders/new/page.tsx` (auto-open upon order booking with celebration confetti).

* **Active File Changes:**
  - `lib/whatsapp.ts` [NEW]
  - `components/tailor/whatsapp-receipt-modal.tsx` [NEW]
  - `scripts/verify_phase6.ts` [NEW]
  - `components/tailor/order-card.tsx` [MODIFIED]
  - `components/tailor/pipeline-board.tsx` [MODIFIED]
  - `app/orders/page.tsx` [MODIFIED]
  - `app/orders/new/page.tsx` [MODIFIED]
  - `tasks.md` [MODIFIED]
  - `progress.md` [MODIFIED]

* **Verification Results:**
  - `npx --yes tsx scripts/verify_phase6.ts`: All 35 unit test assertions passed with 0 failures.
  - `npx tsc --noEmit`: 0 type errors.
  - `npm run build`: Static export compiled cleanly, generating all static HTML pages and asset bundles into `out/` with zero runtime or compilation errors.

* **Next Immediate Task:**
  - Phase 7 (Completed)

---

## Phase 7: Khata & Financial Ledger Engine (Completed)
* **Date:** 2026-08-24
* **Tasks Completed:**
  - `7.1` Built `components/tailor/khata-ledger-view.tsx`:
    * Master market financial dashboard displaying aggregated market metrics (Total Receivables / Udhaar — *واجب الادا ادھار*, Advance Deposits Held — *ایڈوانس رقم*, Net Market Position, Active Debtors Count, and Settled Account Count).
    * Dynamic customer balance card grid and compact table view with search (Name, Phone, City), filter tabs (All, Debtors, Advance Credits, Settled), and sorting (Highest Debt, Highest Advance, Name A-Z, Spent, Orders).
    * High-contrast status badges: Rose/Red for pending debt (`text-rose-400`), Emerald/Green for advance credits (`text-emerald-400`), Slate for settled (`text-muted-foreground`).
    * Full bidirectional isolation wrapping all monetary figures with `<bdi dir="ltr">Rs. X,XXX</bdi>`.
  - `7.2` Built `components/tailor/khata-entry-modal.tsx`:
    * Append-only transaction entry modal supporting all 5 domain transaction types: `MANUAL_CREDIT`, `MANUAL_DEBIT`, `ORDER_ADVANCE`, `ORDER_FINAL_PAYMENT`, `DISCOUNT_ADJUSTMENT`.
    * Real-time dynamic balance projection widget (Current Balance $\to$ Delta $\to$ Balance After) calculating exact resulting balances before committing.
    * Quick amount modifiers (`+500`, `+1,000`, `+2,000`, `+5,000`, `Pay Full Balance`) and quick payment method notes chips.
    * Optional order linkage and staff attribution.
  - `7.3` Built `components/tailor/customer-khata-detail-modal.tsx` and 1-tap WhatsApp payment reminder integration:
    * Comprehensive chronological customer statement viewer and audit trail.
    * Isolated Debit (`+Rs. X,XXX` in rose) and Credit (`-Rs. X,XXX` in emerald) columns with running `balance_after`.
    * 1-Tap "Send WhatsApp Reminder" trigger invoking `generateKhataReminderMessage()` with sanitized customer phone number and exact outstanding balance.
    * Built full `app/khata/page.tsx` client page wrapped in `AppShell activeRoute="/khata"`.
    * Updated `components/ui/badge.tsx` with `status-advance-credit` and `status-udhaar-pending` variants.

* **Active File Changes:**
  - `components/ui/badge.tsx` [MODIFIED]
  - `components/tailor/khata-entry-modal.tsx` [NEW]
  - `components/tailor/customer-khata-detail-modal.tsx` [NEW]
  - `components/tailor/khata-ledger-view.tsx` [NEW]
  - `app/khata/page.tsx` [NEW]
  - `scripts/verify_phase7.ts` [NEW]
  - `tasks.md` [MODIFIED]
  - `progress.md` [MODIFIED]

* **Verification Results:**
  - `npx --yes tsx scripts/verify_phase7.ts`: All math invariants, Zod schemas, aggregate metrics, and WhatsApp reminder assertions passed with 0 failures.
  - `npx tsc --noEmit`: 0 type errors.
  - `npm run build`: Static export compiled cleanly, generating `/khata` (14 kB) into `out/` with zero runtime or compilation errors.

* **Next Immediate Task:**
  - Phase 8 (Completed)

---

## Phase 8: ESC/POS Thermal Printing & Fabric Tag Generator (Completed)
* **Date:** 2026-08-24
* **Tasks Completed:**
  - `8.1` Implemented `@/lib/escpos.ts`:
    * Low-level ESC/POS byte builder utility (`EscPosBuilder`) with pure `Uint8Array` byte manipulation compatible with Web browser, Node.js, WebUSB, and Electron POS direct output.
    * Command set constants: `INIT` (`ESC @`), `CUT_FULL`/`CUT_PARTIAL` (`GS V`), `ALIGN` (`ESC a`), `BOLD` (`ESC E`), `DOUBLE_HEIGHT`/`DOUBLE_SIZE` (`GS !`), `FEED_LINES` (`ESC d`), and `BARCODE_CODE128` (`GS k 73`).
    * Implemented 58mm Fabric Staple Tag generator (`generateFabricTagSlipText` & `buildFabricTagBinary`) formatted strictly for 32-character line width: Shop branding header, Order #, Customer details, Deadlines (`[URGENT]` flags), 3x3 Measurement Matrix (`L | C | W`, `T | B | G`, `P | A | D` with fractional inches), Cut & Pocket specs, Total/Advance/Balance Due financials, and Code 128 barcode token.
    * Implemented 80mm Customer Booking Invoice generator (`generateCustomerInvoiceSlipText` & `buildCustomerInvoiceBinary`) formatted strictly for 48-character line width: Full shop branding with address and phone, itemized table (Description, Qty, Rate, Amount), Subtotal, Advance deposit, Net Balance Due upon pickup, Terms of service, and public online tracking URL.
    * Implemented browser blob binary download utility (`downloadEscPosBinaryFile`) for `.bin` file export.
  - `8.2` Built printable HTML/CSS fallback component with `@media print` rules:
    * Injected `@media print` rules in `app/globals.css` setting `@page { margin: 0; size: auto; }`, isolating `.printable-thermal-slip` (`.slip-58mm` at max-width 54mm, `.slip-80mm` at max-width 76mm), hiding app navigation, headers, footers, and modal overlays, and enforcing high-contrast monochrome printing.
    * Built `components/tailor/thermal-slip-modal.tsx`: Interactive preview modal with 58mm/80mm toggle, 1-tap browser print (`window.print()`), raw `.bin` export, and text clipboard copy.
    * Integrated thermal slip modal into `components/tailor/order-card.tsx`, `components/tailor/pipeline-board.tsx`, `app/orders/page.tsx`, and `app/orders/new/page.tsx`.
    * Built dedicated Printing Counter Station in `app/print/page.tsx` with instant search, queue summary ribbons, urgency filters, multi-order batch printing, and live slip preview.
  - `8.3` Integrated barcode generation:
    * Built `components/tailor/barcode-renderer.tsx`: Self-contained Code 128 (Set B) pure TypeScript encoder (107 pattern table, start code 104, checksum modulo 103, stop code 106, quiet zones) rendering crisp SVG vector bars and optional HTML5 Canvas bitmaps without external dependencies.

* **Active File Changes:**
  - `lib/escpos.ts` [NEW]
  - `components/tailor/barcode-renderer.tsx` [NEW]
  - `components/tailor/thermal-slip-modal.tsx` [NEW]
  - `app/print/page.tsx` [NEW]
  - `scripts/verify_phase8.ts` [NEW]
  - `app/globals.css` [MODIFIED]
  - `components/tailor/order-card.tsx` [MODIFIED]
  - `components/tailor/pipeline-board.tsx` [MODIFIED]
  - `app/orders/page.tsx` [MODIFIED]
  - `app/orders/new/page.tsx` [MODIFIED]
  - `tasks.md` [MODIFIED]
  - `progress.md` [MODIFIED]

* **Verification Results:**
  - `npx --yes tsx scripts/verify_phase8.ts`: 48/48 test assertions passed with 0 failures (Code 128 module lengths, ESC/POS byte sequences, 32-char and 48-char layout constraints, 3x3 measurement matrix, and binary stream integrity).
  - `npx tsc --noEmit`: 0 type errors.
  - `npm run build`: Static export compiled cleanly, generating `/print` (4.64 kB) and all other static routes into `out/` with zero runtime or compilation errors.

* **Next Immediate Task:**
  - Phase 9 (Task 9.1): Implement `initLocalDatabase()` in `@/lib/offline-db.ts` utilizing `idb` with stores for customers, measurements, orders, and mutation queue.

---

## Phase 10: Landing Page & Public Customer Tracking Portal (Completed)
* **Date:** 2026-08-24
* **Tasks Completed:**
  - `10.1` Assembled full 7-section luxury editorial marketing landing page in `app/page.tsx`:
    * Section 1: `HeroSection` — Obsidian Dark, animated count-up proof metrics (2.8M+ tracked, 98K+ suits, zero lost orders), Nastaliq Urdu subtitle, editorial serif H1, floating glass workshop preview card, ambient radial gold glow.
    * Section 2: `BentoGrid` — Raw Linen (`.theme-linen`) 6-card bento grid (Measurement Vault with fractional pill preview, WhatsApp bubble, Offline Sync status, ESC/POS thermal slip, Khata balance widget, Eid Rush kanban stages). Cards 1 & 6 span 2 columns.
    * Section 3: Paradigm Shift — Inline side-by-side comparison (Notebook Day vs Silaye Way).
    * Section 4: Mobile Showcase — Pure CSS phone frame with embedded measurement form + kanban mini-strip.
    * Section 5: Testimonials — Raw Linen 3-card bilingual (Urdu + English) quote cards.
    * Section 6: `PricingSection` — 3-tier PKR pricing (Solo Master Rs.1,500 / Multi-Counter Rs.2,800 / Enterprise Rs.7,000) with Monthly/Annual billing toggle (−20% annual). Professional tier highlighted with gold badge.
    * Section 7: Footer CTA — Nastaliq Urdu H2 + editorial Latin H2, CTA buttons, bilingual site footer.
  - `10.2` Built public order tracking portal:
    * `app/track/[orderId]/page.tsx`: Server Component page with `generateStaticParams()` pre-rendering all order slugs (order_number + public_tracking_key) for `output: 'export'` compatibility.
    * `components/track/order-tracking-view.tsx`: Client Component (`'use client'`) resolving order by `useParams()` against `mockOrders` using order_number OR public_tracking_key lookup.
    * `components/track/order-progress-stepper.tsx`: 5-step visual production timeline (Booked → In Cutting → In Stitching → Ready for Pickup → Delivered). Pulsing gold ring on active step, estimated countdown pill, bilingual Urdu labels, responsive horizontal (sm+) and vertical (mobile) layouts.
    * Privacy isolation: Shows only order number, garment type, stage, trial date, delivery date, balance_due for that order, shop contact. Hides customer phone, address, measurements, full khata history.
    * WhatsApp CTA pre-populates `wa.me` link with order number inquiry template.

* **Active File Changes:**
  - `app/page.tsx` [MODIFIED — full rewrite]
  - `components/landing/hero-section.tsx` [NEW]
  - `components/landing/bento-grid.tsx` [NEW]
  - `components/landing/pricing-section.tsx` [NEW]
  - `app/track/[orderId]/page.tsx` [NEW]
  - `components/track/order-tracking-view.tsx` [NEW]
  - `components/track/order-progress-stepper.tsx` [NEW]
  - `tasks.md` [MODIFIED]
  - `progress.md` [MODIFIED]

* **Verification Results:**
  - `npx tsc --noEmit`: 0 type errors. (Fixed: apostrophe in single-quoted string literal in `app/page.tsx`; split dynamic route into Server Component page + Client Component view to satisfy `output: 'export'` `generateStaticParams` requirement.)
  - `npm run build`: Static export compiled successfully. 22/22 pages generated. Route manifest:
    * `/` (7.59 kB) — Landing page [Static]
    * `/track/[orderId]` (5.21 kB) — Order tracker [SSG, generateStaticParams]
      * `/track/DP-2026-0801`, `/track/DP-2026-0802`, and 11 more paths pre-rendered.

* **Next Immediate Task:**
  - Phase 9 (not yet started): Implement `initLocalDatabase()` in `@/lib/offline-db.ts`.


