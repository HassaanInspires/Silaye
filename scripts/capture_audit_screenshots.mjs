import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('out');
const PORT = 3456;

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

  const outputDir = '/home/hassaan/.gemini/antigravity-cli/brain/8c4c6918-a4b8-4cfc-8a01-7ab9d530a1ba/scratch/screenshots';
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  console.log('--- Testing 1: Light Mode Settings Page ---');
  await page.addInitScript(() => {
    try {
      localStorage.setItem('silaye_theme', 'light');
      localStorage.setItem(
        'silaye_cached_session',
        JSON.stringify({
          user: { id: 'usr-demo-owner', email: 'owner@silaye.pk' },
          session: { access_token: 'mock-jwt-token' },
          shop: { id: 'shop-demo-1', name: 'Silaye Master Tailors', plan_tier: 'PRO' },
          cachedAt: Date.now(),
        })
      );
    } catch {}
  });
  await page.goto(`http://localhost:${PORT}/settings#workshop`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(2000);
  try {
    await page.screenshot({ path: `${outputDir}/01_settings_light_mobile.png`, timeout: 10000 });
    console.log('Saved 01_settings_light_mobile.png');
  } catch (err) {
    console.warn('Screenshot 1 notice:', err.message);
  }

  console.log('--- Testing 2: Dynamic Theme Toggle to Dark Mode ---');
  try {
    const darkModeButton = page.locator('button:has-text("Dark Mode / رات کا موڈ")').first();
    if (await darkModeButton.isVisible({ timeout: 3000 })) {
      await darkModeButton.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${outputDir}/02_settings_toggled_dark_mobile.png`, timeout: 10000 });
      console.log('Saved 02_settings_toggled_dark_mobile.png');

      const lightModeButton = page.locator('button:has-text("Light Mode / دن کا موڈ")').first();
      await lightModeButton.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${outputDir}/03_settings_toggled_back_light_mobile.png`, timeout: 10000 });
      console.log('Saved 03_settings_toggled_back_light_mobile.png');
    }
  } catch (err) {
    console.warn('Screenshot 2/3 notice:', err.message);
  }

  console.log('--- Testing 3: Light Mode Login Page ---');
  try {
    const loginContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const loginPage = await loginContext.newPage();
    await loginPage.addInitScript(() => {
      try {
        localStorage.setItem('silaye_theme', 'light');
      } catch {}
    });
    await loginPage.goto(`http://localhost:${PORT}/login`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await loginPage.waitForTimeout(1500);
    await loginPage.screenshot({ path: `${outputDir}/04_login_light_mobile.png`, timeout: 10000 });
    console.log('Saved 04_login_light_mobile.png');
    await loginContext.close();
  } catch (err) {
    console.warn('Screenshot 4 notice:', err.message);
  }

  console.log('--- Testing 4: Light Mode Dashboard Page ---');
  try {
    // Re-seed authenticated session for protected internal pages
    await page.evaluate(() => {
      try {
        localStorage.setItem(
          'silaye_cached_session',
          JSON.stringify({
            user: { id: 'usr-demo-owner', email: 'owner@silaye.pk' },
            session: { access_token: 'mock-jwt-token' },
            shop: { id: 'shop-demo-1', name: 'Silaye Master Tailors', plan_tier: 'PRO' },
            cachedAt: Date.now(),
          })
        );
      } catch {}
    });
    await page.goto(`http://localhost:${PORT}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outputDir}/05_dashboard_light_mobile.png`, timeout: 10000 });
    console.log('Saved 05_dashboard_light_mobile.png');
  } catch (err) {
    console.warn('Screenshot 5 notice:', err.message);
  }

  console.log('--- Testing 5: Light Mode New Order Booking Page ---');
  try {
    await page.goto(`http://localhost:${PORT}/orders/new`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outputDir}/06_new_booking_light_mobile.png`, timeout: 10000 });
    console.log('Saved 06_new_booking_light_mobile.png');
  } catch (err) {
    console.warn('Screenshot 6 notice:', err.message);
  }

  await browser.close();
  server.close();
  console.log('Audit complete! All screenshots captured.');
  process.exit(0);
});
