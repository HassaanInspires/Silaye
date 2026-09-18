import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('out');
const PORT = 3569;
const outputDir = '/home/hassaan/.gemini/antigravity-cli/brain/94bc3fb8-fa08-440a-8b7c-e944c2695df2/screenshots/deep_audit';

fs.mkdirSync(outputDir, { recursive: true });

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(OUT_DIR, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  if (!fs.existsSync(filePath)) {
    const notFound = path.join(OUT_DIR, '404.html');
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(notFound));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fs.readFileSync(filePath));
});

server.listen(PORT, async () => {
  console.log(`Deep audit server listening on http://localhost:${PORT}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const mockSession = JSON.stringify({
    user: { id: 'usr-demo-owner', email: 'owner@silaye.pk' },
    session: { access_token: 'mock-jwt-token' },
    shop: { id: 'shop-demo-1', name: 'Silaye Master Tailors & Fabrics', plan_tier: 'PRO' },
    cachedAt: Date.now(),
  });

  const auditLogs = {
    consoleErrors: [],
    consoleWarnings: [],
    consoleMessages: [],
    pageErrors: [],
    networkFailures: [],
    performanceMetrics: {},
  };

  function setupPageMonitoring(page, label) {
    page.on('console', (msg) => {
      const entry = `[${label}][${msg.type()}] ${msg.text()}`;
      if (msg.type() === 'error') {
        auditLogs.consoleErrors.push(entry);
        console.error(entry);
      } else if (msg.type() === 'warning') {
        auditLogs.consoleWarnings.push(entry);
      } else {
        auditLogs.consoleMessages.push(entry);
      }
    });

    page.on('pageerror', (err) => {
      const entry = `[${label}][PAGE_ERROR] ${err.message}\n${err.stack}`;
      auditLogs.pageErrors.push(entry);
      console.error(entry);
    });

    page.on('requestfailed', (req) => {
      const entry = `[${label}][FAILED_REQUEST] ${req.method()} ${req.url()} (${req.failure()?.errorText})`;
      auditLogs.networkFailures.push(entry);
    });
  }

  // =========================================================================
  // 1. MOBILE INTERACTION & STRESS AUDIT (LIGHT THEME - URDU)
  // =========================================================================
  console.log('\n=== RUNNING MOBILE INTERACTION AUDIT (LIGHT URDU) ===');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  setupPageMonitoring(mobilePage, 'Mobile-Urdu');

  await mobilePage.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);

  const mobStart = Date.now();
  await mobilePage.goto(`http://localhost:${PORT}/orders/new`, { waitUntil: 'networkidle', timeout: 15000 });
  const mobLoadTime = Date.now() - mobStart;
  console.log(`Mobile page loaded in: ${mobLoadTime}ms`);

  // Step 1: Initial state
  await mobilePage.screenshot({ path: `${outputDir}/01_mobile_initial_step1.png`, fullPage: false });

  // Fill mobile customer details via scoped data-testid
  const mobPhone = mobilePage.locator('[data-testid="customer-phone-mobile"]');
  if (await mobPhone.isVisible()) {
    await mobPhone.fill('03001234567');
    await mobilePage.waitForTimeout(300);
  }

  const mobName = mobilePage.locator('[data-testid="customer-name-mobile"]');
  if (await mobName.isVisible()) {
    await mobName.fill('محمد بلال چوہدری');
    await mobilePage.waitForTimeout(300);
  }

  await mobilePage.screenshot({ path: `${outputDir}/02_mobile_step1_filled.png`, fullPage: false });

  // Advance to Step 2
  const nextBtn1 = mobilePage.locator('button:has-text("ڈیزائن اور ترجیحات"), button:has-text("اگلا: اسٹائل")').first();
  if (await nextBtn1.isVisible()) {
    await nextBtn1.click();
  } else {
    await mobilePage.locator('[data-testid="mobile-step-2"]').click();
  }
  await mobilePage.waitForTimeout(500);

  // In Step 2: customize style chips
  const sherwaniChip = mobilePage.locator('button:has-text("شیروانی کالر")').first();
  if (await sherwaniChip.isVisible()) {
    await sherwaniChip.click();
  }
  await mobilePage.waitForTimeout(300);
  await mobilePage.screenshot({ path: `${outputDir}/03_mobile_step2_customized.png`, fullPage: false });

  // Advance to Step 3
  const nextBtn2 = mobilePage.locator('button:has-text("ناپ درج کریں"), button:has-text("اگلا: ناپ و پیمائش")').first();
  if (await nextBtn2.isVisible()) {
    await nextBtn2.click();
  } else {
    await mobilePage.locator('[data-testid="mobile-step-3"]').click();
  }
  await mobilePage.waitForTimeout(500);

  // In Step 3: enter advance deposit in bottom bar
  const mobAdvanceInput = mobilePage.locator('input[inputmode="decimal"]').first();
  if (await mobAdvanceInput.isVisible()) {
    await mobAdvanceInput.fill('1000');
    await mobilePage.waitForTimeout(300);
  }
  await mobilePage.screenshot({ path: `${outputDir}/04_mobile_step3_with_advance.png`, fullPage: false });

  // Confirm and Book on Mobile
  const mobBookBtn = mobilePage.locator('[data-testid="mobile-confirm-book-btn"]');
  if (await mobBookBtn.isVisible() && await mobBookBtn.isEnabled()) {
    console.log('Clicking Book Order Button on Mobile...');
    await mobBookBtn.click();
    await mobilePage.waitForTimeout(1000);
    // WhatsApp modal popup on mobile
    await mobilePage.screenshot({ path: `${outputDir}/05_mobile_booking_completed_modal.png`, fullPage: false });
  }

  // =========================================================================
  // 2. DESKTOP INTERACTION AUDIT (LIGHT THEME - URDU)
  // =========================================================================
  console.log('\n=== RUNNING DESKTOP INTERACTION AUDIT (LIGHT URDU) ===');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const desktopPage = await desktopContext.newPage();
  setupPageMonitoring(desktopPage, 'Desktop-Urdu');

  await desktopPage.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);

  const deskStart = Date.now();
  await desktopPage.goto(`http://localhost:${PORT}/orders/new`, { waitUntil: 'networkidle', timeout: 15000 });
  const deskLoadTime = Date.now() - deskStart;
  console.log(`Desktop page loaded in: ${deskLoadTime}ms`);

  // Fill desktop customer fields via scoped data-testid
  const deskPhone = desktopPage.locator('[data-testid="customer-phone-desktop"]');
  if (await deskPhone.isVisible()) {
    await deskPhone.fill('03129876543');
    await desktopPage.waitForTimeout(300);
  }

  const deskName = desktopPage.locator('[data-testid="customer-name-desktop"]');
  if (await deskName.isVisible()) {
    await deskName.fill('حاجی طارق محمود صاحب');
    await desktopPage.waitForTimeout(300);
  }

  // Capture Tab 1
  await desktopPage.screenshot({ path: `${outputDir}/06_desktop_tab1_filled.png`, fullPage: false });

  // Move to Tab 2 (Measurement Matrix)
  await desktopPage.locator('[data-testid="desktop-tab-measurements"]').click();
  await desktopPage.waitForTimeout(600);

  // Capture Tab 2 verifying full-width measurement matrix without mannequin pad
  await desktopPage.screenshot({ path: `${outputDir}/07_desktop_tab2_fullwidth_matrix.png`, fullPage: false });

  // Move to Tab 3 (Billing & Financials)
  await desktopPage.locator('[data-testid="desktop-tab-billing"]').click();
  await desktopPage.waitForTimeout(600);

  // Capture Tab 3
  await desktopPage.screenshot({ path: `${outputDir}/08_desktop_tab3_financials.png`, fullPage: false });

  // Execute Order Booking on Desktop
  const deskBookBtn = desktopPage.locator('[data-testid="desktop-confirm-book-btn"]');
  if (await deskBookBtn.isVisible() && await deskBookBtn.isEnabled()) {
    console.log('Executing Desktop Order Booking...');
    await deskBookBtn.click();
    await desktopPage.waitForTimeout(1200);

    // Capture Localized WhatsApp Receipt Modal
    await desktopPage.screenshot({ path: `${outputDir}/09_desktop_whatsapp_modal_urdu.png`, fullPage: false });

    // Switch to Ready Alert tab in WhatsApp modal
    const readyTab = desktopPage.locator('button[role="tab"]:has-text("سوٹ تیار"), button[role="tab"]:has-text("Ready")').first();
    if (await readyTab.isVisible()) {
      await readyTab.click();
      await desktopPage.waitForTimeout(400);
      await desktopPage.screenshot({ path: `${outputDir}/10_desktop_whatsapp_modal_ready_tab.png`, fullPage: false });
    }

    // Switch to Khata Balance tab
    const khataTab = desktopPage.locator('button[role="tab"]:has-text("بقایا کھاتہ"), button[role="tab"]:has-text("Khata")').first();
    if (await khataTab.isVisible()) {
      await khataTab.click();
      await desktopPage.waitForTimeout(400);
      await desktopPage.screenshot({ path: `${outputDir}/11_desktop_whatsapp_modal_khata_tab.png`, fullPage: false });
    }
  }

  // =========================================================================
  // 3. DESKTOP OBSIDIAN DARK MODE CHECK
  // =========================================================================
  console.log('\n=== RUNNING DESKTOP DARK MODE AUDIT ===');
  const darkContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const darkPage = await darkContext.newPage();
  setupPageMonitoring(darkPage, 'Desktop-Dark');

  await darkPage.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'dark');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);

  await darkPage.goto(`http://localhost:${PORT}/orders/new`, { waitUntil: 'networkidle', timeout: 15000 });
  await darkPage.waitForTimeout(600);
  await darkPage.screenshot({ path: `${outputDir}/12_desktop_dark_tab1.png`, fullPage: false });

  await darkPage.locator('[data-testid="desktop-tab-measurements"]').click();
  await darkPage.waitForTimeout(500);
  await darkPage.screenshot({ path: `${outputDir}/13_desktop_dark_tab2_matrix.png`, fullPage: false });

  // Performance metrics check
  const perfTiming = await desktopPage.evaluate(() => {
    const timing = performance.timing;
    const paint = performance.getEntriesByType('paint');
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
      firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find((p) => p.name === 'first-contentful-paint')?.startTime || 0,
    };
  });
  auditLogs.performanceMetrics = perfTiming;
  console.log('Performance Metrics:', perfTiming);

  // Write log summary file
  fs.writeFileSync(`${outputDir}/audit_logs.json`, JSON.stringify(auditLogs, null, 2));

  console.log('\n=== DEEP AUDIT COMPLETED SUCCESSFULLY! ===');

  await browser.close();
  server.close(() => {
    console.log('Server shut down.');
    process.exit(0);
  });
});
