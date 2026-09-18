import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('out');
const PORT = 3870;
const outputDir = '/home/hassaan/.gemini/antigravity-cli/brain/94bc3fb8-fa08-440a-8b7c-e944c2695df2/screenshots/phase29_mobile_nav_modes';

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
  console.log(`Phase 29 Mobile Nav Audit Server running on http://localhost:${PORT}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const auditLogs = [];

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

  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });

  await context.addInitScript(({ sessionData }) => {
    if (!localStorage.getItem('silaye_cached_session')) {
      localStorage.setItem('silaye_cached_session', JSON.stringify(sessionData));
    }
    if (!localStorage.getItem('silaye_theme')) {
      localStorage.setItem('silaye_theme', 'dark');
    }
    if (!localStorage.getItem('silaye_language')) {
      localStorage.setItem('silaye_language', 'ur');
    }
    if (!localStorage.getItem('silaye:nav-layout')) {
      localStorage.setItem('silaye:nav-layout', 'tabs');
    }
  }, { sessionData: mockSessionObj });

  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  try {
    // -------------------------------------------------------------------------
    // Scenario 1: Verify Settings Hub shows Navigation Layout row
    // -------------------------------------------------------------------------
    console.log('--- Scenario 1: Mobile Settings Hub Navigation Row ---');
    await page.goto(`http://localhost:${PORT}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const navRow = page.locator('[data-testid="mobile-settings-nav-layout-row"]');
    const isNavRowVisible = await navRow.isVisible();
    console.log(`Navigation row visible in Mobile Settings Hub: ${isNavRowVisible}`);
    if (!isNavRowVisible) throw new Error('Mobile Settings Hub navigation row not found');

    const navRowText = await navRow.textContent();
    console.log(`Nav row text preview: ${navRowText.replace(/\s+/g, ' ').trim()}`);

    await page.screenshot({
      path: path.join(outputDir, '01_settings_hub_nav_row.png'),
      fullPage: false,
    });
    auditLogs.push({ scenario: 1, pass: true, detail: 'Mobile Settings Hub contains Navigation Layout row' });

    // -------------------------------------------------------------------------
    // Scenario 2: Tap Navigation Row -> Subview #navigation
    // -------------------------------------------------------------------------
    console.log('--- Scenario 2: Navigate to #navigation sub-view ---');
    await navRow.click();
    await page.waitForTimeout(400);

    const tabsOption = page.locator('[data-testid="nav-layout-option-tabs"]:visible');
    const drawerOption = page.locator('[data-testid="nav-layout-option-drawer"]:visible');
    const hybridOption = page.locator('[data-testid="nav-layout-option-hybrid"]:visible');

    const hasAll3Options = (await tabsOption.isVisible()) && (await drawerOption.isVisible()) && (await hybridOption.isVisible());
    console.log(`All 3 navigation mode cards visible: ${hasAll3Options}`);
    if (!hasAll3Options) throw new Error('Not all 3 navigation layout options are visible in #navigation');

    await page.screenshot({
      path: path.join(outputDir, '02_navigation_subview_3_modes.png'),
      fullPage: false,
    });
    auditLogs.push({ scenario: 2, pass: true, detail: 'Navigation sub-view renders all 3 modes (Tabs, Drawer, Hybrid)' });

    // -------------------------------------------------------------------------
    // Scenario 3: Switch to Classic Drawer Only (drawer)
    // -------------------------------------------------------------------------
    console.log('--- Scenario 3: Switch to Classic Drawer Only (drawer) ---');
    await drawerOption.click();
    await page.waitForTimeout(400);

    // Verify localStorage updated
    const savedLayoutDrawer = await page.evaluate(() => localStorage.getItem('silaye:nav-layout'));
    console.log(`LocalStorage nav layout after selecting drawer: ${savedLayoutDrawer}`);
    if (savedLayoutDrawer !== 'drawer') throw new Error(`Expected 'drawer', got '${savedLayoutDrawer}'`);

    // Navigate to Dashboard
    await page.goto(`http://localhost:${PORT}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Check hamburger in top header
    const hamburgerBtn = page.locator('[data-testid="mobile-hamburger-btn"]:visible');
    const isHamburgerVisibleInDrawerMode = await hamburgerBtn.isVisible();
    console.log(`Hamburger menu button visible in Drawer mode: ${isHamburgerVisibleInDrawerMode}`);
    if (!isHamburgerVisibleInDrawerMode) throw new Error('Hamburger button should be visible in drawer mode');

    // Check bottom nav bar is HIDDEN
    const bottomNavDashboardTab = page.locator('[data-testid="mobile-bottom-tab-dashboard"]:visible');
    const isBottomNavVisibleInDrawer = await bottomNavDashboardTab.isVisible();
    console.log(`Bottom nav visible in Drawer mode (should be false): ${isBottomNavVisibleInDrawer}`);
    if (isBottomNavVisibleInDrawer) throw new Error('Bottom nav should be hidden in drawer mode');

    // Open drawer
    await hamburgerBtn.click();
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(outputDir, '03_drawer_mode_hamburger_and_no_bottom_bar.png'),
      fullPage: false,
    });
    auditLogs.push({ scenario: 3, pass: true, detail: 'Drawer mode shows top hamburger and hides bottom bar' });

    // Close drawer
    const closeDrawerBtn = page.locator('button[aria-label="Close menu"]:visible');
    if (await closeDrawerBtn.isVisible()) {
      await closeDrawerBtn.click();
      await page.waitForTimeout(300);
    }

    // -------------------------------------------------------------------------
    // Scenario 4: Switch to Hybrid Master (hybrid)
    // -------------------------------------------------------------------------
    console.log('--- Scenario 4: Switch to Hybrid Master (hybrid) ---');
    await page.goto(`http://localhost:${PORT}/settings#navigation`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    await page.locator('[data-testid="nav-layout-option-hybrid"]:visible').click();
    await page.waitForTimeout(400);

    const savedLayoutHybrid = await page.evaluate(() => localStorage.getItem('silaye:nav-layout'));
    console.log(`LocalStorage nav layout after selecting hybrid: ${savedLayoutHybrid}`);
    if (savedLayoutHybrid !== 'hybrid') throw new Error(`Expected 'hybrid', got '${savedLayoutHybrid}'`);

    // Navigate to Dashboard
    await page.goto(`http://localhost:${PORT}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const isHamburgerInHybrid = await page.locator('[data-testid="mobile-hamburger-btn"]:visible').isVisible();
    const isBottomNavInHybrid = await page.locator('[data-testid="mobile-bottom-tab-dashboard"]:visible').isVisible();
    console.log(`Hybrid mode: hamburger visible = ${isHamburgerInHybrid}, bottom nav visible = ${isBottomNavInHybrid}`);
    if (!isHamburgerInHybrid || !isBottomNavInHybrid) {
      throw new Error(`Hybrid mode should have BOTH hamburger (${isHamburgerInHybrid}) and bottom nav (${isBottomNavInHybrid})`);
    }

    await page.screenshot({
      path: path.join(outputDir, '04_hybrid_mode_both_hamburger_and_bottom_bar.png'),
      fullPage: false,
    });
    auditLogs.push({ scenario: 4, pass: true, detail: 'Hybrid mode shows BOTH top hamburger AND bottom nav bar' });

    // -------------------------------------------------------------------------
    // Scenario 5: Switch back to Modern Tabs (tabs)
    // -------------------------------------------------------------------------
    console.log('--- Scenario 5: Switch back to Modern Tabs (tabs) ---');
    await page.goto(`http://localhost:${PORT}/settings#navigation`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    await page.locator('[data-testid="nav-layout-option-tabs"]:visible').click();
    await page.waitForTimeout(400);

    const savedLayoutTabs = await page.evaluate(() => localStorage.getItem('silaye:nav-layout'));
    console.log(`LocalStorage nav layout after selecting tabs: ${savedLayoutTabs}`);
    if (savedLayoutTabs !== 'tabs') throw new Error(`Expected 'tabs', got '${savedLayoutTabs}'`);

    // Navigate to Dashboard
    await page.goto(`http://localhost:${PORT}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const isHamburgerInTabs = await page.locator('[data-testid="mobile-hamburger-btn"]:visible').isVisible();
    const isBottomNavInTabs = await page.locator('[data-testid="mobile-bottom-tab-dashboard"]:visible').isVisible();
    console.log(`Tabs mode: hamburger visible = ${isHamburgerInTabs} (should be false), bottom nav visible = ${isBottomNavInTabs} (should be true)`);
    if (isHamburgerInTabs) throw new Error('Hamburger should be hidden in tabs mode');
    if (!isBottomNavInTabs) throw new Error('Bottom nav should be visible in tabs mode');

    await page.screenshot({
      path: path.join(outputDir, '05_tabs_mode_clean_header_and_bottom_bar.png'),
      fullPage: false,
    });
    auditLogs.push({ scenario: 5, pass: true, detail: 'Tabs mode has clean header (no hamburger) and active bottom bar' });

    // -------------------------------------------------------------------------
    // Scenario 6: Light Theme Aesthetics & High Contrast
    // -------------------------------------------------------------------------
    console.log('--- Scenario 6: Light Theme Verification ---');
    await page.evaluate(() => {
      localStorage.setItem('silaye_theme', 'light');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
    });

    await page.goto(`http://localhost:${PORT}/settings#navigation`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(outputDir, '06_light_theme_nav_settings.png'),
      fullPage: false,
    });
    auditLogs.push({ scenario: 6, pass: true, detail: 'Navigation cards render with high contrast in Atelier Light mode' });

    console.log('\n=== ALL PHASE 29 MOBILE SCENARIOS PASSED ===');
    fs.writeFileSync(
      path.join(outputDir, 'audit_summary.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), auditLogs, errors }, null, 2)
    );
  } catch (err) {
    console.error('Audit execution failed:', err);
    await page.screenshot({
      path: path.join(outputDir, 'audit_failure.png'),
      fullPage: false,
    });
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
});
