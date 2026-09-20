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

server.listen(4123, async () => {
  console.log('Serving out/ on http://localhost:4123');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Mock authenticated session payload in localStorage
  await context.addInitScript(() => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'ur');

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
  });

  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('PAGE CONSOLE ERROR:', msg.text());
      errors.push({ type: 'console.error', text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    console.log('PAGE UNCAUGHT ERROR:', err.message, err.stack);
    errors.push({ type: 'uncaught', message: err.message, stack: err.stack });
  });

  const pagesToTest = [
    { name: 'home', url: 'http://localhost:4123/' },
    { name: 'dashboard', url: 'http://localhost:4123/dashboard/' },
    { name: 'orders_new', url: 'http://localhost:4123/orders/new/' },
    { name: 'orders', url: 'http://localhost:4123/orders/' },
    { name: 'khata', url: 'http://localhost:4123/khata/' },
    { name: 'customers', url: 'http://localhost:4123/customers/' },
  ];

  const artifactDir = '/home/hassaan/.gemini/antigravity-cli/brain/1ec43e3c-1067-4867-8a16-d0db98d61dc6';
  const auditDir = path.join(artifactDir, 'audit_screenshots');
  fs.mkdirSync(auditDir, { recursive: true });

  for (const p of pagesToTest) {
    console.log(`\n--- Testing page: ${p.name} (${p.url}) ---`);
    try {
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);

      // Desktop screenshot
      await page.setViewportSize({ width: 1280, height: 850 });
      await page.waitForTimeout(500);
      const desktopPath = path.join(auditDir, `${p.name}_desktop_light.png`);
      await page.screenshot({ path: desktopPath, fullPage: false });

      // Mobile screenshot (360x740)
      await page.setViewportSize({ width: 360, height: 740 });
      await page.waitForTimeout(500);
      const mobilePath = path.join(auditDir, `${p.name}_mobile_light.png`);
      await page.screenshot({ path: mobilePath, fullPage: false });

      console.log(`✓ ${p.name} captured`);
    } catch (e) {
      console.log(`✗ Error on ${p.name}:`, e.message);
    }
  }

  await browser.close();
  server.close();
  console.log('\nAudit complete! Total errors recorded:', errors.length);
  if (errors.length > 0) {
    console.log(JSON.stringify(errors, null, 2));
  }
});
