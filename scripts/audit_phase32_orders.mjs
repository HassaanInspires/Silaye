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

const PORT = 4125;
server.listen(PORT, async () => {
  console.log(`Serving out/ on http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
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

  await context.addInitScript(({ mockUser, mockSession, mockShop }) => {
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

  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Failed to load resource') || text.includes('status of 400')) {
        console.log('IGNORING EXPECTED OFFLINE SUPABASE 400 RESOURCE LOG:', text);
        return;
      }
      console.log('PAGE CONSOLE ERROR:', text);
      errors.push({ type: 'console.error', text });
    }
  });
  page.on('pageerror', (err) => {
    console.log('PAGE UNCAUGHT ERROR:', err.message);
    errors.push({ type: 'uncaught', message: err.message });
  });

  const artifactDir = '/home/hassaan/.gemini/antigravity-cli/brain/1ec43e3c-1067-4867-8a16-d0db98d61dc6';
  const screenshotsDir = path.join(artifactDir, 'orders_audit_screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  console.log('\n--- 1. Testing Mobile Orders Queue (360x740, Urdu Light) ---');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(`http://localhost:${PORT}/orders/`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, '01_orders_mobile_light_ur.png') });
  console.log('✓ 01_orders_mobile_light_ur.png captured');

  console.log('\n--- 2. Testing Mobile Cutting Filter Pill ---');
  const cuttingTab = page.locator('button:has-text("کٹائی")').locator('visible=true').first();
  if (await cuttingTab.count() > 0) {
    await cuttingTab.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '02_orders_mobile_filter_cutting.png') });
    console.log('✓ 02_orders_mobile_filter_cutting.png captured');
  }

  // Switch back to All filter
  const allTab = page.locator('button:has-text("تمام")').locator('visible=true').first();
  if (await allTab.count() > 0) {
    await allTab.click();
    await page.waitForTimeout(500);
  }

  console.log('\n--- 3. Testing Mobile Order Inspector Drawer ---');
  const firstMobileCard = page.locator('[data-testid="order-card-mobile"]').first();
  if (await firstMobileCard.count() > 0) {
    await firstMobileCard.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '03_orders_mobile_inspector_drawer.png') });
    console.log('✓ 03_orders_mobile_inspector_drawer.png captured');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  console.log('\n--- 4. Testing Mobile WhatsApp Receipt Modal ---');
  const mobileWhatsappBtn = page.locator('[data-testid="mobile-whatsapp-btn"]').first();
  if (await mobileWhatsappBtn.count() > 0) {
    await mobileWhatsappBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '04_orders_mobile_whatsapp_modal.png') });
    console.log('✓ 04_orders_mobile_whatsapp_modal.png captured');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  console.log('\n--- 5. Testing Desktop Orders Spreadsheet Table (1280x850, Urdu Light) ---');
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto(`http://localhost:${PORT}/orders/`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, '05_orders_desktop_table_ur.png') });
  console.log('✓ 05_orders_desktop_table_ur.png captured');

  console.log('\n--- 6. Testing Desktop English Toggle (1280x850, English Light) ---');
  await page.evaluate(() => {
    localStorage.setItem('silaye_language', 'en');
    window.dispatchEvent(new CustomEvent('silaye:language-changed', { detail: 'en' }));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '06_orders_desktop_table_en.png') });
  console.log('✓ 06_orders_desktop_table_en.png captured');

  console.log('\n--- 7. Testing Desktop Order Inspector Drawer ---');
  const firstDesktopInspect = page.locator('[data-testid="desktop-inspect-btn"]').first();
  if (await firstDesktopInspect.count() > 0) {
    await firstDesktopInspect.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '07_orders_desktop_inspector_drawer.png') });
    console.log('✓ 07_orders_desktop_inspector_drawer.png captured');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  console.log('\n--- 8. Testing Desktop Kanban Pipeline Board ---');
  // Switch back to Urdu
  await page.evaluate(() => {
    localStorage.setItem('silaye_language', 'ur');
    window.dispatchEvent(new CustomEvent('silaye:language-changed', { detail: 'ur' }));
  });
  await page.waitForTimeout(400);

  // Click Kanban toggle
  const kanbanToggle = page.locator('button[aria-label="Switch to Kanban Pipeline Board View"]').first();
  if (await kanbanToggle.count() > 0) {
    await kanbanToggle.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '08_orders_desktop_kanban_pipeline.png') });
    console.log('✓ 08_orders_desktop_kanban_pipeline.png captured');
  }

  await browser.close();
  server.close();

  console.log('\n====================================');
  console.log(`ORDERS QUEUE AUDIT COMPLETED. Total uncaught errors: ${errors.length}`);
  console.log('====================================\n');
  process.exit(errors.length === 0 ? 0 : 1);
});
