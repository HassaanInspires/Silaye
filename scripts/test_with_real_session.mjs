import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

const outDir = path.join(__dirname, '..', 'out');

// Reliable static server for 'out' directory
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath.startsWith('/')) reqPath = reqPath.slice(1);

  let candidates = [
    path.join(outDir, reqPath),
    path.join(outDir, reqPath, 'index.html'),
    path.join(outDir, `${reqPath}.html`),
  ];

  let resolvedFile = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());

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
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(resolvedFile).pipe(res);
  } else {
    const notFound = path.join(outDir, '404.html');
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(notFound).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

const PORT = 4125;
server.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  console.log('Logging in with real Supabase account...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'hassaanm737@gmail.com',
    password: '12345678',
  });

  if (error) {
    console.error('Supabase sign in failed:', error.message);
    server.close();
    process.exit(1);
  }

  console.log('Logged in! User ID:', data.user.id);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
  });

  await context.addInitScript(
    ({ session, user }) => {
      localStorage.setItem('silaye_theme', 'light');
      localStorage.setItem('silaye_language', 'ur');
      localStorage.setItem(
        'silaye_cached_session',
        JSON.stringify({
          user,
          session,
          cachedAt: Date.now(),
        })
      );
    },
    { session: data.session, user: data.user }
  );

  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
      errors.push({ type: 'console', text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    console.log('BROWSER UNCAUGHT PAGEERROR:', err.message, err.stack);
    errors.push({ type: 'pageerror', text: err.message, stack: err.stack });
  });

  const pages = [
    { name: 'dashboard', path: '/dashboard/' },
    { name: 'orders_new', path: '/orders/new/' },
    { name: 'orders', path: '/orders/' },
    { name: 'khata', path: '/khata/' },
    { name: 'customers', path: '/customers/' },
  ];

  const artifactDir = '/home/hassaan/.gemini/antigravity-cli/brain/1ec43e3c-1067-4867-8a16-d0db98d61dc6/real_audit';
  fs.mkdirSync(artifactDir, { recursive: true });

  for (const p of pages) {
    console.log(`\nTesting ${p.name} with real live session...`);
    try {
      await page.goto(`http://localhost:${PORT}${p.path}`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(2000);
      
      const shotPath = path.join(artifactDir, `${p.name}_real_light.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      console.log(`✓ Screenshot captured to ${shotPath}`);
    } catch (e) {
      console.log(`✗ Navigation failed on ${p.name}:`, e.message);
    }
  }

  console.log('\n--- AUDIT SUMMARY ---');
  console.log('Total uncaught errors:', errors.length);
  console.log(JSON.stringify(errors, null, 2));

  await browser.close();
  server.close();
  process.exit(0);
});
