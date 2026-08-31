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
- [x] C.1 Workshop Identity & Shop Profile (`app/settings/page.tsx`): Shop name, Urdu title, phone number, physical address, NTN, and custom receipt header/footer branding notes.
- [x] C.2 Staff Management & Workshop Role Assignments (`supabase/migrations/20260825000007_staff_management.sql`, `lib/db.ts`, `app/settings/page.tsx`, `app/orders/new/page.tsx`): Helper RPCs (get_shop_members, add_shop_staff_member, remove_shop_member), staffDb repository, Staff & Roles directory tab, Add Craftsman modal, and dynamic booking assignment sync.
- [x] C.3 Garment Catalog & Default Stitching Rates (`supabase/migrations/20260825000008_garment_rates.sql`, `lib/db.ts`, `app/settings/page.tsx`, `app/orders/new/page.tsx`): Database matrix table with 4 mathematical CHECK constraints, SECURITY DEFINER reset/seed RPCs, ratesDb repository, Catalog Matrix tab with market defaults, and idempotent urgent surcharge order booking integration.
- [x] C.4 Thermal Printer & Hardware Preferences (`supabase/migrations/20260825000009_printer_settings.sql`, `lib/db.ts`, `lib/escpos.ts`, `components/tailor/thermal-slip-modal.tsx`, `app/settings/page.tsx`, `app/orders/new/page.tsx`, `app/print/page.tsx`): Database table with CHECK constraints, seed/reset trigger integration, printerDb repository with non-null offline fallback, ASCII raw binary ESC/POS formatting, Tab 4 settings UI with live thermal paper preview, auto-print on booking, and test slip printing.

---

## Phase D: Multi-Tenant Platform Operations & Founder Super Admin (Phase D, Sub-Phase 1)
- [x] D.1.1 Database Migration & Super Admin Security (`supabase/migrations/20260825000010_super_admin.sql`): Add `status` with `check_valid_shop_status` CHECK constraint to `shops`, `system_admins` table, STABLE `is_super_admin()` helper with `SECURITY DEFINER`, RLS lockdown, `get_platform_metrics()`, `get_all_shops_admin()` with distinct join counts, `set_shop_status_admin()`, and founder bootstrap query.
- [x] D.1.2 Type System & Repository Layer (`types/tailor.ts`, `lib/db.ts`): Declare `ShopStatus`, `PlatformMetrics`, `AdminShopOverview`, `SystemAdmin` types; export `adminDb` repository with `checkIsSuperAdmin()`, `getPlatformMetrics()`, `getAllShops()`, `setShopStatus()`, and rich offline mock fallbacks.
- [x] D.1.3 Application Shell & Tenant Suspension Guard (`components/layout/app-shell.tsx`): Super Admin sidebar & mobile drawer link for verified admins, and tenant suspension alert banner for workshops in `SUSPENDED` status.
- [x] D.1.4 Super Admin Command Center Dashboard (`app/admin/page.tsx`): Executive Obsidian Dark control center with 4 KPI summary cards (Registered Workshops, Platform Craftsmen, Orders Tailored, Udhaar Volume), multi-field search, status filter tabs (`All`, `Active`, `Suspended`, `Trial`), 1-tap quick actions with confirmation dialog (`Dialog`), and 403 Access Denied glass gate for unauthorized users.
- [x] D.1.5 Automated Database Verification Suite & Production Build (`scripts/verify_db.ts`): Added Section 9 assertions for migration 10, schema, RPCs, mappers, and `adminDb` (71/71 tests passing), verified 0 type errors (`npx tsc --noEmit`), and verified Next.js static export compilation into `out/` (27/27 static routes generated).

---

## Phase E: Multi-Tier SaaS Monetization & Quota Engine
- [x] E.1.1 Database Migration & Subscription Schema (`supabase/migrations/20260825000011_subscription_system.sql`): Extend `public.shops` with `plan_tier` ('FREE' | 'PRO' | 'ENTERPRISE'), `billing_cycle`, `subscription_status`, and Stripe metadata columns; create `public.shop_usage` table with monthly aggregation; declare STABLE `check_order_creation_allowed` RPC with safe `COALESCE` quota lookup and 50-suit Free tier ceiling; configure auto-increment `trg_increment_shop_order_usage` trigger on `garment_orders` and historical usage backfill.
- [x] E.1.2 Domain Types & Repositories (`types/tailor.ts`, `lib/db.ts`, `lib/mock-data.ts`): Declare `PlanTier`, `SubscriptionStatus`, `BillingCycle`, `ShopUsage` types; extend `Shop` interface; implement `mapShopUsageRow` and `subscriptionDb` repository with `getShopUsage()`, `checkOrderAllowed()`, `updateSubscription()`, `incrementUsage()`, and offline development state.
- [x] E.1.3 Booking Quota Guard & Upgrade Interlock (`app/orders/new/page.tsx`): Pre-flight `subscriptionDb.checkOrderAllowed` guard blocking order creation when Free tier quota (50/50) is reached; luxury Obsidian Dark Quota Reached Dialog with 50/50 visual progress bar, Pro tier feature breakdown, and upgrade CTA to `/settings`.
- [x] E.1.4 Automated Verification Suite & Static Export Compilation (`scripts/verify_db.ts`): Added Section 6 database assertions for subscription migration DDL, `shop_usage` table, mappers, quota checks, and tier updates (83/83 tests passing); verified 0 type errors (`npx tsc --noEmit`); and verified Next.js static export compilation into `out/` (27/27 static routes generated).
- [x] E.2.1 Real-Time Cross-Component Plan Sync (`lib/db.ts`, `components/layout/app-shell.tsx`): Dispatched `silaye:plan-updated` custom event in `subscriptionDb.updateSubscription()`, dynamic date calculations (+30d monthly, +365d annual), and added event listener in `AppShell` with dynamic desktop sidebar & mobile drawer plan badges (`FREE`, `PRO`, `ENTERPRISE`).
- [x] E.2.2 Settings Dashboard: Billing & Subscriptions Tab (`app/settings/page.tsx`): Built Tab 5 with Active Plan & Usage Widget (tier badge, status indicator, monthly quota progress meter, countdown to renewal date), 3-tier PKR pricing comparison cards (Solo Master Free Rs. 0, Multi-Counter Workshop Pro Rs. 2,800/mo, Enterprise Tailor House Rs. 7,000/mo) with Monthly vs Annual toggle (−20% savings), and SSR-safe canvas-confetti celebration.
- [x] E.2.3 Subscription Upgrade & Activation Workflow (`app/settings/page.tsx`): Built the Subscription Upgrade Confirmation Dialog displaying billing frequency summary, annual savings breakdown, activated feature checklist, and real-time subscription update execution.
- [x] E.2.4 Automated Test Suite & Static Export Compilation (`scripts/verify_db.ts`): Added Section 11 test assertions for tier transitions, annual discount math, and quota enforcement (91/91 tests passing); verified 0 type errors (`npx tsc --noEmit`); and verified Next.js static export compilation into `out/` (27/27 static routes generated).

---

## Phase F: Production Hardening, Zero-Trust Lockdown & Security Operations
- [x] F.1.1 Production Database Purification & Test Data Segregation (`lib/mock-data.ts`, `lib/db.ts`): Gated mock datasets behind `isDemoMode()`, enforced live Supabase multi-tenant table queries for authenticated users, and built factory reset / cache purge utility `purgeLocalCache()`.
- [x] F.1.2 Cascade-Safe Purge RPC (`supabase/migrations/20260825000012_production_lockdown.sql`): Created `public.purge_shop_test_data(p_shop_id UUID)` with `SECURITY DEFINER SET search_path = public`, multi-tenant role validation (`is_super_admin() OR is_shop_owner()`), cascade deletion (`khata_transactions` -> `garment_orders` -> `measurement_profiles` -> `customers` -> `shop_usage.orders_count = 0`), and preservation of `shops`, `shop_members`, `garment_rates`, `printer_settings`.
- [x] F.1.3 Super Admin Command Center Purge Action & Pre-Flight Gate (`app/admin/page.tsx`): Fortified 403 access gate to block telemetry queries before super admin verification; added "Purge Test Data" button on workshop table rows with two-step modal requiring typing `"PURGE"`.
- [x] F.1.4 Settings Workshop Profile Danger Zone (`app/settings/page.tsx`): Added "Workshop Reset & Data Purification" card in Tab 1 with "Purge Workshop Data" (requiring typing `"PURGE"`) and "Flush Local Cache" buttons.
- [x] F.1.5 Verification Suite & Static Export Compilation (`scripts/verify_db.ts`): Added Section 12 test assertions for migration 12 DDL, purge RPC execution, cache flush, and demo mode evaluation (98/98 tests passing); verified 0 TypeScript errors (`npx tsc --noEmit`); and verified static export compilation into `out/` (27/27 static routes generated).
- [x] F.2.1 Super Admin Founder Email Auto-Lock (`supabase/migrations/20260825000013_admin_email_lock.sql`, `lib/db.ts`, `app/admin/page.tsx`): Created `public.assign_super_admin_by_email()` trigger function with `SECURITY DEFINER SET search_path = public` binding to `auth.users` on `INSERT`, auto-provisioning `SUPER_ADMIN` privileges for `founder@silaye.pk` and `is_platform_founder = true`, with automatic backfill; fortified `adminDb.checkIsSuperAdmin()` and 403 Lockout Glass Gate.
- [x] F.2.2 Repository Layer Offline-First Resiliency (`lib/db.ts`): Implemented `ordersDb.getByShopId()`, `customersDb.getByShopId()`, and `khataDb.getByShopId()` querying live Supabase tenant tables when online, syncing to local IndexedDB, and gracefully falling back to `lib/offline-db.ts` (`getLocalOrders`, `getLocalCustomers`, `getLocalKhataTransactions`) when offline.
- [x] F.2.3 Clean-Slate UI & Luxury Obsidian Dark Empty States (`app/dashboard/page.tsx`, `app/orders/page.tsx`, `app/khata/page.tsx`, `app/print/page.tsx`, `app/orders/new/page.tsx`): Eradicated hardcoded mock state initializers from UI client viewports; rendered luxury `.premium-glass-card` empty states with bilingual Urdu subtitles and 1-tap CTAs (`[+ Book First Suit]`, `[+ New Khata Entry]`); connected live customer lookup and measurement prefill.
- [x] F.2.4 Mock Data Total Isolation & Static Export Resiliency (`lib/mock-data.ts`, `app/track/[orderId]/page.tsx`): Evaluated all mock dataset exports against `isDemoMode()`, returning empty arrays in production builds; preserved internal seed fixtures for static tracking parameters (`generateStaticParams`).
- [x] F.2.5 Automated Verification Suite & Static Export Compilation (`scripts/verify_db.ts`): Added Section 13 test assertions (113/113 tests passing); verified 0 TypeScript compiler errors (`npx tsc --noEmit`); and verified Next.js production static export compilation into `out/` (28/28 static routes generated).

---

## Phase 11: Cross-Platform Native Scaffolding
- [x] 11.1 Scaffold Capacitor configuration (`capacitor.config.ts`) and Android project assets (`npx cap add android`).
- [x] 11.2 Scaffold Electron main and preload processes (`electron/main.cjs`, `electron/preload.cjs`).
- [x] 11.3 Configure `package.json` with build scripts for `desktop:build` (Electron NSIS installer) and `mobile:sync` (Capacitor Android).
- [x] 11.4 Setup GitHub Actions CI/CD workflow (`.github/workflows/build-artifacts.yml`) for automated cloud compilation.

---

## Phase 12: Production Verification & Build Checks
- [x] 12.1 Run full typecheck (`npx tsc --noEmit`) and resolve any interface or prop discrepancies.
- [x] 12.2 Run static export build (`npm run build`) to verify `out/` directory generation with zero runtime errors.
- [x] 12.3 Verify responsive rendering on mobile viewports (Android Webview) and desktop window dimensions (Electron).

---

## Phase 13: Automated Cloud Release Build & Cross-Platform Distribution (v1.0.0)
- [x] 13.1 Commit release snapshot `chore(release): v1.0.0 - clean-slate zero-mock production build` and push to `origin/main`.
- [x] 13.2 Create annotated release tag `v1.0.0` and force-push to remote to trigger GitHub Actions CI/CD pipeline (`build-artifacts.yml`).
- [x] 13.3 Compile Windows Desktop Installer (`.exe`) on GitHub Actions `windows-latest` runner with Electron Builder NSIS x64.
- [x] 13.4 Compile Android Native Package (`.apk`) on GitHub Actions `ubuntu-latest` runner with Capacitor 8 and Java JDK 21.
- [x] 13.5 Download compiled cross-platform production binaries into `./release-binaries/` via GitHub CLI (`gh`).
- [x] 13.6 Verify binary integrity and checksums (`Silaye Master Tailor OS Setup 1.0.0.exe` [167 MB], `app-debug.apk` [5.4 MB]).

---

## Phase 14: Beta Hardening, Strict Auth Wall & Native Icon Branding
- [x] 14.1 Strict Client-Side Route Guard & Skeleton (`components/layout/app-shell.tsx`): Block unauthenticated access to internal routes (`/dashboard`, `/orders`, `/orders/new`, `/khata`, `/print`, `/settings`, `/admin`), render centered Obsidian Dark loading skeleton with scissors logo, and redirect immediately to `/login` via `window.location.replace('/login')` while whitelisting `/`, `/login`, `/login/*`, `/track/*`.
- [x] 14.2 "Silaye Beta" Visual Branding & Watermark (`app/layout.tsx`, `components/layout/app-shell.tsx`, `capacitor.config.ts`, `electron/main.cjs`, `package.json`, `android/app/src/main/res/values/strings.xml`): Update title and app identity across all platforms to "Silaye Beta" and add amber "BETA" pill badge beside the logo in desktop sidebar and mobile drawer.
- [x] 14.3 Native Icon Pipeline Setup (`package.json`, `assets/`, `android/app/src/main/res/mipmap-*`): Install `@capacitor/assets`, scaffold source assets (`icon-only.png`, `icon-foreground.png`, `icon-background.png`), generate all adaptive Android mipmaps across mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi, and configure `"icons:generate"` script.
- [x] 14.4 GitHub Actions CI/CD Workflow Secret Injection (`.github/workflows/build-artifacts.yml`): Pass repository secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_DEMO_MODE: 'false'`) at job level into Windows and Android compilation runners.
- [x] 14.5 Full Production Verification & Static Export: 0 TypeScript type errors (`npx tsc --noEmit`), 113/113 database assertions pass (`scripts/verify_db.ts`), and 28/28 static export routes successfully compiled (`npm run build`).
- [x] 14.6 Automated CI/CD Cloud Build & Official GitHub Release `v1.0.0-beta` (`.gitignore`, GitHub Actions, `gh release`): Excluded `release-binaries/` from git tracking, executed cloud compilation on `windows-latest` (NSIS x64 Setup 166.56 MB) and `ubuntu-latest` (Capacitor Android APK 7.66 MB), and published official GitHub Release `v1.0.0-beta`.

---

## Phase 15: Mobile Navigation Loop & Visual Ratio Rescue
- [x] 15.1 Landing Page & Hero Section Conversion CTAs (`app/page.tsx`, `components/landing/hero-section.tsx`): Updated all conversion CTAs ("Open Workshop", "Register Workshop", "Open Your Digital Workshop", "Login") to route directly to `/login` via standard Next.js `<Link href="/login">`.
- [x] 15.2 Application Shell & Client Route Guard Lockdown (`components/layout/app-shell.tsx`): Fortified `isPublicRoute()` with trailing slash and query param normalization (whitelisting `/`, `/login`, `/login/*`, `/track`, `/track/*`), prevented redirect loop bounce on `/login` and `/`, and restricted auth loading skeleton strictly to protected routes to allow instant public route mount.
- [x] 15.3 Logo Geometry & Aspect Ratio Normalization (`components/layout/app-shell.tsx`, `app/page.tsx`, `components/landing/hero-section.tsx`, `app/(auth)/login/page.tsx`): Wrapped all brand logos and icons in fixed containers (`relative h-9 w-9 shrink-0 flex items-center justify-center` / `relative h-12 w-12 shrink-0 ...`) with `aspect-square object-contain` icon styling, eliminating flexbox vertical stretching across all mobile and desktop viewports.
- [x] 15.4 Full Verification Suite: 0 TypeScript type errors (`npx tsc --noEmit`), 113/113 database test assertions pass (`scripts/verify_db.ts`), and 28/28 static export routes successfully compiled (`npm run build`).

---

## Phase 16: Manual Pakistani Bank Payment & Receipt Upload System
- [x] 16.1 Database Migration & Storage (`supabase/migrations/20260825000014_manual_payments.sql`): Created `public.manual_payment_requests` table with strict CHECK constraints, partial unique index `idx_one_pending_request_per_shop` on `(shop_id) WHERE status = 'PENDING'`, 3 Row Level Security policies (`is_shop_member` / `is_super_admin`), and conditional `storage.buckets` provisioning for `payment-receipts` bucket with authenticated upload and public read storage policies.
- [x] 16.2 Domain Types & Resilient Repositories (`types/tailor.ts`, `lib/db.ts`): Declared `PaymentMethod`, `PaymentRequestStatus`, `ManualPaymentRequest`; exported `manualPaymentsDb` repository with `createPaymentRequest`, `getShopPaymentRequests`, `getLatestPendingRequest`, `uploadReceiptImage` (with safe `FileReader` base64 fallback) and `resetMockState`.
- [x] 16.3 Workshop Settings Billing UI & Slip Upload Modal (`app/settings/page.tsx`): Replaced instant self-upgrade with the "Bank Transfer & Verification" modal featuring Meezan Bank Ltd, IBAN, Raast ID, 1-tap copy triggers, payment channel selector, Transaction ID input, receipt image dropzone uploader (5MB max, preview, remove button), and glowing Amber review banner in Tab 5 ("Payment Under Review / تصدیق زیر جائزہ") with lightbox receipt preview.
- [x] 16.4 Verification Suite & Production Build: Added Section 14 in `scripts/verify_db.ts` testing table DDL, constraints, partial unique index, storage policies, mappers, and repository fallbacks; verified `npx tsc --noEmit` (0 type errors), `scripts/verify_db.ts` (124/124 tests passed), and `npm run build` (28/28 static export routes compiled cleanly).

---

## Phase 17: Super Admin Verification Inbox & Custom Free Trial Campaign Engine
- [x] 17.1 Database Migration & RPCs (`supabase/migrations/20260825000015_admin_approvals_and_trials.sql`):
  - Created `approve_manual_subscription(p_request_id UUID, p_admin_notes TEXT)` with `SECURITY DEFINER SET search_path = public`, `is_super_admin()` auth validation, `FOR UPDATE` row-locking, status update to `APPROVED`, and automatic `shops` subscription tier upgrade (`ACTIVE`, `current_period_start = NOW()`, +30d / +365d duration math).
  - Created `reject_manual_subscription(p_request_id UUID, p_rejection_reason TEXT)` with `SECURITY DEFINER SET search_path = public`, `is_super_admin()` auth check, and status update to `REJECTED` with admin rejection reason.
  - Created `grant_promotional_trial(p_shop_id UUID, p_plan_tier VARCHAR, p_days INT, p_custom_date TIMESTAMPTZ)` with `SECURITY DEFINER SET search_path = public`, `is_super_admin()` check, type-safe interval calculation (`NOW() + (COALESCE(p_days, 14) * INTERVAL '1 day')`), custom expiry override, and `shops` update to `TRIALING`.
  - Granted `EXECUTE` permissions on all 3 functions to `authenticated`.
- [x] 17.2 Domain Types & Repository Layer (`types/tailor.ts`, `lib/db.ts`):
  - Extended `ManualPaymentRequest` interface and `ManualPaymentRequestRow` with optional shop metadata (`shop_name`, `shop_city`, `shop_phone`, `shop?: Shop`).
  - Implemented `adminDb.getAllPendingPaymentRequests()` returning pending payment requests joined with workshop metadata.
  - Implemented `adminDb.approvePaymentRequest()`, `adminDb.rejectPaymentRequest()`, and `adminDb.grantPromotionalTrial()` with full offline mock simulation and `silaye:plan-updated` real-time custom event dispatching.
  - Seeded initial demo pending payment requests (`mpr-mock-...`) for immediate inspection testing.
- [x] 17.3 Super Admin Command Center UI Overhaul (`app/admin/page.tsx`):
  - Added primary Tab Switcher between "Workshop Directory" (*ورکشاپ ڈائرکٹری*) and "Payment Approvals" (*رسید کی تصدیق*) with live glowing pending count badge.
  - Built High-Density **Payment Approvals Table** displaying Workshop Name, Location, Plan & Cycle, Amount in PKR (`Rs. 26,880`), Payment Channel Badge, Monospace Trx Reference, Submitted Date, and Receipt Slip Thumbnail.
  - Built **Receipt Inspection Lightbox Modal** with high-resolution screenshot viewer, full transaction breakdown, admin review notes / rejection reason textarea, 1-tap "Approve & Activate Subscription" (Emerald CTA), and "Reject Payment Request" (Rose CTA).
  - Built **Grant Promotional Free Trial Modal** in Workshop Directory with Target Plan Tier selector (`PRO` / `ENTERPRISE`), Duration Presets (`7d`, `14d`, `30d`, `60d`, `90d`, `Custom Date`), date picker, and calculated expiration summary card.
- [x] 17.4 Active Trial Workspace Banner (`components/layout/app-shell.tsx`):
  - Synchronized `shopSubscriptionStatus` and `shopPeriodEnd` from `getCurrentShop()` and `silaye:plan-updated` event.
  - Rendered top glowing blue promotional trial banner when `shopSubscriptionStatus === 'TRIALING'` (*"✨ Pro Promotional Trial Active: X days remaining"*) with dynamic remaining days countdown and direct link to `/settings`.
- [x] 17.5 Verification Suite & Production Build:
  - Added Section 15 to `scripts/verify_db.ts` asserting Migration 15 SQL DDL, RPC signatures, security guards, row-locking, interval math, execution grants, and `adminDb` approval, rejection, and trial grant methods (137/137 tests passing).
  - Verified 0 TypeScript compiler errors (`npx tsc --noEmit`).
  - Verified Next.js static export compilation (`npm run build`) generating all 28/28 static routes into `out/`.

---

## Phase 18: Paywall Enforcer, Quota Wall & Trial Expiration Hardening
- [x] 18.1 Database Migration & Quota Hardening (`supabase/migrations/20260825000016_paywall_hardening.sql`):
  - Updated `public.check_order_creation_allowed(p_shop_id UUID)` RPC with `SECURITY DEFINER SET search_path = public`, expired promotional trial fallback (`subscription_status = 'TRIALING' AND current_period_end < NOW()`) demoting effective tier to `'FREE'`, and strict 50 suits/month quota exception enforcement (`Monthly order quota reached (50/50). Upgrade to Pro for unlimited suits.`).
  - Updated `public.add_shop_staff_member(p_shop_id UUID, p_email VARCHAR, p_role VARCHAR)` RPC with `is_shop_owner()` verification, effective tier evaluation, and 1-craftsman account limit on Free tier (`Free tier is limited to 1 craftsman account. Upgrade to Pro to add staff.`).
  - Granted `EXECUTE` permissions on both functions to `authenticated`.
- [x] 18.2 Repository Layer Hardening (`lib/db.ts`):
  - Hardened `subscriptionDb.checkOrderAllowed()` with date comparisons against `current_period_end` for `TRIALING` status, returning `maxLimit: 50` for expired trials and Free tier workshops, and `maxLimit: Infinity` for active Pro/Enterprise tiers.
  - Hardened `staffDb.addStaff()` and `staffDb.getByShopId()` to enforce the 1-craftsman ceiling for Free tier workshops across both online RPC error traps and offline mock environments.
- [x] 18.3 Frontend Paywalls & Quota Interceptors (`app/orders/new/page.tsx`, `app/settings/page.tsx`):
  - `app/orders/new/page.tsx`: Pre-flight `subscriptionDb.checkOrderAllowed` guard blocking booking submissions once monthly quota (50/50) is exhausted, rendering the Obsidian Dark "Monthly Quota Reached" dialog with consumption meter and upgrade CTA.
  - `app/settings/page.tsx`: Evaluated `effectivePlanTier` taking trial expiration into account; disabled the "Add Staff Member" / "Add Craftsman" button on Free tier workshops with 1 member, and rendered the Gold Pro Upgrade callout banner (*"Upgrade to Pro to add unlimited Cutting Masters & Stitchers"*).
- [x] 18.4 Automated Verification Suite & Static Export Compilation (`scripts/verify_db.ts`):
  - Added Section 16 to `scripts/verify_db.ts` validating Migration 16 DDL, active vs expired promotional trial quota calculations, 50/50 ceiling blocking, and Free tier staff account limits (146/146 tests passing).
  - Verified 0 TypeScript compiler errors (`npx tsc --noEmit`).
  - Verified Next.js production static export compilation into `out/` (28/28 static routes generated cleanly).

---

## Phase 19: Mobile Native Onboarding, Platform Gateway & Session Auto-Routing
- [x] 19.1 Mobile Platform Gateway, Session Auto-Routing & Cinematic 3-Card Onboarding (`lib/platform.ts`, `components/landing/mobile-onboarding.tsx`, `app/page.tsx`, `app/(auth)/login/page.tsx`):
  - Created `lib/platform.ts` exporting `isNativeMobile()`, `isElectron()`, `isMobileDevice()`, and `getPlatformType()` with safe SSR guards and URL query override (`?view=mobile` / `?onboarding=true`) for developer testing.
  - Built `components/landing/mobile-onboarding.tsx`: Fullscreen Obsidian Dark (`#0B0C0E`) 3-card cinematic onboarding flow with touch swipe gesture recognition (>45px delta), animated slide transitions, active dot indicators (● ○ ○), fixed 36x36px aspect-square gold scissors header logo, top-right "لاگ ان / Sign In" button, primary gold CTA ("نیا ڈیجیٹل کھاتہ بنائیں / Open Workshop" -> `/login?tab=register`), and secondary ghost CTA ("پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں / Sign In" -> `/login?tab=login`).
  - Updated `app/page.tsx`: Native mobile gateway checking active session on mount, auto-redirecting authenticated sessions to `/dashboard` without landing page flash, rendering `<MobileOnboardingFlow />` for unauthenticated mobile users, and preserving full luxury marketing landing page on desktop/Electron.
  - Updated `app/(auth)/login/page.tsx`: URL query parameter synchronization activating register/login tabs on mount (`?tab=register` -> `signup`, `?tab=login` -> `signin`), and replaced all dashboard redirects with `window.location.replace('/dashboard')` to eliminate history stack loops.
  - Verified 0 TypeScript compiler errors (`npx tsc --noEmit`) and verified Next.js production static export compilation (`npm run build`) generating all 28/28 static routes cleanly into `out/`.
- [x] 19.2 Android System Bar, Gesture Navigation Bar & Hardware Safe Area Styling (`capacitor.config.ts`, `lib/platform-native.ts`, `components/platform/native-initializer.tsx`, `app/layout.tsx`, `app/globals.css`, `components/layout/app-shell.tsx`, `components/landing/mobile-onboarding.tsx`):
  - Configured `StatusBar` (`backgroundColor: '#0B0C0E'`, `style: 'DARK'`, `overlaysWebView: false`) and `SplashScreen` (`backgroundColor: '#0B0C0E'`, `launchAutoHide: true`, `launchShowDuration: 1000`, `showSpinner: false`) in `capacitor.config.ts` for zero-flicker launch.
  - Implemented `initializeNativePlatform()` in `lib/platform-native.ts` applying StatusBar color (`#0B0C0E`) and `Style.Dark` with safe Capacitor runtime guards.
  - Created `components/platform/native-initializer.tsx` and mounted in `app/layout.tsx` with `viewportFit: 'cover'`.
  - Added CSS safe-area helper classes (`.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe`, `.min-h-screen-safe`) and root overscroll clamping (`html, body { background-color: #0B0C0E; overscroll-behavior-y: none; }`) in `app/globals.css`.
  - Clamped mobile header (`.pt-safe`), mobile drawer (`.pt-safe`, `.pb-safe`), and main scroll viewport (`.pb-safe`) in `components/layout/app-shell.tsx`.
  - Clamped onboarding top header (`.pt-safe`), bottom action CTA container (`.pb-safe`), and root wrapper (`.min-h-screen-safe`) in `components/landing/mobile-onboarding.tsx`.
  - Verified 0 TypeScript compiler errors (`npx tsc --noEmit`), 146/146 database assertions passed (`scripts/verify_db.ts`), and static export compiled 28/28 static routes into `out/` (`npm run build`).
- [x] 19.3 Native Bottom Navigation Bar & Elevated Floating Action Button (FAB) (`components/layout/mobile-bottom-nav.tsx`, `components/layout/app-shell.tsx`):
  - Built `components/layout/mobile-bottom-nav.tsx`: Fixed mobile bottom bar (`md:hidden fixed bottom-0 left-0 right-0 z-40`) styled with Obsidian Glass (`bg-[#0E1013]/95 backdrop-blur-xl border-t border-gold/15 shadow-[0_-4px_25px_rgba(0,0,0,0.6)]`) and Android hardware safe area padding (`pb-safe`).
  - Added 4 touch-optimized tabs with 48x48px touch targets and bilingual Urdu/English labels: Home (`/dashboard` - ہوم), Orders (`/orders` - آرڈرز), Khata (`/khata` - کھاتہ), and Settings (`/settings` - سیٹنگز).
  - Integrated subpath-aware active indicators with gold accent text (`text-gold`), glowing active pill backdrop (`bg-gold/10 border border-gold/20 shadow-[0_0_12px_rgba(212,175,55,0.15)]`), and gold active dot indicator (`●`).
  - Built Elevated Center FAB (`-translate-y-4 h-14 w-14 rounded-full bg-gradient-to-tr from-gold via-amber-400 to-amber-500 text-black flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.4)] border-4 border-[#0B0C0E] active:scale-95 transition-all`) linking directly to `/orders/new` via Next.js `<Link href="/orders/new">`.
  - Mounted `<MobileBottomNav />` in `components/layout/app-shell.tsx` for authenticated sessions (`!isPublic`), and increased main viewport bottom padding to `pb-28 md:pb-8 pb-safe` to prevent floating bar content collision.
  - Verified 0 TypeScript compiler errors (`npx tsc --noEmit`), 146/146 database assertions passed (`scripts/verify_db.ts`), and static export compiled all 28 static routes cleanly into `out/` (`npm run build`).
- [x] 19.4 Inner Screens Mobile-First Overhaul (`app/dashboard/page.tsx`, `app/orders/page.tsx`, `app/orders/new/page.tsx`, `app/khata/page.tsx`):
  - **Mobile Dashboard (`app/dashboard/page.tsx`)**: Built native mobile layout under `md:hidden` featuring Urdu Greeting Card ("السلام علیکم، ماسٹر صاحب" with workshop name and live sync status pill), 2x2 High-Contrast KPI Grid (آج کی ڈیلیوری Due Today, ورکشاپ سلائی In Progress, تیار سوٹ Ready, باقی ادھار Khata Balance), Swipeable Urgent Deliveries Carousel with 1-tap WhatsApp and Thermal Print triggers, and Quick Action Chips for fast counter navigation, while preserving desktop command view under `hidden md:block`.
  - **Mobile Orders Pipeline (`app/orders/page.tsx`)**: Built mobile pipeline under `md:hidden` featuring sticky top search bar with instant '✕' clear button, horizontal scrollable status filter pills (تمام, کٹنگ, سلائی, تیار, ڈیلیورڈ) with live count badges, and touch-optimized mobile order cards displaying suit count (2× شلوار قمیض), due date urgency badge, balance due tag, 1-tap green WhatsApp receipt button, and 1-tap next-status advance CTA.
  - **Native 3-Step Booking Wizard (`app/orders/new/page.tsx`)**: Replaced desktop 12-column grid under `md:hidden` with a focused 3-Step Wizard: Step 1 (Customer Phone lookup with 03XX mask, name, garment selection, quantity stepper, delivery date picker, urgent rush toggle, and fabric specs), Step 2 (Collar styles, Pocket configurations, Daman cut, Stitching type, and Front patti), Step 3 (2-Column Measurement Matrix with tactile [-0.5"] and [+0.5"] thumb steppers and fractional pills), and Sticky Bottom Action Bar with Total PKR, advance input, and full-width gold "بکنگ مکمل کریں / Book Order" CTA.
  - **Mobile Khata Ledger (`app/khata/page.tsx`)**: Built mobile ledger under `md:hidden` featuring Financial Summary Card (Total Udhaar Receivables vs Total Advance Deposits Held with debtor counts), sticky search and status filter pills, and clean Customer Balance cards with red Udhaar / green cleared badges, 1-tap WhatsApp balance reminder CTA, and 1-tap "+ وصولی / Record Payment" modal trigger.
  - **Automated Verification**: 0 TypeScript errors (`npx tsc --noEmit`), 146/146 database and repository test assertions pass (`scripts/verify_db.ts`), and clean production static export compiled into `out/` with all 28 static routes (`npm run build`).
- [x] 19.5 Navigation Layout Switcher (Tabs vs. Drawer vs. Hybrid) (`lib/nav-preferences.ts`, `components/layout/app-shell.tsx`, `components/layout/mobile-bottom-nav.tsx`, `app/settings/page.tsx`):
  - **Navigation Layout Preference Utility (`lib/nav-preferences.ts`)**: Declared `NavLayoutPreference` type (`'tabs' | 'drawer' | 'hybrid'`), exported `NAV_LAYOUT_STORAGE_KEY` (`'silaye:nav-layout'`), `NAV_LAYOUT_CHANGED_EVENT` (`'silaye:nav-layout-changed'`), and default layout `'tabs'`; implemented SSR-safe `getNavLayoutPreference()` and `setNavLayoutPreference(layout)` with window event dispatching.
  - **App Shell & Mobile Bottom Nav Integration (`components/layout/app-shell.tsx`, `components/layout/mobile-bottom-nav.tsx`)**: Initialized state with `'tabs'`, hydrated from `localStorage` on mount, subscribed to change events; conditionally hid top hamburger button in `'tabs'` mode, rendered hamburger in `'drawer'` and `'hybrid'` modes, adjusted main scroll viewport bottom padding (`pb-6` in drawer mode vs `pb-28` in tabs/hybrid mode), and conditionally unmounted `<MobileBottomNav />` in `'drawer'` mode.
  - **Workshop Settings UI Integration (`app/settings/page.tsx`)**: Added dedicated "Navigation Layout / نیویگیشن اسٹائل" card in Workshop Settings Tab 1 with 3 interactive radio cards (Modern Tabs + Action Button, Classic Drawer Only, Hybrid Master) featuring active gold glow borders, checkmark badges, detailed English/Urdu subtitles, and live toast notifications.
  - **Automated Verification**: 0 TypeScript compiler errors (`npx tsc --noEmit`), 146/146 database assertions pass (`scripts/verify_db.ts`), and Next.js static export compiles all 28 static routes cleanly into `out/` (`npm run build`).
- [x] 19.6 Automated Daily Due Alerts, Local Notifications Engine & Workshop Notification Preferences (`package.json`, `lib/notification-preferences.ts`, `lib/notifications.ts`, `lib/db.ts`, `types/tailor.ts`, `components/platform/notification-scheduler.tsx`, `app/settings/page.tsx`, `app/layout.tsx`, `scripts/verify_db.ts`):
  - **Dependencies & Local Notifications Engine (`package.json`, `lib/notifications.ts`)**: Installed `@capacitor/local-notifications`, implemented `hashStringToId` (32-bit positive integer hashing for Android AlarmManager), `requestNotificationPermissions`, `scheduleDailyMorningBriefing` (filtering active due orders and scheduling 9:00 AM delivery summary alert with ID `9001`), `scheduleUrgentOrderAlert` (for in-production suits due in < 24h), `sendTestNotification` (with test dispatch feedback), and `playNotificationChime` (synthesizing dual-tone harmonic audio D5 -> A5 with safe `AudioContext` state handling).
  - **Workshop Notification Preferences Utility (`lib/notification-preferences.ts`)**: Declared `WorkshopNotificationPrefs` interface, exported `getNotificationPreferences`, `setNotificationPreferences`, and `resetNotificationPreferences` with default `true` values, SSR-safe `localStorage` persistence (`silaye:notification-prefs`), and custom event dispatching (`silaye:notification-prefs-changed`).
  - **Repository & Type Aliases (`lib/db.ts`, `types/tailor.ts`)**: Added `ordersDb.getOrders(shopId)` alias and semantic `Order` type alias.
  - **Automated Background Scheduler (`components/platform/notification-scheduler.tsx`, `app/layout.tsx`)**: Mounted zero-DOM client component at root level, evaluating active session, querying workshop orders, scheduling 9:00 AM morning briefings and urgent alerts, and listening to live preference change broadcasts.
  - **Workshop Settings UI Integration (`app/settings/page.tsx`)**: Added dedicated "Notifications & Due Alerts / نوٹیفیکیشنز اور الرٹس" card in Tab 1 with 3 tactile toggle switches (Morning Delivery Briefing 9:00 AM, Urgent Due Date Warnings < 24h, Sound & Vibration Chimes) and 1-tap "ٹیسٹ نوٹیفیکیشن بھیجیں / Send Test Alert" button.
  - **Automated Verification**: 0 TypeScript compiler errors (`npx tsc --noEmit`), 158/158 database and notification engine assertions pass (`scripts/verify_db.ts`), and Next.js static export compiles all 28/28 static routes cleanly into `out/` (`npm run build`).
- [x] 19.7 Cloud Build, APK Compilation & GitHub Release for Concept 1 (`package.json`, `package-lock.json`, `.github/workflows/build-artifacts.yml`, `gh release`):
  - **Version Alignment & Clean Release Snapshot**: Bumped `"version": "1.1.0"` across `package.json` and `package-lock.json`, excluded `release-binaries*/` in `.gitignore`, committed clean release snapshot `chore(release): v1.1.0-concept1 - native bottom tabs, elevated FAB, 3-card mobile onboarding, system bar styling, inner screens overhaul & automated due alerts`, and pushed to `main`.
  - **CI/CD Cloud Matrix Trigger**: Created annotated release tag `v1.1.0-concept1` and pushed to remote to trigger GitHub Actions build matrix workflow `Build Cross-Platform Native Binaries` (Run `#33365757118`).
  - **Cross-Platform Compilation**: Compiled Android Native Package (`app-debug.apk` [7.75 MB]) via Capacitor 8 / Java JDK 21 on `ubuntu-latest` and Windows Desktop Installer (`Silaye Beta Setup 1.1.0.exe` [166.70 MB]) via Electron Builder NSIS x64 on `windows-latest`.
  - **Artifact Ingestion & Verification**: Downloaded compiled binaries into `./release-binaries-concept1/` via GitHub CLI (`gh run download`) and verified checksums and binary integrity.
  - **Official GitHub Release Publication**: Published official GitHub Release `v1.1.0-concept1` with complete bilingual release notes and attached production binary assets.

- [x] 19.8 Mobile Viewport Clamping, Header Overflow Fix, Bottom Clearance Standard & Onboarding Visual Polish (`app/globals.css`, `components/layout/app-shell.tsx`, `app/dashboard/page.tsx`, `app/settings/page.tsx`, `app/orders/page.tsx`, `app/khata/page.tsx`, `app/print/page.tsx`, `app/orders/new/page.tsx`, `components/landing/mobile-onboarding.tsx`):
  - **Global Viewport Containment (`app/globals.css`)**: Added `overflow-x: hidden; max-width: 100vw; width: 100%; position: relative;` to `html, body` base styles to eliminate horizontal dragging, side-swiping, and accidental viewport overflow on mobile browsers and native webviews.
  - **Mobile Top Command Bar Clamping & Refactor (`components/layout/app-shell.tsx`)**: Isolated mobile header under `md:hidden` (`flex md:hidden items-center justify-between w-full h-14 min-h-14 px-3`) rendering Hamburger `<Menu />` (in Drawer/Hybrid mode) or Gold Scissors icon (in Tabs mode) on the left, Workshop Name with live sync indicator pill in the center, and compact touch actions (`[🔍 Search]` trigger with expandable slide-down search bar and `[🔔 Notification]` bell linking to settings) on the right, removing the wide text input from small viewports (<768px) while preserving full command bar on desktop.
  - **Universal Bottom Clearance Standard (`pb-36 pb-safe`)**: Enforced `pb-36 pb-safe` (minimum 140px bottom padding) across `<main>` scroll viewport in `AppShell` and across mobile containers in `app/dashboard/page.tsx`, `app/settings/page.tsx`, `app/orders/page.tsx`, `app/khata/page.tsx`, `app/print/page.tsx`, and `app/orders/new/page.tsx`, eliminating content clipping above `<MobileBottomNav />`.
  - **Elevated 3-Card Mobile Onboarding Aesthetics (`components/landing/mobile-onboarding.tsx`)**: Refined all 3 cinematic feature cards with rich tailoring visual components:
    * Card 1 (Smart Measurement Vault): Digital tailoring measurement card with golden accents, measuring tape/ruler icon, 4 high-contrast chips (لمبائی 40", چھاتی 38", تیرَہ 18", بین 15"), and style preference badges.
    * Card 2 (WhatsApp Receipts): Authentic emerald WhatsApp chat bubble with customer slip header, PKR breakdown (Stitching Rs. 3,500, Advance Rs. 1,500, Balance Rs. 2,000), timestamp 10:42 AM, and double blue ticks (`✓✓` in `#38bdf8`).
    * Card 3 (Offline Workflow): Glowing 3-stage pipeline ribbon (کٹائی -> سلائی -> تیار) with active pulse, "Offline DB Synced" shield badge with 100% local pill, and live ledger receivable metric (`Rs. 68,500`).
  - **Automated Verification**: 0 TypeScript compiler errors (`npx tsc --noEmit`), 159/159 database and repository test assertions pass (`scripts/verify_db.ts`), and clean production static export compiled into `out/` with all 28 static routes (`npm run build`).

---

## Phase 20: Mobile Lifecycle Core Fixes & Deep-Link Navigation Architecture
- [x] 20.1 Zero-Flash Root Shell & Pre-Render Elimination (`app/page.tsx`):
  - Statically pre-renders ONLY the fullscreen Obsidian Dark backdrop (`#0B0C0E`) with the centered pulsing gold scissors logo on `out/index.html`.
  - In `useEffect`: if native mobile and session exists, routes via `router.replace('/dashboard')`; if unauthenticated, renders `<MobileOnboardingFlow />`; if desktop browser or Electron, hydrates into the full editorial marketing landing page.
- [x] 20.2 Deterministic Auth Guard & Interlock (`components/layout/app-shell.tsx`, `app/(auth)/login/page.tsx`):
  - Introduced `isAuthResolved` state in `AppShell` with subscription to `supabase.auth.onAuthStateChange` (`INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`) and a 2.5s fallback timeout.
  - Enforced strict interlock preventing redirects while `!isAuthResolved`, and rendered Obsidian Dark skeleton loader on protected routes during verification.
  - Replaced all `window.location.replace` hard reloads with Next.js App Router `router.replace` in both `AppShell` and `LoginPage` to eliminate history loops and state destruction.
- [x] 20.3 Notification Deep-Link Action Handler (`lib/notifications.ts`, `components/platform/notification-scheduler.tsx`):
  - Implemented `setupNotificationActionListener` in `lib/notifications.ts` subscribing to `LocalNotifications.addListener('localNotificationActionPerformed', ...)`.
  - Registered listener inside `NotificationScheduler` (`app/layout.tsx`) to route directly to `action.notification.extra?.route || '/dashboard'` via `router.replace`, with clean unmount disposal.
- [x] 20.4 Automated Verification Suite & Static Export Compilation (`scripts/verify_db.ts`):
  - Added Section 16/17 Test 17.8 verifying `setupNotificationActionListener` initialization and cleanup function handling (159/159 tests passing).
  - Verified 0 TypeScript type errors (`npx tsc --noEmit`).
  - Verified Next.js static export compilation into `out/` (28/28 static routes generated cleanly) and verified `out/index.html` renders strictly the `#0B0C0E` backdrop with 0 marketing copy bytes.
- [x] 20.5 Cloud Build, Binary Compilation & Official Release v1.1.1-concept1 (`package.json`, `package-lock.json`, `gh release`):
  - Bumped version to `1.1.1` across `package.json` and `package-lock.json`.
  - Triggered GitHub Actions CI/CD matrix build (`Run #33369514827`) on `v1.1.1-concept1` tag.
  - Successfully compiled Android Native Package (`app-debug.apk` [7.74 MB]) in 2m 49s on `ubuntu-latest` and Windows Desktop Installer (`Silaye Beta Setup 1.1.1.exe` [166.70 MB]) in 2m 44s on `windows-latest`.
  - Downloaded compiled production binaries into `./release-binaries-concept1-patch/` and published official GitHub Release `v1.1.1-concept1`.

