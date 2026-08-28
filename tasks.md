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

## Phase A: Enterprise Multi-Tenant Supabase Architecture (Phase A, Sub-Phase 1)
- [x] A.1.1 Clean Dependencies: Uninstall `@neondatabase/serverless` and install `@supabase/supabase-js`.
- [x] A.1.2 Create Atomic Khata RPC migration `supabase/migrations/20260825000001_khata_rpc.sql` (`append_khata_transaction`).
- [x] A.1.3 Create guarded singleton Supabase client `lib/supabase/client.ts` with static-export SSR safety.
- [x] A.1.4 Refactor `lib/db.ts` to Supabase query chaining and RPC, with strict types and RLS comments.
- [x] A.1.5 Update `lib/sync-coordinator.ts` mutation replay through Supabase repositories.
- [x] A.1.6 Update `scripts/verify_db.ts` test suite and verify `npx tsc --noEmit` & static export.
- [x] A.1.7 Zero-Trust Khata RPC Refactor: Server-side balance calculation with row-level locking (`FOR UPDATE`) in `append_khata_transaction`.

---

## Phase A: Authentication, RLS Lockdown & Database Integrity Patches (Phase A, Sub-Phase 2)
- [x] A.2.1 Create Database Integrity Patch `supabase/migrations/20260825000002_security_patches.sql` with foreign key `ON DELETE RESTRICT` on customer history, search_path isolation, cross-tenant caller auth, row-level tenant locking, and positive amount guards in `append_khata_transaction` RPC.
- [x] A.2.2 Lockdown Row Level Security (RLS) across `customers`, `measurement_profiles`, `garment_orders`, and `khata_transactions` with strict `USING (shop_id = auth.uid()) WITH CHECK (shop_id = auth.uid())` policies.
- [x] A.2.3 Extend `lib/supabase/client.ts` with session and lifecycle methods (`getSession()`, `getCurrentUser()`, `signOut()`, `onAuthStateChange()`).
- [x] A.2.4 Build bespoke tailor Auth screen at `app/(auth)/login/page.tsx` with email/password login, registration, bilingual Urdu/English labels, and offline bypass.
- [x] A.2.5 Update `components/layout/app-shell.tsx` with session check on mount, public route whitelist (skipping `/login`, `/track/*`), redirect on unauthenticated sessions, and Sign Out action in sidebar & mobile drawer.
- [x] A.2.6 Update automated verification suite `scripts/verify_db.ts` and verify 0 type errors (`npx tsc --noEmit`) and successful static build (`npm run build`).

---

## Phase B: Core Architecture Patches & JWT Sync Polish (Phase B, Sub-Phase 1)
- [x] B.1.1 Create RPC Security Hotfix migration `supabase/migrations/20260825000003_rpc_auth_patch.sql` replacing `append_khata_transaction` to eliminate NULL bypass exploit and verify `shop_members` membership.
- [x] B.1.2 Implement JWT Token Refresh & `AUTH_REQUIRED` state in `SyncCoordinator` (`lib/sync-coordinator.ts`) and `lib/supabase/client.ts` (`refreshSession()`), preventing retry limit burnout on expired sessions.
- [x] B.1.3 Create Future-Proof RLS Infrastructure migration `supabase/migrations/20260825000004_shop_members_rls.sql` with `shop_members` table, `EXISTS (SELECT 1 FROM shop_members ...)` RLS policies across all 4 tables, and automatic user provisioning trigger on `auth.users`.
- [x] B.1.4 Update ConnectionPill in `components/layout/app-shell.tsx` with dedicated `AUTH_REQUIRED` warning badge and direct login re-authentication link.
- [x] B.1.5 Update automated database & sync verification suite `scripts/verify_db.ts` (29/29 tests passed), verify 0 TypeScript type errors (`npx tsc --noEmit`), and successful Next.js static build (`npm run build`).

---

## Phase B: RLS Recursion Patch & Mobile UI Rescue (Phase B, Sub-Phase 2)
- [x] B.2.1 Create RLS Infinite Recursion Patch `supabase/migrations/20260825000005_rls_recursion_fix.sql` defining STABLE, `SECURITY DEFINER` helper function `public.is_shop_owner(p_shop_id UUID)` and non-recursive `shop_members` RLS policy.
- [x] B.2.2 Mobile UI Rescue (`app/dashboard/page.tsx`): Responsive 2-column KPI grid on mobile (`grid-cols-2 md:grid-cols-4`) with compact card padding and `touch-pan-x` horizontal table wrapper.
- [x] B.2.3 Mobile UI Rescue (`app/orders/new/page.tsx`): Responsive un-overflowable progressive disclosure tabs for 320px viewports (`text-[10px] sm:text-xs`) and unsticking sidebar on mobile (`static lg:sticky`).
- [x] B.2.4 Mobile UI Rescue (`components/tailor/measurement-intake-form.tsx`): 1-column measurement grid on mobile (`grid-cols-1 md:grid-cols-2`) and flex-shrink protection on fractional pill selectors (`min-w-0`).
- [x] B.2.5 Automated Verification Suite (`scripts/verify_db.ts`): Added 3 assertions for migration 5 and `is_shop_owner`, verified 32/32 tests pass, 0 type errors (`npx tsc --noEmit`), and static export passes (`npm run build`).

---

## Phase C: Tailor Settings Dashboard & Workshop Preferences
- [ ] C.1 Workshop Identity & Shop Profile (`app/settings/page.tsx`): Shop name, Urdu title, phone number, physical address, NTN, and custom receipt header/footer branding notes.
- [ ] C.2 Staff Management & Workshop Role Assignments: Add/edit master cutters, stitchers, pressmen, and counter clerks with role-based access status.
- [ ] C.3 Garment Catalog & Default Stitching Rates: Configure baseline labor rates per garment type (Men Shalwar Kameez, Kurta, Waistcoat, Prince Suit, Ladies Suit) and fabric surcharges.
- [ ] C.4 Thermal Printer & Hardware Preferences: Default slip format (58mm fabric staple tags vs 80mm customer invoice), auto-cut feed lines, and barcode token preferences.

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
