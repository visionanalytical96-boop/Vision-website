/** Screenshot helper: node scripts/shot.mjs <path> <out.png> [width] [--full] */
import { chromium } from 'playwright-core';

const [, , path = '/', out = 'shot.png', width = '1440', ...flags] = process.argv;
const full = flags.includes('--full');
const base = process.env.BASE_URL ?? 'http://localhost:3210';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: Number(width), height: 1000 } });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const res = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(700);
await page.screenshot({ path: out, fullPage: full });
await browser.close();

console.log(`${path} -> ${res.status()} | ${out}${errors.length ? `\nCONSOLE ERRORS:\n- ${errors.join('\n- ')}` : ' | no console errors'}`);
