/** Logs in as admin and screenshots the panel: node scripts/shot-admin.mjs <path> <out.png> */
import { chromium } from 'playwright-core';

const [, , path = '/admin', out = 'admin.png'] = process.argv;
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

await ctx.request.post(`${BASE}/api/auth/admin`, {
  data: { email: 'admin@bharatstay.in', password: 'bharat@123' },
});

const page = await ctx.newPage();
const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`${path} -> ${res.status()} | ${out}`);
