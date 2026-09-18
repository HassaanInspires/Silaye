import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('out');
const PORT = 3874;
const outputDir = '/home/hassaan/.gemini/antigravity-cli/brain/94bc3fb8-fa08-440a-8b7c-e944c2695df2/screenshots/phase30_orders_queue';

fs.mkdirSync(outputDir, { recursive: true });

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
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
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

const mockSessionObj = {
  user: {
    id: 'usr-demo-owner',
    email: 'owner@silaye.pk',
    user_metadata: { role: 'SHOP_OWNER', full_name: 'Master Tariq' },
  },
  session: {
    access_token: 'mock-token',
    expires_at: 9999999999,
    token_type: 'bearer',
    user: {
      id: 'usr-demo-owner',
      email: 'owner@silaye.pk',
      user_metadata: { role: 'SHOP_OWNER', full_name: 'Master Tariq' },
    },
  },
  shop: {
    id: 'shp-demo-001',
    name: 'Silaye Master Atelier',
    owner_phone: '03001234567',
    plan_tier: 'PRO',
    subscription_status: 'ACTIVE',
  },
  role: 'SHOP_OWNER',
  cachedAt: Date.now(),
};

async function runAudit() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[Audit] Static file server listening at http://localhost:${PORT}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const results = [];

  try {
    // =========================================================================
    // 1. MOBILE TESTS (Viewport 360 x 740)
    // =========================================================================
    const mobileContext = await browser.newContext({
      viewport: { width: 360, height: 740 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
    });

    await mobileContext.addInitScript(({ sessionData }) => {
      localStorage.setItem('silaye_cached_session', JSON.stringify(sessionData));
      localStorage.setItem('silaye_theme', 'light');
      localStorage.setItem('silaye_language', 'ur');
      localStorage.setItem('silaye:nav-layout', 'tabs');
    }, { sessionData: mockSessionObj });

    const mobilePage = await mobileContext.newPage();

    // 1.1 Mobile Orders Queue in Atelier Light Theme (Urdu)
    console.log('[Audit 1.1] Testing Mobile Orders Queue in Light Theme (Urdu)...');
    await mobilePage.goto(`http://localhost:${PORT}/orders`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    const mobileScreenshot1 = path.join(outputDir, '01_mobile_orders_queue_light_ur.png');
    await mobilePage.screenshot({ path: mobileScreenshot1, fullPage: false });
    console.log(`[Audit 1.1] Saved screenshot: ${mobileScreenshot1}`);
    results.push({ test: '01_mobile_orders_queue_light_ur', status: 'PASS' });

    // 1.2 Mobile Filter Switching (Click Cutting filter pill)
    console.log('[Audit 1.2] Testing Mobile Cutting Filter Pill...');
    const cuttingFilterBtn = mobilePage.locator('button:has-text("کٹنگ")').first();
    if (await cuttingFilterBtn.isVisible()) {
      await cuttingFilterBtn.click();
      await mobilePage.waitForTimeout(400);
      const mobileScreenshot2 = path.join(outputDir, '02_mobile_cutting_filter_light.png');
      await mobilePage.screenshot({ path: mobileScreenshot2, fullPage: false });
      console.log(`[Audit 1.2] Saved screenshot: ${mobileScreenshot2}`);
      results.push({ test: '02_mobile_cutting_filter_light', status: 'PASS' });
      // Reset back to all
      const allFilterBtn = mobilePage.locator('button:has-text("تمام")').first();
      await allFilterBtn.click();
      await mobilePage.waitForTimeout(400);
    }

    // 1.3 Mobile Slide-Out Inspector Drawer
    console.log('[Audit 1.3] Testing Mobile Slide-Out Inspector Drawer...');
    const firstOrderCard = mobilePage.locator('[data-testid="order-card-mobile"]').first();
    await firstOrderCard.waitFor({ state: 'visible', timeout: 5000 });
    await firstOrderCard.click();
    await mobilePage.waitForTimeout(600);

    const drawer = mobilePage.locator('[role="dialog"]');
    await drawer.waitFor({ state: 'visible', timeout: 5000 });
    const mobileScreenshot3 = path.join(outputDir, '03_mobile_order_inspector_drawer_light.png');
    await mobilePage.screenshot({ path: mobileScreenshot3, fullPage: false });
    console.log(`[Audit 1.3] Saved screenshot: ${mobileScreenshot3}`);
    results.push({ test: '03_mobile_order_inspector_drawer_light', status: 'PASS' });

    // Close drawer
    const closeBtn = mobilePage.locator('button[aria-label="Close Inspector Drawer"]');
    await closeBtn.click();
    await mobilePage.waitForTimeout(400);

    // 1.4 Mobile WhatsApp Receipt Modal Trigger
    console.log('[Audit 1.4] Testing Mobile WhatsApp Receipt Modal Trigger...');
    const whatsappBtn = mobilePage.locator('[data-testid="mobile-whatsapp-btn"]').first();
    await whatsappBtn.waitFor({ state: 'visible', timeout: 5000 });
    await whatsappBtn.click();
    await mobilePage.waitForTimeout(600);
    const mobileScreenshot4 = path.join(outputDir, '04_mobile_whatsapp_modal.png');
    await mobilePage.screenshot({ path: mobileScreenshot4, fullPage: false });
    console.log(`[Audit 1.4] Saved screenshot: ${mobileScreenshot4}`);
    results.push({ test: '04_mobile_whatsapp_modal', status: 'PASS' });
    // Close modal
    const closeWhatsAppBtn = mobilePage.locator('button:has-text("بند کریں"), button:has-text("Close")').first();
    if (await closeWhatsAppBtn.isVisible()) {
      await closeWhatsAppBtn.click();
      await mobilePage.waitForTimeout(300);
    }

    // 1.5 Mobile Dark Mode Orders Queue
    console.log('[Audit 1.5] Testing Mobile Orders Queue in Dark Mode...');
    await mobileContext.close();

    const mobileDarkContext = await browser.newContext({
      viewport: { width: 360, height: 740 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
    });

    await mobileDarkContext.addInitScript(({ sessionData }) => {
      localStorage.setItem('silaye_cached_session', JSON.stringify(sessionData));
      localStorage.setItem('silaye_theme', 'dark');
      localStorage.setItem('silaye_language', 'ur');
      localStorage.setItem('silaye:nav-layout', 'tabs');
    }, { sessionData: mockSessionObj });

    const darkPage = await mobileDarkContext.newPage();
    darkPage.on('console', (msg) => {
      if (msg.type() === 'error') console.error('[DarkPage Console Error]:', msg.text());
    });
    darkPage.on('pageerror', (err) => console.error('[DarkPage Error]:', err.message));

    await darkPage.goto(`http://localhost:${PORT}/orders`, { waitUntil: 'networkidle' });
    await darkPage.waitForTimeout(800);
    const mobileScreenshot5 = path.join(outputDir, '05_mobile_orders_queue_dark.png');
    await darkPage.screenshot({ path: mobileScreenshot5, fullPage: false });
    console.log(`[Audit 1.5] Saved screenshot: ${mobileScreenshot5}`);
    results.push({ test: '05_mobile_orders_queue_dark', status: 'PASS' });
    await mobileDarkContext.close();

    // =========================================================================
    // 2. DESKTOP TESTS (Viewport 1280 x 800)
    // =========================================================================
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    await desktopContext.addInitScript(({ sessionData }) => {
      localStorage.setItem('silaye_cached_session', JSON.stringify(sessionData));
      localStorage.setItem('silaye_theme', 'light');
      localStorage.setItem('silaye_language', 'ur');
    }, { sessionData: mockSessionObj });

    const desktopPage = await desktopContext.newPage();
    desktopPage.on('console', (msg) => {
      if (msg.type() === 'error') console.error('[Desktop Console Error]:', msg.text());
    });
    desktopPage.on('pageerror', (err) => console.error('[Desktop Page Error]:', err.stack || err.message));

    console.log('[Audit 2.1] Testing Desktop Orders Queue Spreadsheet Table (Light Theme)...');
    await desktopPage.goto(`http://localhost:${PORT}/orders`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(800);

    const desktopScreenshot1 = path.join(outputDir, '06_desktop_orders_table_light.png');
    await desktopPage.screenshot({ path: desktopScreenshot1, fullPage: false });
    console.log(`[Audit 2.1] Saved screenshot: ${desktopScreenshot1}`);
    results.push({ test: '06_desktop_orders_table_light', status: 'PASS' });

    // Open Inspector Drawer on Desktop
    console.log('[Audit 2.2] Testing Desktop Slide-Out Inspector Drawer...');
    const desktopRow = desktopPage.locator('[data-testid="order-row-desktop"]').first();
    await desktopRow.waitFor({ state: 'visible', timeout: 5000 });
    await desktopRow.click();
    await desktopPage.waitForTimeout(600);

    const desktopDrawer = desktopPage.locator('[role="dialog"]');
    await desktopDrawer.waitFor({ state: 'visible', timeout: 5000 });
    const desktopScreenshot2 = path.join(outputDir, '07_desktop_inspector_drawer_light.png');
    await desktopPage.screenshot({ path: desktopScreenshot2, fullPage: false });
    console.log(`[Audit 2.2] Saved screenshot: ${desktopScreenshot2}`);
    results.push({ test: '07_desktop_inspector_drawer_light', status: 'PASS' });

    // Close drawer
    const desktopCloseBtn = desktopPage.locator('button[aria-label="Close Inspector Drawer"]');
    await desktopCloseBtn.click();
    await desktopPage.waitForTimeout(400);

    // Switch to Kanban mode
    console.log('[Audit 2.3] Testing Desktop Kanban Board Mode...');
    const kanbanToggle = desktopPage.locator('button[aria-label="Switch to Kanban Pipeline Board View"]');
    if (await kanbanToggle.isVisible()) {
      await kanbanToggle.click();
      await desktopPage.waitForTimeout(600);
      const desktopScreenshot3 = path.join(outputDir, '08_desktop_kanban_board_light.png');
      await desktopPage.screenshot({ path: desktopScreenshot3, fullPage: false });
      console.log(`[Audit 2.3] Saved screenshot: ${desktopScreenshot3}`);
      results.push({ test: '08_desktop_kanban_board_light', status: 'PASS' });
    }

    // =========================================================================
    // 3. PUBLIC ORDER TRACKING PORTAL (/track/[orderId])
    // =========================================================================
    console.log('[Audit 3.1] Testing Public Customer Order Tracking Portal (/track/DP-2026-0801)...');
    await desktopPage.goto(`http://localhost:${PORT}/track/DP-2026-0801`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(800);

    const trackingScreenshot = path.join(outputDir, '09_customer_order_tracking_portal.png');
    await desktopPage.screenshot({ path: trackingScreenshot, fullPage: false });
    console.log(`[Audit 3.1] Saved screenshot: ${trackingScreenshot}`);
    results.push({ test: '09_customer_order_tracking_portal', status: 'PASS' });

    await desktopContext.close();

    console.log('\n================ AUDIT SUMMARY ================');
    results.forEach((r) => console.log(`  ✔ [${r.status}] ${r.test}`));
    console.log('================================================\n');

    fs.writeFileSync(
      path.join(outputDir, 'audit_summary.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
    );
  } finally {
    await browser.close();
    server.close();
  }
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
