/**
 * scripts/capture_deep_mobile_audit.ts
 *
 * Automated Deep Mobile Visual Screenshot Capture & Ergonomics Analysis Engine
 * Uses Playwright to simulate physical Android viewports (360x780 @ 2.5 DPR)
 * Captures 18 high-resolution PNGs and extracts pixel-level ergonomic telemetry.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'audit-screenshots/mobile');
const TARGET_HOST = 'https://silaye.vercel.app';

const PRO_MASTER_USER = {
  email: 'hassaanm737+pro@gmail.com',
  password: '12345678',
};

const SUPER_ADMIN_USER = {
  email: 'hassaanm737@gmail.com',
  password: '12345678',
};

const VIEWPORT_360 = {
  width: 360,
  height: 780,
  deviceScaleFactor: 2.5,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
};

export interface ErgonomicTelemetry {
  screenId: string;
  url: string;
  topHeaderHeight: number;
  bottomNavHeight: number;
  totalChromeHeight: number;
  usableViewportHeight: number;
  usableViewportPercentage: number;
  smallTapTargets: Array<{
    tag: string;
    text: string;
    title?: string;
    width: number;
    height: number;
    ariaLabel?: string;
  }>;
  hasStickyOverlap: boolean;
  overlapDetails?: string;
  truncatedElements: Array<{
    tag: string;
    text: string;
    scrollWidth: number;
    clientWidth: number;
  }>;
}

const telemetryLog: Record<string, ErgonomicTelemetry> = {};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function extractErgonomics(page: Page, screenId: string): Promise<ErgonomicTelemetry> {
  const metrics = await page.evaluate((sId) => {
    const header = document.querySelector('header');
    const bottomNav = document.querySelector('nav[aria-label="Mobile Navigation"], .fixed.bottom-0');
    const stickyBar = document.querySelector('.sticky.bottom-0, [class*="sticky bottom-"]');

    const headerRect = header ? header.getBoundingClientRect() : null;
    const bottomNavRect = bottomNav ? bottomNav.getBoundingClientRect() : null;
    const stickyBarRect = stickyBar ? stickyBar.getBoundingClientRect() : null;

    const topHeaderHeight = headerRect && headerRect.height > 0 && headerRect.top <= 5 ? Math.round(headerRect.height) : 0;
    const bottomNavHeight = bottomNavRect && bottomNavRect.height > 0 ? Math.round(bottomNavRect.height) : 0;
    const stickyBarHeight = stickyBarRect && stickyBarRect.height > 0 ? Math.round(stickyBarRect.height) : 0;

    const effectiveBottomHeight = Math.max(bottomNavHeight, stickyBarHeight);
    const totalChromeHeight = topHeaderHeight + effectiveBottomHeight;
    const usableViewportHeight = Math.max(0, 780 - totalChromeHeight);
    const usableViewportPercentage = Math.round((usableViewportHeight / 780) * 100);

    // Tap target audit (< 48x48px)
    const interactiveElements = Array.from(
      document.querySelectorAll('button, a, input, select, textarea, [role="button"]')
    );

    const smallTapTargets: Array<{
      tag: string;
      text: string;
      title?: string;
      width: number;
      height: number;
      ariaLabel?: string;
    }> = [];

    interactiveElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= 780) {
        if (rect.width < 44 || rect.height < 44) {
          const rawText = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
          smallTapTargets.push({
            tag: el.tagName.toLowerCase(),
            text: rawText,
            title: el.getAttribute('title') || undefined,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            ariaLabel: el.getAttribute('aria-label') || undefined,
          });
        }
      }
    });

    // Check sticky element overlap
    let hasStickyOverlap = false;
    let overlapDetails: string | undefined = undefined;

    if (bottomNavRect && stickyBarRect) {
      const isOverlapping =
        bottomNavRect.top < stickyBarRect.bottom &&
        bottomNavRect.bottom > stickyBarRect.top &&
        bottomNavRect.left < stickyBarRect.right &&
        bottomNavRect.right > stickyBarRect.left;

      if (isOverlapping) {
        hasStickyOverlap = true;
        overlapDetails = `Bottom Nav (top: ${Math.round(bottomNavRect.top)}px, h: ${Math.round(bottomNavRect.height)}px) collides with Sticky Bar (top: ${Math.round(stickyBarRect.top)}px, h: ${Math.round(stickyBarRect.height)}px)`;
      }
    }

    // Check text truncation
    const allTextEls = Array.from(
      document.querySelectorAll('span, p, h1, h2, h3, h4, div, button, label')
    );
    const truncatedElements: Array<{
      tag: string;
      text: string;
      scrollWidth: number;
      clientWidth: number;
    }> = [];

    allTextEls.forEach((el) => {
      if (el.children.length === 0 && el.textContent && el.textContent.trim().length > 3) {
        const style = window.getComputedStyle(el);
        if (
          (style.textOverflow === 'ellipsis' || style.overflow === 'hidden') &&
          el.scrollWidth > el.clientWidth + 2
        ) {
          truncatedElements.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().slice(0, 35),
            scrollWidth: Math.round(el.scrollWidth),
            clientWidth: Math.round(el.clientWidth),
          });
        }
      }
    });

    return {
      screenId: sId,
      url: window.location.pathname,
      topHeaderHeight,
      bottomNavHeight: effectiveBottomHeight,
      totalChromeHeight,
      usableViewportHeight,
      usableViewportPercentage,
      smallTapTargets: smallTapTargets.slice(0, 20),
      hasStickyOverlap,
      overlapDetails,
      truncatedElements: truncatedElements.slice(0, 10),
    };
  }, screenId);

  telemetryLog[screenId] = metrics;
  return metrics;
}

async function captureScreen(
  page: Page,
  filename: string,
  options?: { clip?: { x: number; y: number; width: number; height: number } }
) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.waitForTimeout(800);
  if (options?.clip) {
    await page.screenshot({ path: filePath, clip: options.clip });
  } else {
    await page.screenshot({ path: filePath, fullPage: false });
  }
  console.log(`  📸 Captured: ${filename} [${(fs.statSync(filePath).size / 1024).toFixed(1)} KB]`);
  await extractErgonomics(page, filename);
}

// ============================================================================
// MAIN EXECUTION SUITE
// ============================================================================

async function runMobileAuditSuite() {
  console.log('================================================================');
  console.log('📱 STARTING SILAYE DEEP MOBILE VISUAL & ERGONOMIC AUDIT SUITE');
  console.log('================================================================\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log(`🎯 Target Host: ${TARGET_HOST}\n`);

  const browser: Browser = await chromium.launch({
    headless: true,
  });

  try {
    // ------------------------------------------------------------------------
    // SESSION 1: PRO MASTER WORKSHOP USER
    // ------------------------------------------------------------------------
    console.log('--- [SESSION 1] Pro Master Workshop Workflow (360x780 @ 2.5 DPR) ---');
    const proContext: BrowserContext = await browser.newContext(VIEWPORT_360);
    const proPage: Page = await proContext.newPage();

    // 01. Login Page
    console.log('\n[01] Capturing Login Screen (/login)...');
    await proPage.goto(`${TARGET_HOST}/login`, { waitUntil: 'domcontentloaded' });
    await proPage.waitForSelector('input[type="email"], input[type="text"]', { timeout: 15000 });
    await captureScreen(proPage, '01_login_mobile.png');

    // Perform Login
    console.log('🔐 Authenticating as Pro Master (hassaanm737+pro@gmail.com)...');
    await proPage.fill('input[type="email"], input[type="text"]', PRO_MASTER_USER.email);
    await proPage.fill('input[type="password"]', PRO_MASTER_USER.password);
    await proPage.click('button[type="submit"]');

    // Wait for Dashboard to mount
    console.log('⏳ Waiting for dashboard to mount...');
    await proPage.waitForTimeout(3500);
    await proPage.waitForSelector('#main-content', { timeout: 15000 });

    // 02. Dashboard Top Viewport
    console.log('\n[02] Capturing Dashboard (Top Viewport)...');
    await captureScreen(proPage, '02_dashboard_top.png');

    // 03. Dashboard Scrolled Mid
    console.log('\n[03] Capturing Dashboard (Scrolled Mid - Quick Actions & Urgent Carousel)...');
    await proPage.evaluate(() => {
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 350, behavior: 'instant' });
      else window.scrollTo({ top: 350, behavior: 'instant' });
    });
    await captureScreen(proPage, '03_dashboard_scrolled_mid.png');

    // 04. Dashboard Scrolled Bottom
    console.log('\n[04] Capturing Dashboard (Scrolled Bottom - pb-36 Clearance Check)...');
    await proPage.evaluate(() => {
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'instant' });
      else window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    });
    await captureScreen(proPage, '04_dashboard_scrolled_bottom.png');

    // 05. New Order Booking - Step 1
    console.log('\n[05] Navigating to New Order Booking (/orders/new - Step 1)...');
    await proPage.click('a[href="/orders/new"], nav a[href*="orders/new"]');
    await proPage.waitForTimeout(2000);
    await proPage.waitForSelector('#main-content', { timeout: 15000 });
    await captureScreen(proPage, '05_booking_step1_customer_fabric.png');

    // Fill customer data & delivery date
    console.log('📝 Entering customer phone, name & delivery date...');
    await proPage.locator('input[type="tel"]:visible').first().fill('03001234567');
    await proPage.locator('input[placeholder*="بلال"]:visible, input[type="text"]:visible').first().fill('محمد بلال خان');
    const dateInput = proPage.locator('input[type="date"]:visible').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-09-15');
    }
    await proPage.waitForTimeout(800);

    // 06. New Order Booking - Step 2 (Style & Cuts)
    console.log('\n[06] Switching to Step 2 (Style & Measurements Tab)...');
    const step2Tab = proPage.locator('button[value="measurements"], button:has-text("2. Measurements"), button:has-text("2. Style")').first();
    if (await step2Tab.isVisible()) {
      await step2Tab.click();
    }
    await proPage.waitForTimeout(1000);
    await proPage.evaluate(() => {
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 0, behavior: 'instant' });
    });
    await captureScreen(proPage, '06_booking_step2_style_cuts.png');

    // 07. New Order Booking - Step 3 (Measurements Matrix)
    console.log('\n[07] Scrolling to Measurements Matrix (10-field grid & fractional pills)...');
    await proPage.evaluate(() => {
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 380, behavior: 'instant' });
      else window.scrollTo({ top: 380, behavior: 'instant' });
    });
    await captureScreen(proPage, '07_booking_step3_measurements.png');

    // 08. New Order Booking - Sticky Bar Overlap Area
    console.log('\n[08] Capturing Step 3 Sticky Booking Bar Collision / Bottom Area...');
    await proPage.evaluate(() => {
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'instant' });
      else window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    });
    await captureScreen(proPage, '08_booking_sticky_bar_overlap.png');

    // 17. WhatsApp Receipt Modal (Confirm Booking trigger)
    console.log('\n[17] Triggering Order Booking & Capturing WhatsApp Receipt Modal...');
    const confirmBookingBtn = proPage.locator('button:has-text("Confirm & Book Suit"), button:has-text("سوٹ بک کریں")').first();
    if (await confirmBookingBtn.isVisible() && await confirmBookingBtn.isEnabled()) {
      await confirmBookingBtn.click();
      await proPage.waitForSelector('[role="dialog"], [class*="fixed inset-0"]', { timeout: 10000 });
      await proPage.waitForTimeout(1200);
      await captureScreen(proPage, '17_modal_whatsapp_receipt.png');

      // 18. Thermal Receipt Preview Modal (from WhatsApp modal action)
      console.log('\n[18] Triggering Thermal Slip Preview Modal...');
      const printSlipBtn = proPage.locator('[role="dialog"] button:has-text("Print"), [role="dialog"] button:has-text("پرنٹ")').first();
      if (await printSlipBtn.isVisible()) {
        await printSlipBtn.click();
        await proPage.waitForTimeout(1000);
        await captureScreen(proPage, '18_modal_thermal_preview.png');
      } else {
        // Fallback: close dialog and capture preview
        await proPage.keyboard.press('Escape');
        await proPage.waitForTimeout(600);
        await proPage.goto(`${TARGET_HOST}/print`, { waitUntil: 'domcontentloaded' });
        await proPage.waitForTimeout(1500);
        const slipBtn = proPage.locator('button:has-text("80mm"), button:has-text("Slip"), button:has-text("رسید")').first();
        if (await slipBtn.isVisible()) {
          await slipBtn.click();
          await proPage.waitForSelector('[role="dialog"]', { timeout: 5000 });
          await captureScreen(proPage, '18_modal_thermal_preview.png');
          await proPage.keyboard.press('Escape');
        } else {
          await captureScreen(proPage, '18_modal_thermal_preview.png');
        }
      }
    } else {
      console.warn('⚠️ Confirm button not enabled');
    }

    // 09. Orders Production Pipeline
    console.log('\n[09] Navigating to Production Pipeline (/orders)...');
    await proPage.click('a[href="/orders"], nav a[href*="orders"]');
    await proPage.waitForTimeout(2000);
    await proPage.waitForSelector('#main-content', { timeout: 15000 });
    await captureScreen(proPage, '09_orders_list_top.png');

    // 10. Orders Card Actions Close-Up
    console.log('\n[10] Capturing Close-Up of Order Card Quick Action Buttons...');
    const orderCard = proPage.locator('.premium-glass-card, [class*="border-white/"]').filter({ hasText: 'بلال' }).first();
    if (await orderCard.isVisible()) {
      const box = await orderCard.boundingBox();
      if (box) {
        await captureScreen(proPage, '10_orders_card_actions.png', {
          clip: {
            x: Math.max(0, box.x - 5),
            y: Math.max(0, box.y - 5),
            width: Math.min(360, box.width + 10),
            height: Math.min(420, box.height + 10),
          },
        });
      } else {
        await captureScreen(proPage, '10_orders_card_actions.png');
      }
    } else {
      await captureScreen(proPage, '10_orders_card_actions.png');
    }

    // 11. Khata Ledger Summary Cards
    console.log('\n[11] Navigating to Khata Ledger (/khata)...');
    await proPage.click('a[href="/khata"], nav a[href*="khata"]');
    await proPage.waitForTimeout(2000);
    await proPage.waitForSelector('#main-content', { timeout: 15000 });
    await captureScreen(proPage, '11_khata_summary_cards.png');

    // 12. Khata Customer Card Detail
    console.log('\n[12] Capturing First Debtor / Customer Card in Khata Ledger...');
    await proPage.evaluate(() => {
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 220, behavior: 'instant' });
      else window.scrollTo({ top: 220, behavior: 'instant' });
    });
    await captureScreen(proPage, '12_khata_customer_card.png');

    // 13. Thermal Print Station
    console.log('\n[13] Navigating to Print Station (/print)...');
    await proPage.goto(`${TARGET_HOST}/print`, { waitUntil: 'domcontentloaded' });
    await proPage.waitForTimeout(2000);
    await proPage.waitForSelector('#main-content', { timeout: 15000 });
    await captureScreen(proPage, '13_thermal_print_station.png');

    await proContext.close();

    // ------------------------------------------------------------------------
    // SESSION 2: SUPER ADMIN PORTAL
    // ------------------------------------------------------------------------
    console.log('\n--- [SESSION 2] Super Admin Portal (/admin) (360x780 @ 2.5 DPR) ---');
    const adminContext: BrowserContext = await browser.newContext(VIEWPORT_360);
    const adminPage: Page = await adminContext.newPage();

    console.log('🔐 Authenticating as Super Admin (hassaanm737@gmail.com)...');
    await adminPage.goto(`${TARGET_HOST}/login`, { waitUntil: 'domcontentloaded' });
    await adminPage.waitForSelector('input[type="email"], input[type="text"]', { timeout: 15000 });
    await adminPage.fill('input[type="email"], input[type="text"]', SUPER_ADMIN_USER.email);
    await adminPage.fill('input[type="password"]', SUPER_ADMIN_USER.password);
    await adminPage.click('button[type="submit"]');

    console.log('⏳ Navigating to /admin Super Admin Command Center...');
    await adminPage.waitForTimeout(3500);
    await adminPage.goto(`${TARGET_HOST}/admin`, { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(2500);
    await adminPage.waitForSelector('#main-content, .grid', { timeout: 15000 });

    // 14. Admin Metrics
    console.log('\n[14] Capturing Super Admin Top Platform Metrics...');
    await captureScreen(adminPage, '14_admin_metrics_mobile.png');

    // 15. Admin Workshops Directory Table
    console.log('\n[15] Capturing Super Admin Workshops Directory...');
    await adminPage.evaluate(() => {
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 380, behavior: 'instant' });
      else window.scrollTo({ top: 380, behavior: 'instant' });
    });
    await captureScreen(adminPage, '15_admin_workshops_table_mobile.png');

    // 16. Admin Payment Approvals Inbox
    console.log('\n[16] Switching to Super Admin Payment Approvals Inbox...');
    const paymentsTab = adminPage.locator('button:has-text("Payment Approvals")').first();
    if (await paymentsTab.isVisible()) {
      await paymentsTab.click();
      await adminPage.waitForTimeout(1000);
      await adminPage.evaluate(() => {
        const main = document.getElementById('main-content');
        if (main) main.scrollTo({ top: 0, behavior: 'instant' });
      });
      await captureScreen(adminPage, '16_admin_payment_approvals_mobile.png');
    } else {
      console.warn('⚠️ Payment Approvals tab not found');
      await captureScreen(adminPage, '16_admin_payment_approvals_mobile.png');
    }

    await adminContext.close();

    // ------------------------------------------------------------------------
    // TELEMETRY SUMMARY DUMP
    // ------------------------------------------------------------------------
    const telemetryJsonPath = path.join(SCREENSHOT_DIR, 'ergonomic_telemetry.json');
    fs.writeFileSync(telemetryJsonPath, JSON.stringify(telemetryLog, null, 2), 'utf-8');
    console.log(`\n💾 Saved Ergonomic Telemetry to ${telemetryJsonPath}`);

    console.log('\n================================================================');
    console.log('✅ ALL 18 MOBILE SCREENSHOTS CAPTURED & TELEMETRY EXTRACTED');
    console.log('================================================================\n');
  } catch (error) {
    console.error('❌ Error during mobile visual audit capture:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Execute runner
runMobileAuditSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
