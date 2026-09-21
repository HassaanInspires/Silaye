import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.join(__dirname, '..', 'out');

// Reliable static server for Next.js 'out' export directory
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath.startsWith('/')) {
    reqPath = reqPath.slice(1);
  }

  let candidates = [
    path.join(outDir, reqPath),
    path.join(outDir, reqPath, 'index.html'),
    path.join(outDir, `${reqPath}.html`),
  ];

  let resolvedFile = null;
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      resolvedFile = c;
      break;
    }
  }

  if (resolvedFile) {
    const ext = path.extname(resolvedFile);
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff2': 'font/woff2',
      '.txt': 'text/plain; charset=utf-8',
      '.webmanifest': 'application/manifest+json',
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(resolvedFile).pipe(res);
  } else {
    const notFound = path.join(outDir, '404', 'index.html');
    const notFoundDirect = path.join(outDir, '404.html');
    const fallback = fs.existsSync(notFound) ? notFound : fs.existsSync(notFoundDirect) ? notFoundDirect : null;
    if (fallback) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(fallback).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

const PORT = 4128;
server.listen(PORT, async () => {
  console.log(`Serving out/ on http://localhost:${PORT}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const mockUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'master@silaye.pk',
    user_metadata: { full_name: 'Master Ustad' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
  const mockSession = {
    access_token: 'mock_token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'mock_refresh',
    user: mockUser,
  };
  const mockShop = {
    id: '00000000-0000-0000-0000-000000000001',
    owner_id: '00000000-0000-0000-0000-000000000001',
    name: 'Silaye Master Atelier',
    slug: 'silaye-master',
    phone: '03001234567',
    address: 'Main Bazaar, Lahore',
    city: 'Lahore',
    currency: 'PKR',
    status: 'ACTIVE',
    plan_tier: 'PRO',
    subscription_status: 'ACTIVE',
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
  };

  const artifactDir = '/home/hassaan/.gemini/antigravity-cli/brain/1ec43e3c-1067-4867-8a16-d0db98d61dc6';
  const screenshotsDir = path.join(artifactDir, 'orders_new_audit_screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const errors = [];

  // =========================================================================
  // 1. MOBILE SUITE (360x740, Urdu Light Theme)
  // =========================================================================
  const mobileContext = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await mobileContext.route('**/auth/v1/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh',
        user: mockUser,
      }),
    });
  });

  await mobileContext.addInitScript(({ mockUser, mockSession, mockShop }) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem(
      'silaye_cached_session',
      JSON.stringify({
        user: mockUser,
        session: mockSession,
        shop: mockShop,
        cachedAt: Date.now(),
      })
    );
    localStorage.setItem('silaye_cached_shop', JSON.stringify(mockShop));
  }, { mockUser, mockSession, mockShop });

  const mobilePage = await mobileContext.newPage();
  mobilePage.on('pageerror', (err) => errors.push({ type: 'uncaught', message: err.message }));

  console.log('\n--- 1. Testing Mobile Step 1: Customer Intake (360x740, Urdu Light) ---');
  await mobilePage.goto(`http://localhost:${PORT}/orders/new/`, { waitUntil: 'networkidle', timeout: 15000 });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, '01_orders_new_mobile_step1.png') });
  console.log('✓ 01_orders_new_mobile_step1.png captured');

  console.log('\n--- 2. Testing Mobile Step 2: Garment Styles ---');
  const step2Btn = mobilePage.locator('[data-testid="mobile-step-2"]').first();
  if (await step2Btn.count() > 0) {
    await step2Btn.click();
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({ path: path.join(screenshotsDir, '02_orders_new_mobile_step2.png') });
    console.log('✓ 02_orders_new_mobile_step2.png captured');
  }

  console.log('\n--- 3. Testing Mobile Step 3: Measurements Matrix (0, ¼, ½, ¾ pills) ---');
  const step3Btn = mobilePage.locator('[data-testid="mobile-step-3"]').first();
  if (await step3Btn.count() > 0) {
    await step3Btn.click();
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({ path: path.join(screenshotsDir, '03_orders_new_mobile_step3.png') });
    console.log('✓ 03_orders_new_mobile_step3.png captured');
  }

  // =========================================================================
  // 2. DESKTOP SUITE (1280x850, Urdu & English Light Theme)
  // =========================================================================
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1.5,
  });

  await desktopContext.route('**/auth/v1/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh',
        user: mockUser,
      }),
    });
  });

  await desktopContext.addInitScript(({ mockUser, mockSession, mockShop }) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem(
      'silaye_cached_session',
      JSON.stringify({
        user: mockUser,
        session: mockSession,
        shop: mockShop,
        cachedAt: Date.now(),
      })
    );
    localStorage.setItem('silaye_cached_shop', JSON.stringify(mockShop));
  }, { mockUser, mockSession, mockShop });

  const desktopPage = await desktopContext.newPage();
  desktopPage.on('pageerror', (err) => errors.push({ type: 'uncaught', message: err.message }));

  console.log('\n--- 4. Testing Desktop Tab 1: Customer & Fabric (1280x850, Urdu Light) ---');
  await desktopPage.goto(`http://localhost:${PORT}/orders/new/`, { waitUntil: 'networkidle', timeout: 15000 });
  await desktopPage.waitForTimeout(1500);
  await desktopPage.screenshot({ path: path.join(screenshotsDir, '04_orders_new_desktop_tab1.png') });
  console.log('✓ 04_orders_new_desktop_tab1.png captured');

  console.log('\n--- 5. Testing Desktop Tab 2: Measurements & Style ---');
  const desktopTab2 = desktopPage.locator('[data-testid="desktop-tab-measurements"]').first();
  if (await desktopTab2.count() > 0) {
    await desktopTab2.click();
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '05_orders_new_desktop_tab2.png') });
    console.log('✓ 05_orders_new_desktop_tab2.png captured');
  }

  console.log('\n--- 6. Testing Desktop Tab 3: Billing & Craftsman Assignment ---');
  const desktopTab3 = desktopPage.locator('[data-testid="desktop-tab-billing"]').first();
  if (await desktopTab3.count() > 0) {
    await desktopTab3.click();
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '06_orders_new_desktop_tab3.png') });
    console.log('✓ 06_orders_new_desktop_tab3.png captured');
  }

  console.log('\n--- 7. Testing Desktop English Toggle (1280x850, English Light LTR) ---');
  await desktopPage.evaluate(() => {
    localStorage.setItem('silaye_language', 'en');
    window.dispatchEvent(new CustomEvent('silaye:language-changed', { detail: 'en' }));
  });
  await desktopPage.waitForTimeout(800);
  // Switch back to Tab 1 to see full English LTR form
  const desktopTab1 = desktopPage.locator('[data-testid="desktop-tab-customer"]').first();
  if (await desktopTab1.count() > 0) {
    await desktopTab1.click();
    await desktopPage.waitForTimeout(600);
  }
  await desktopPage.screenshot({ path: path.join(screenshotsDir, '07_orders_new_desktop_en.png') });
  console.log('✓ 07_orders_new_desktop_en.png captured');

  await browser.close();
  server.close();

  console.log('\n====================================');
  console.log(`NEW BOOKING AUDIT COMPLETED. Total uncaught errors: ${errors.length}`);
  console.log('====================================\n');
  process.exit(errors.length === 0 ? 0 : 1);
});
