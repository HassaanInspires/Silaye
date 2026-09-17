import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('out');
const PORT = 3567;
const outputDir = '/home/hassaan/.gemini/antigravity-cli/brain/94bc3fb8-fa08-440a-8b7c-e944c2695df2/screenshots';

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

  // Mock cached session for instant authenticated dashboard view
  const mockSession = JSON.stringify({
    user: { id: 'usr-demo-owner', email: 'owner@silaye.pk' },
    session: { access_token: 'mock-jwt-token' },
    shop: { id: 'shop-demo-1', name: 'Hassaan', plan_tier: 'PRO' },
    cachedAt: Date.now(),
  });

  const setupPageTelemetry = (page, label) => {
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warn') {
        console.log(`[BROWSER ${label} ${type.toUpperCase()}]:`, msg.text());
      }
    });
    page.on('pageerror', err => {
      console.error(`[BROWSER ${label} UNCAUGHT]:`, err.message);
    });
  };

  // -------------------------------------------------------------
  // 1. MOBILE AUDIT: LIGHT THEME + URDU (RTL)
  // -------------------------------------------------------------
  console.log('Capturing: Mobile Light Urdu...');
  const mobileUrduContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page1 = await mobileUrduContext.newPage();
  setupPageTelemetry(page1, 'Mobile-Urdu');
  await page1.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);
  await page1.goto(`http://localhost:${PORT}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await page1.waitForTimeout(1500);
  await page1.screenshot({ path: `${outputDir}/01_mobile_light_urdu.png`, fullPage: false });

  // -------------------------------------------------------------
  // 2. MOBILE AUDIT: LIGHT THEME + ENGLISH (LTR)
  // -------------------------------------------------------------
  console.log('Capturing: Mobile Light English...');
  const mobileEnContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page2 = await mobileEnContext.newPage();
  setupPageTelemetry(page2, 'Mobile-English');
  await page2.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'en');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);
  await page2.goto(`http://localhost:${PORT}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await page2.waitForTimeout(1500);
  await page2.screenshot({ path: `${outputDir}/02_mobile_light_english.png`, fullPage: false });

  // -------------------------------------------------------------
  // 3. DESKTOP AUDIT: LIGHT THEME + URDU (RTL)
  // -------------------------------------------------------------
  console.log('Capturing: Desktop Light Urdu...');
  const desktopUrduContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  const page3 = await desktopUrduContext.newPage();
  setupPageTelemetry(page3, 'Desktop-Urdu');
  await page3.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);
  await page3.goto(`http://localhost:${PORT}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await page3.waitForTimeout(1500);
  await page3.screenshot({ path: `${outputDir}/03_desktop_light_urdu.png`, fullPage: false });

  // -------------------------------------------------------------
  // 4. DESKTOP AUDIT: LIGHT THEME + ENGLISH (LTR)
  // -------------------------------------------------------------
  console.log('Capturing: Desktop Light English...');
  const desktopEnContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  const page4 = await desktopEnContext.newPage();
  setupPageTelemetry(page4, 'Desktop-English');
  await page4.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'light');
    localStorage.setItem('silaye_language', 'en');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);
  await page4.goto(`http://localhost:${PORT}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await page4.waitForTimeout(1500);
  await page4.screenshot({ path: `${outputDir}/04_desktop_light_english.png`, fullPage: false });

  // -------------------------------------------------------------
  // 5. MOBILE AUDIT: DARK THEME + URDU (RTL) - Preservation check
  // -------------------------------------------------------------
  console.log('Capturing: Mobile Dark Urdu...');
  const mobileDarkContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page5 = await mobileDarkContext.newPage();
  setupPageTelemetry(page5, 'Mobile-Dark-Urdu');
  await page5.addInitScript((session) => {
    localStorage.setItem('silaye_theme', 'dark');
    localStorage.setItem('silaye_language', 'ur');
    localStorage.setItem('silaye_cached_session', session);
  }, mockSession);
  await page5.goto(`http://localhost:${PORT}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await page5.waitForTimeout(1500);
  await page5.screenshot({ path: `${outputDir}/05_mobile_dark_urdu.png`, fullPage: false });

  console.log('All screenshots captured successfully in:', outputDir);

  await browser.close();
  server.close(() => {
    console.log('Server shut down cleanly.');
    process.exit(0);
  });
});
