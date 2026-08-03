/**
 * End-to-end check of the flows that matter:
 *  - guards actually block
 *  - admin login works and a price edit reaches a logged-out visitor
 *  - a partner application with a photo becomes a live listing on approval
 *  - OTP rejects a wrong code and accepts the right one
 *  - every public route renders without console errors
 */
import { chromium } from 'playwright-core';

// Use a hostname, not a bare IP: the session cookie is Secure in production and
// Playwright's request context only sends Secure cookies over https or localhost.
const BASE = process.env.BASE_URL ?? 'http://localhost:3210';
if (/^https?:\/\/\d+\.\d+\.\d+\.\d+/.test(BASE)) {
  console.error('BASE_URL mein IP ki jagah localhost use kijiye — warna admin session cookie nahi jaata.');
  process.exit(1);
}
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@bharatstay.in',
  password: process.env.ADMIN_PASSWORD,
};
if (!ADMIN.password) {
  console.error('ADMIN_PASSWORD set kijiye — yeh script koi default password nahi rakhti.');
  process.exit(1);
}

let pass = 0;
let fail = 0;
/** Waits for a locator instead of sampling it once, so a slow render is not a failure. */
const visible = (locator, timeout = 15000) =>
  locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);

const ok = (name, cond, extra = '') => {
  (cond ? pass++ : fail++);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra && !cond ? ` — ${extra}` : ''}`);
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// A tiny valid PNG to upload.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// ---------------------------------------------------------------- guards
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  ok('guard: /admin redirects anonymous to login', new URL(page.url()).pathname === '/login', page.url());

  const api = await ctx.request.post(`${BASE}/api/admin/applications`, {
    data: { id: 'x', action: 'approve' },
    failOnStatusCode: false,
  });
  ok('guard: admin API returns 401 without session', api.status() === 401, `got ${api.status()}`);

  const dash = await ctx.newPage();
  await dash.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  ok('guard: /dashboard redirects anonymous to login', new URL(dash.url()).pathname === '/login', dash.url());
  await ctx.close();
}

// ------------------------------------------------- partner application
let token = null;
const businessName = `Test Farmhouse ${Date.now()}`;
{
  const ctx = await browser.newContext();
  const res = await ctx.request.post(`${BASE}/api/partner/apply`, {
    multipart: {
      kind: 'STAY',
      stayType: 'FARM_STAY',
      businessName,
      ownerName: 'Ravi Patil',
      email: 'ravi@example.com',
      phone: '9876543210',
      city: 'Bhivpuri',
      area: 'Bhivpuri Road',
      address: 'Near Bhivpuri Road station, Bhivpuri, Raigad 410201',
      description: 'Riverside farmhouse with a big lawn, bonfire pit and home cooked Maharashtrian food.',
      price: '4200',
      rooms: '3',
      amenities: 'Parking',
      photos: { name: 'a.png', mimeType: 'image/png', buffer: PNG },
    },
    failOnStatusCode: false,
  });
  const json = await res.json().catch(() => ({}));
  token = json.token ?? null;
  ok('partner: application submits', res.ok() && Boolean(token), JSON.stringify(json).slice(0, 160));

  if (token) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/partner/status/${token}`, { waitUntil: 'networkidle' });
    ok('partner: applicant can read status without an account', await visible(page.getByText(businessName).first()));
  }
  await ctx.close();
}

// --------------------------------------------------------- admin flows
{
  const ctx = await browser.newContext();
  const login = await ctx.request.post(`${BASE}/api/auth/admin`, {
    data: { email: ADMIN.email, password: 'wrong-password' },
    failOnStatusCode: false,
  });
  ok('admin: wrong password rejected', login.status() === 401, `got ${login.status()}`);

  const good = await ctx.request.post(`${BASE}/api/auth/admin`, { data: ADMIN, failOnStatusCode: false });
  ok('admin: correct password accepted', good.ok(), `got ${good.status()}`);

  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  ok('admin: overview reachable after login', new URL(page.url()).pathname === '/admin', page.url());

  // approve the application we just submitted
  await page.goto(`${BASE}/admin/applications`, { waitUntil: 'networkidle' });
  const card = page.locator('article').filter({ hasText: businessName }).first();
  ok('admin: new application shows in the queue', await visible(card));

  await card.getByRole('button', { name: /Approve karke live karo/ }).click();
  await page.waitForTimeout(2500);

  // ...and confirm it is now public
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`${BASE}/search?q=${encodeURIComponent(businessName)}`, { waitUntil: 'networkidle' });
  const live = await visible(anonPage.getByText(businessName).first());
  ok('approval: listing is live for a logged-out visitor', live);

  const priceShown = await visible(anonPage.getByText('₹4,200').first());
  ok('approval: submitted price carried over', priceShown);
  await anon.close();

  // ---- price edit round trip
  await page.goto(`${BASE}/admin/stays`, { waitUntil: 'networkidle' });
  const search = page.getByPlaceholder('Naam, sheher ya area se dhoondo');
  await search.fill(businessName);
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Edit' }).first().click();
  const priceInput = page.locator('#price');
  await priceInput.fill('5555');
  await page.getByRole('button', { name: /Save karo/ }).click();
  await page.waitForTimeout(2500);

  const anon2 = await browser.newContext();
  const anon2Page = await anon2.newPage();
  await anon2Page.goto(`${BASE}/search?q=${encodeURIComponent(businessName)}`, { waitUntil: 'networkidle' });
  const newPrice = await visible(anon2Page.getByText('₹5,555').first());
  ok('admin: price edit visible to a logged-out visitor', newPrice);
  await anon2.close();

  // ---- service toggle hides a section
  await page.goto(`${BASE}/admin/services`, { waitUntil: 'networkidle' });
  await page.getByRole('switch', { name: /Restaurants & Dining band karo/ }).click();
  await page.waitForTimeout(2000);

  const anon3 = await browser.newContext();
  const anon3Page = await anon3.newPage();
  const restRes = await anon3Page.goto(`${BASE}/restaurants`, { waitUntil: 'domcontentloaded' });
  ok('services: disabled service 404s on the public site', restRes.status() === 404, `got ${restRes.status()}`);
  await anon3.close();

  // turn it back on so the site is left usable
  await page.goto(`${BASE}/admin/services`, { waitUntil: 'networkidle' });
  await page.getByRole('switch', { name: /Restaurants & Dining chalu karo/ }).click();
  await page.waitForTimeout(2000);

  await ctx.close();
}

// -------------------------------------------------------- upi payments
{
  const ctx = await browser.newContext();
  await ctx.request.post(`${BASE}/api/auth/admin`, { data: ADMIN });

  // Owner sets a UPI ID; without one customers cannot pay at all.
  const setUpi = await ctx.request.post(`${BASE}/api/admin/site`, {
    data: { kind: 'settings', values: { upiId: 'testowner@okhdfcbank', upiName: 'BharatStay Test' } },
    failOnStatusCode: false,
  });
  ok('upi: owner can save a UPI ID', setUpi.ok(), `got ${setUpi.status()}`);

  const anon = await browser.newContext();
  const book = await anon.request.post(`${BASE}/api/bookings`, {
    data: {
      staySlug: 'kondeshwar-greens-farm-stay-badlapur',
      checkIn: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      checkOut: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      guests: 2, rooms: 1,
      guestName: 'UPI Tester', guestEmail: 'upi@test.com', guestPhone: '9998887770',
    },
    failOnStatusCode: false,
  });
  const b = await book.json();
  ok('upi: booking starts unpaid', book.ok() && Boolean(b.ref), JSON.stringify(b).slice(0, 120));

  const page = await anon.newPage();
  await page.goto(`${BASE}/booking/${b.ref}`, { waitUntil: 'networkidle' });
  ok('upi: QR shown to the customer', await visible(page.locator('img[alt*="UPI QR"]')));

  const badUtr = await anon.request.post(`${BASE}/api/payments`, {
    data: { ref: b.ref, utr: '12345' },
    failOnStatusCode: false,
  });
  ok('upi: short UTR rejected', badUtr.status() === 400, `got ${badUtr.status()}`);

  const utr = String(Date.now()).slice(-12).padStart(12, '9');
  const good = await anon.request.post(`${BASE}/api/payments`, {
    data: { ref: b.ref, utr },
    failOnStatusCode: false,
  });
  ok('upi: valid UTR accepted', good.ok(), `got ${good.status()}`);

  const dup = await anon.request.post(`${BASE}/api/payments`, {
    data: { ref: b.ref, utr },
    failOnStatusCode: false,
  });
  ok('upi: booking already awaiting verification is not re-submitted', dup.status() === 409, `got ${dup.status()}`);

  // Not confirmed until a human checks the bank.
  await page.goto(`${BASE}/booking/${b.ref}`, { waitUntil: 'networkidle' });
  ok('upi: stays unconfirmed until verified', await visible(page.getByText('verify ho raha hai')));

  const guard = await anon.request.post(`${BASE}/api/admin/payments`, {
    data: { id: 'x', action: 'verify' },
    failOnStatusCode: false,
  });
  ok('upi: only an admin can verify', guard.status() === 401, `got ${guard.status()}`);

  const admin = await ctx.newPage();
  await admin.goto(`${BASE}/admin/payments`, { waitUntil: 'networkidle' });
  const row = admin.locator('article').filter({ hasText: b.ref }).first();
  ok('upi: payment appears in the admin queue', await visible(row));
  await row.getByRole('button', { name: /Payment mila/ }).click();
  await row.getByRole('button', { name: /Haan, confirm karo/ }).click();
  await admin.waitForTimeout(2500);

  const anon2 = await browser.newContext();
  const anon2Page = await anon2.newPage();
  await anon2Page.goto(`${BASE}/booking/${b.ref}`, { waitUntil: 'networkidle' });
  ok('upi: admin verification confirms the booking', await visible(anon2Page.getByText('Booking confirm ho gayi')));
  await anon2.close();
  await anon.close();
  await ctx.close();
}

// ------------------------------------------------------------ otp login
{
  const ctx = await browser.newContext();
  const phone = '98' + String(Date.now()).slice(-8);
  const send = await ctx.request.post(`${BASE}/api/auth/otp`, {
    data: { action: 'send', phone },
    failOnStatusCode: false,
  });
  const sent = await send.json().catch(() => ({}));
  ok('otp: code sent', send.ok() && Boolean(sent.devCode), JSON.stringify(sent).slice(0, 120));

  const bad = await ctx.request.post(`${BASE}/api/auth/otp`, {
    data: { action: 'verify', phone, code: '000000', name: 'Test' },
    failOnStatusCode: false,
  });
  ok('otp: wrong code rejected', bad.status() === 401, `got ${bad.status()}`);

  const good = await ctx.request.post(`${BASE}/api/auth/otp`, {
    data: { action: 'verify', phone, code: sent.devCode, name: 'Test Traveller' },
    failOnStatusCode: false,
  });
  ok('otp: correct code logs in', good.ok(), `got ${good.status()}`);

  const page = await ctx.newPage();
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  ok('otp: dashboard reachable after login', new URL(page.url()).pathname === '/dashboard', page.url());
  await ctx.close();
}

// ---------------------------------------------------- every public route
{
  const routes = [
    '/', '/stays', '/restaurants', '/weekend', '/packages', '/activities', '/map',
    '/search?q=badlapur', '/partner/apply', '/partner/status', '/login',
  ];
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`${page.url()}: ${e}`));

    let allOk = true;
    for (const r of routes) {
      const res = await page.goto(BASE + r, { waitUntil: 'networkidle' });
      if (res.status() !== 200) {
        allOk = false;
        console.log(`      ${r} -> ${res.status()}`);
      }
      // the page must not scroll sideways
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (overflow) {
        allOk = false;
        console.log(`      ${r} overflows horizontally at ${width}px`);
      }
    }
    ok(`routes: all render at ${width}px with no horizontal overflow`, allOk);
    ok(`routes: no console errors at ${width}px`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
