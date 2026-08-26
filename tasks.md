# tasks.md - Master Sequential Development Checklist

## Phase 1: Project Initialization & Configuration
- [x] 1.1 Initialize Next.js project with TypeScript Strict Mode, Tailwind CSS, and App Router.
- [x] 1.2 Configure `next.config.mjs` for static export (`output: 'export'`, `distDir: 'out'`, `images: { unoptimized: true }`).
- [x] 1.3 Install core dependencies: `lucide-react`, `zod`, `idb`, `clsx`, `tailwind-merge`, `canvas-confetti`.
- [x] 1.4 Setup Google Fonts in `app/layout.tsx` for `Noto_Sans_Arabic` (`--font-urdu-sans`) and `Noto_Nastaliq_Urdu` (`--font-urdu-serif`).
- [x] 1.5 Configure `tailwind.config.ts` and `app/globals.css` with semantic color tokens (Obsidian Dark default, Raw Linen mode, Tailor Gold accents).

---

## Phase 2: Type System, Schemas & Local State Foundations
- [x] 2.1 Create `@/types/tailor.ts` declaring interfaces for `Customer`, `MeasurementProfile`, `GarmentOrder`, `KhataTransaction`, and `OrderStatusLog`.
- [x] 2.2 Create Zod validation schemas in `@/lib/validations/tailor.ts` for customer details, fractional measurements, and order creation.
- [x] 2.3 Implement initial mock seed dataset in `@/lib/mock-data.ts` containing realistic Pakistani tailor records and orders for offline development.

---

## Phase 3: Design Tokens & Reusable UI Primitives
- [x] 3.1 Build base UI primitives inside `components/ui/` (`Button`, `Input`, `Card`, `Badge`, `Dialog`, `DropdownMenu`, `Tabs`).
- [x] 3.2 Build `components/tailor/fractional-pill-selector.tsx` (1-tap quarter-inch modifiers: `.00`, `.25`, `.50`, `.75`).
- [x] 3.3 Build `components/tailor/garment-style-chips.tsx` (Collar cuts: Full Ban / Sherwani / Shirt, Daman: Round / Square, Pocket configurations).
- [x] 3.4 Build `components/layout/app-shell.tsx` (Top command bar with customer search, offline sync indicator, and navigation sidebar).

---

## Phase 4: Bilingual Measurement Intake Engine
- [x] 4.1 Build `components/tailor/measurement-intake-form.tsx` featuring standard keyboard `Tab`/`Enter` cycling.
- [x] 4.2 Add bilingual Urdu/English labels (*لمبائی*, *چھاتی*, *کمر*, *تیرا*, *بازو*, *گلا*, *دامن*, *پائینچہ*, *آسن*) with baseline alignment.
- [x] 4.3 Implement customer auto-lookup by mobile number to populate existing saved measurement profiles.
- [x] 4.4 Build optional/experimental visual mannequin measurement pad toggle (`components/tailor/visual-mannequin-pad.tsx`).

---

## Phase 5: Workshop Production Pipeline (Kanban Queue)
- [x] 5.1 Build `components/tailor/pipeline-board.tsx` displaying columns: `Booked`, `Cutting`, `Stitching`, `Kaj & Button`, `Pressing`, `Ready`, `Delivered`.
- [x] 5.2 Implement drag-and-drop or 1-tap stage advancement with automated status audit logging.
- [x] 5.3 Add urgent deadline badges (amber at 48 hours, pulsing red on delivery date, Eid Rush priority tags).

---

## Phase 6: 1-Click WhatsApp & Receipt Simulation
- [x] 6.1 Create `@/lib/whatsapp.ts` with phone number sanitization regex for Pakistani formats (`03xx` -> `923xx`) and URI builder.
- [x] 6.2 Build `components/tailor/whatsapp-receipt-modal.tsx` with live interactive message preview.
- [x] 6.3 Implement dispatch handlers supporting Web (`window.open`), Desktop Electron (`openExternal`), and Mobile Capacitor (`AppLauncher`).

---

## Phase 7: Khata & Financial Ledger Engine
- [x] 7.1 Build `components/tailor/khata-ledger-view.tsx` listing total market receivables (*Udhaar*), advance credits, and customer balance cards.
- [x] 7.2 Implement append-only transaction entry modal (Advance deposit, Final payment collection, Manual credit adjustment).
- [x] 7.3 Build 1-tap WhatsApp payment reminder generator with personalized outstanding balance templates.

---

## Phase 8: ESC/POS Thermal Printing & Fabric Tag Generator
- [x] 8.1 Implement `@/lib/escpos.ts` builder for 58mm fabric staple tags and 80mm customer booking receipts.
- [x] 8.2 Build printable HTML/CSS fallback component with `@media print` rules for 58mm/80mm roll dimensions.
- [x] 8.3 Integrate barcode generation (Code 128) embedding the unique order token on printable tags.

---

## Phase 9: Offline-First IndexedDB Synchronization
- [x] 9.1 Implement `initLocalDatabase()` in `@/lib/offline-db.ts` utilizing `idb` with stores for customers, measurements, orders, and mutation queue.
- [x] 9.2 Implement `SyncCoordinator` class to enqueue mutations locally and replay them via FIFO ordering upon network reconnect.
- [x] 9.3 Add online/offline event listeners and heartbeat polling with visual UI status pill in the top command bar.

---

## Phase 10: Landing Page & Public Customer Tracking Portal
- [x] 10.1 Assemble luxury editorial marketing page (`app/page.tsx`) matching the dual-horizon theme (Obsidian Dark Hero, Raw Linen Bento Grid, Testimonials, Pricing).
- [x] 10.2 Build public order tracking page (`app/track/[orderId]/page.tsx`) enabling customers to view live tailoring progress without logging in.
- [x] 10.3 Refine global CSS with ambient lighting, carbon/titanium glassmorphism, and luxury typography.
- [x] 10.4 Overhaul Bento Grid and Pricing cards with tactile borders and premium lighting.
- [x] 10.5 Redesign Order Tracking portal into a mobile-first vertical timeline.
- [x] 10.6 Overhaul internal authenticated dashboard UI primitives (Card, Input, AppShell, Scrollbars) with dark carbon & liquid titanium glassmorphism.
- [x] 10.7 Redesign New Booking page (`app/orders/new/page.tsx`) with Progressive Disclosure (Tabs) and Sticky Order Summary & Payment Ledger sidebar, dense 3-column measurement grid, and glowing style chips.

---

## Phase 10.5: Internal UX Architecture Rescue
- [x] 10.5.1 Build the calm "Command Dashboard" (Home view) for high-level metrics.
- [x] 10.5.2 Replace the Pipeline Kanban with a List View + Slide-Out Inspector Drawer.
- [x] 10.5.3 Refactor the "New Booking" page using Progressive Disclosure Tabs.
- [x] 10.5.3.2 Refactor measurement intake fractions (0, ¼, ½, ¾) and style preference chips into sleek inline pill tags with multi-select pocket choices and human-readable bilingual strings.
- [x] 10.5.3.3 Overhaul Measurement Intake Form into a Card-Free 2-Column Ledger with uncrushable Fractional Selector segmented controls, dual-input decimal synchronization, and keyboard navigation.
- [x] 10.5.3.4 Fix measurement label squishing on 2-column grid: restructure MeasurementRow into a 2-tier cardless stack and enable fluid fractional pill controls.

---

## Phase 10.8: PostgreSQL / Supabase Schema Migrations & Serverless Client Layer
- [x] 10.8.1 Create production-ready PostgreSQL migration `supabase/migrations/20260825000000_init_silaye_schema.sql` with native `gen_random_uuid()`, tables, indexes, triggers, and RLS policies.
- [x] 10.8.2 Implement serverless database client adapter `lib/db.ts` with typed repository methods for customers, measurements, orders, and khata ledger.
- [x] 10.8.3 Purge mock data auto-seeding in `lib/offline-db.ts` behind `NEXT_PUBLIC_SEED_MOCK_DATA === 'true'` environment flag.
- [x] 10.8.4 Wire `lib/sync-coordinator.ts` to dispatch queued mutations to PostgreSQL repositories when online.
- [x] 10.8.5 Build automated verification test suite `scripts/verify_db.ts` with dotenv auto-loading and comprehensive assertions.

---

## Phase 11: Cross-Platform Native Scaffolding
- [ ] 11.1 Scaffold Capacitor configuration (`capacitor.config.ts`) and Android project assets (`npx cap add android`).
- [ ] 11.2 Scaffold Electron main and preload processes (`electron/main.cjs`, `electron/preload.cjs`).
- [ ] 11.3 Configure `package.json` with build scripts for `desktop:build` (Electron NSIS installer) and `mobile:sync` (Capacitor Android).
- [ ] 11.4 Setup GitHub Actions CI/CD workflow (`.github/workflows/build-artifacts.yml`) for automated cloud compilation.

---

## Phase 12: Production Verification & Build Checks
- [ ] 12.1 Run full typecheck (`npx tsc --noEmit`) and resolve any interface or prop discrepancies.
- [ ] 12.2 Run static export build (`npm run build`) to verify `out/` directory generation with zero runtime errors.
- [ ] 12.3 Verify responsive rendering on mobile viewports (Android Webview) and desktop window dimensions (Electron).
