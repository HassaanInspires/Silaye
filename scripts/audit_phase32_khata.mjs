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

const PORT = 4124;
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
  const screenshotsDir = path.join(artifactDir, 'khata_audit_screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  console.log('\n--- 1. Testing Desktop Khata (Light Mode, Urdu) ---');
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto(`http://localhost:${PORT}/khata/`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, '01_khata_desktop_light_ur.png') });
  console.log('✓ 01_khata_desktop_light_ur.png captured');

  console.log('\n--- 2. Testing Desktop Khata (Light Mode, English Toggle) ---');
  const langToggle = page.locator('button:has-text("English (EN)"), button:has-text("English")').first();
  if (await langToggle.count() > 0 && await langToggle.isVisible()) {
    await langToggle.click();
  } else {
    await page.evaluate(() => {
      localStorage.setItem('silaye_language', 'en');
      window.dispatchEvent(new CustomEvent('silaye:language-changed', { detail: 'en' }));
    });
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '02_khata_desktop_light_en.png') });
  console.log('✓ 02_khata_desktop_light_en.png captured');

  // Toggle back to Urdu
  const urToggle = page.locator('button:has-text("اردو (UR)"), button:has-text("اردو")').first();
  if (await urToggle.count() > 0 && await urToggle.isVisible()) {
    await urToggle.click();
  } else {
    await page.evaluate(() => {
      localStorage.setItem('silaye_language', 'ur');
      window.dispatchEvent(new CustomEvent('silaye:language-changed', { detail: 'ur' }));
    });
  }
  await page.waitForTimeout(800);

  console.log('\n--- 3. Testing Desktop Statement / Detail Modal ---');
  const statementBtn = page.locator('button:has-text("اسٹیٹمنٹ"), button:has-text("Statement")').locator('visible=true').first();
  if (await statementBtn.count() > 0) {
    await statementBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '03_khata_desktop_statement_modal.png') });
    console.log('✓ 03_khata_desktop_statement_modal.png captured');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    console.log('Statement button not found on desktop');
  }

  console.log('\n--- 4. Testing Desktop New Entry Modal ---');
  const newEntryBtn = page.locator('button:has-text("نیا کھاتہ اندراج"), button:has-text("New Khata Entry"), button:has-text("+ نیا اندراج")').locator('visible=true').first();
  if (await newEntryBtn.count() > 0) {
    await newEntryBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '04_khata_desktop_entry_modal.png') });
    console.log('✓ 04_khata_desktop_entry_modal.png captured');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    console.log('New Entry button not found on desktop');
  }

  console.log('\n--- 5. Testing Mobile Khata Viewport (360x740, Urdu) ---');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(`http://localhost:${PORT}/khata/`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotsDir, '05_khata_mobile_light_ur.png') });
  console.log('✓ 05_khata_mobile_light_ur.png captured');

  console.log('\n--- 6. Testing Mobile Udhaar Filter Pill ---');
  const udhaarTab = page.locator('button:has-text("ادھار")').locator('visible=true').first();
  if (await udhaarTab.count() > 0) {
    await udhaarTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '06_khata_mobile_filter_udhaar.png') });
    console.log('✓ 06_khata_mobile_filter_udhaar.png captured');
  }

  console.log('\n--- 7. Testing Mobile WhatsApp Reminder Modal ---');
  const whatsappReminderBtn = page.locator('button[title="Send WhatsApp Reminder"], button:has-text("یاد دہانی"), button:has-text("Reminder")').locator('visible=true').first();
  if (await whatsappReminderBtn.count() > 0) {
    await whatsappReminderBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '07_khata_mobile_whatsapp_modal.png') });
    console.log('✓ 07_khata_mobile_whatsapp_modal.png captured');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  await browser.close();
  server.close();

  console.log('\n====================================');
  console.log(`KHATA AUDIT COMPLETED. Total uncaught errors: ${errors.length}`);
  console.log('====================================\n');
  process.exit(errors.length === 0 ? 0 : 1);
});
