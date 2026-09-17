import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('out');
const PORT = 3568;
const outputDir = '/home/hassaan/.gemini/antigravity-cli/brain/94bc3fb8-fa08-440a-8b7c-e944c2695df2/screenshots/orders_new';

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
  console.log(`Static server listening on http://localhost:${PORT}`);

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

  // -------------------------------------------------------------
  // 1. MOBILE AUDIT (390 x 844) - LIGHT THEME (URDU RTL)
  // -------------------------------------------------------------
  console.log('--- Capturing Mobile /orders/new in Light Theme (Urdu) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);

  await mobilePage.goto(`http://localhost:${PORT}/orders/new`, { waitUntil: 'networkidle', timeout: 15000 });
  await mobilePage.waitForTimeout(1000);

  // Step 1: Customer Intake
  await mobilePage.screenshot({ path: `${outputDir}/01_mobile_step1_customer.png`, fullPage: false });
  await mobilePage.screenshot({ path: `${outputDir}/01_mobile_step1_customer_full.png`, fullPage: true });
  console.log('Captured: 01_mobile_step1_customer');

  // Step 2: Click mobile-step-2
  const mobileStep2 = mobilePage.locator('[data-testid="mobile-step-2"]');
  if (await mobileStep2.isVisible()) {
    console.log('Clicking Mobile Step 2...');
    await mobileStep2.click();
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({ path: `${outputDir}/02_mobile_step2_style.png`, fullPage: false });
    await mobilePage.screenshot({ path: `${outputDir}/02_mobile_step2_style_full.png`, fullPage: true });
    console.log('Captured: 02_mobile_step2_style');
  }

  // Step 3: Click mobile-step-3
  const mobileStep3 = mobilePage.locator('[data-testid="mobile-step-3"]');
  if (await mobileStep3.isVisible()) {
    console.log('Clicking Mobile Step 3...');
    await mobileStep3.click();
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({ path: `${outputDir}/03_mobile_step3_measurements.png`, fullPage: false });
    await mobilePage.screenshot({ path: `${outputDir}/03_mobile_step3_measurements_full.png`, fullPage: true });
    console.log('Captured: 03_mobile_step3_measurements');
  }

  // -------------------------------------------------------------
  // 2. DESKTOP AUDIT (1280 x 800) - LIGHT THEME (URDU RTL)
  // -------------------------------------------------------------
  console.log('--- Capturing Desktop /orders/new in Light Theme (Urdu) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);

  await desktopPage.goto(`http://localhost:${PORT}/orders/new`, { waitUntil: 'networkidle', timeout: 15000 });
  await desktopPage.waitForTimeout(1000);

  // Tab 1: Customer
  await desktopPage.screenshot({ path: `${outputDir}/04_desktop_tab1_customer.png`, fullPage: false });
  await desktopPage.screenshot({ path: `${outputDir}/04_desktop_tab1_customer_full.png`, fullPage: true });
  console.log('Captured: 04_desktop_tab1_customer');

  // Tab 2: Measurements & Style
  const desktopTab2 = desktopPage.locator('[data-testid="desktop-tab-measurements"]');
  if (await desktopTab2.isVisible()) {
    console.log('Clicking Desktop Tab 2 (Measurements & Style)...');
    await desktopTab2.click();
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({ path: `${outputDir}/05_desktop_tab2_measurements.png`, fullPage: false });
    await desktopPage.screenshot({ path: `${outputDir}/05_desktop_tab2_measurements_full.png`, fullPage: true });
    console.log('Captured: 05_desktop_tab2_measurements');
  }

  // Tab 3: Billing & Confirmation
  const desktopTab3 = desktopPage.locator('[data-testid="desktop-tab-billing"]');
  if (await desktopTab3.isVisible()) {
    console.log('Clicking Desktop Tab 3 (Billing & Confirmation)...');
    await desktopTab3.click();
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({ path: `${outputDir}/06_desktop_tab3_billing.png`, fullPage: false });
    await desktopPage.screenshot({ path: `${outputDir}/06_desktop_tab3_billing_full.png`, fullPage: true });
    console.log('Captured: 06_desktop_tab3_billing');
  }

  // -------------------------------------------------------------
  // 3. DESKTOP AUDIT (1280 x 800) - LIGHT THEME (ENGLISH LTR)
  // -------------------------------------------------------------
  console.log('--- Capturing Desktop /orders/new in Light Theme (English) ---');
  const desktopEnContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  const desktopEnPage = await desktopEnContext.newPage();
  await desktopEnPage.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'en');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);

  await desktopEnPage.goto(`http://localhost:${PORT}/orders/new`, { waitUntil: 'networkidle', timeout: 15000 });
  await desktopEnPage.waitForTimeout(1000);

  await desktopEnPage.screenshot({ path: `${outputDir}/07_desktop_en_tab1_customer.png`, fullPage: false });
  await desktopEnPage.screenshot({ path: `${outputDir}/07_desktop_en_tab1_customer_full.png`, fullPage: true });
  console.log('Captured: 07_desktop_en_tab1_customer');

  const enTab2 = desktopEnPage.locator('[data-testid="desktop-tab-measurements"]');
  if (await enTab2.isVisible()) {
    await enTab2.click();
    await desktopEnPage.waitForTimeout(800);
    await desktopEnPage.screenshot({ path: `${outputDir}/08_desktop_en_tab2_measurements.png`, fullPage: false });
    await desktopEnPage.screenshot({ path: `${outputDir}/08_desktop_en_tab2_measurements_full.png`, fullPage: true });
    console.log('Captured: 08_desktop_en_tab2_measurements');
  }

  const enTab3 = desktopEnPage.locator('[data-testid="desktop-tab-billing"]');
  if (await enTab3.isVisible()) {
    await enTab3.click();
    await desktopEnPage.waitForTimeout(800);
    await desktopEnPage.screenshot({ path: `${outputDir}/09_desktop_en_tab3_billing.png`, fullPage: false });
    await desktopEnPage.screenshot({ path: `${outputDir}/09_desktop_en_tab3_billing_full.png`, fullPage: true });
    console.log('Captured: 09_desktop_en_tab3_billing');
  }

  // -------------------------------------------------------------
  // 4. DARK THEME REGRESSION AUDIT (DESKTOP)
  // -------------------------------------------------------------
  console.log('--- Capturing Dark Mode Regression Checks ---');
  const darkContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  const darkPage = await darkContext.newPage();
  await darkPage.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'dark');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);

  await darkPage.goto(`http://localhost:${PORT}/orders/new`, { waitUntil: 'networkidle', timeout: 15000 });
  await darkPage.waitForTimeout(1000);

  await darkPage.screenshot({ path: `${outputDir}/10_desktop_dark_tab1_customer.png`, fullPage: false });
  console.log('Captured: 10_desktop_dark_tab1_customer');

  console.log('ALL AUDIT SCREENSHOTS CAPTURED SUCCESSFULLY!');

  await browser.close();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
