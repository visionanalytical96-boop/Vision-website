/**
 * End-to-end check of the bike/auto ride service:
 *  rider registers -> admin approves -> rider goes online with a mocked GPS fix
 *  -> customer books -> nearest rider is matched -> accept -> trip OTP -> done.
 *
 * Geolocation is granted and overridden per browser context, which is what lets
 * the live-matching path be exercised for real rather than stubbed away.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@bharatstay.in',
  password: process.env.ADMIN_PASSWORD,
};
if (!ADMIN.password) {
  console.error('ADMIN_PASSWORD set kijiye — yeh script koi default password nahi rakhti.');
  process.exit(1);
}

// Real points in the belt: the rider sits near Badlapur station, the customer
// asks for a trip that starts there.
const RIDER_AT = { latitude: 19.1551, longitude: 73.2661 };
const FAR_AWAY = { latitude: 18.9107, longitude: 73.3233 }; // Karjat — outside the 6 km radius

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra && !cond ? ` — ${extra}` : ''}`);
};
const visible = (l, t = 15000) => l.waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const stamp = String(Date.now()).slice(-8);
const riderPhone = '77' + stamp;
const farPhone = '76' + stamp;
const riderName = `Test Rider ${stamp}`;

/** Signs a phone in through the real OTP endpoints and returns its context. */
async function signIn(phone, name) {
  const ctx = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: RIDER_AT,
  });
  const sent = await (await ctx.request.post(`${BASE}/api/auth/otp`, { data: { action: 'send', phone } })).json();
  await ctx.request.post(`${BASE}/api/auth/otp`, {
    data: { action: 'verify', phone, code: sent.devCode, name },
  });
  return ctx;
}

// ------------------------------------------------------- rider registration
{
  const ctx = await browser.newContext();
  for (const [phone, name, city] of [
    [riderPhone, riderName, 'Badlapur'],
    [farPhone, `Far Rider ${stamp}`, 'Karjat'],
  ]) {
    const res = await ctx.request.post(`${BASE}/api/rider/apply`, {
      multipart: {
        name, phone, vehicleType: 'BIKE', vehicleNumber: `MH05${stamp.slice(-4)}`,
        licenceNumber: 'MH0120250001234', city, area: `${city} station`,
      },
      failOnStatusCode: false,
    });
    if (phone === riderPhone) ok('rider: registration submits', res.ok(), `${res.status()} ${await res.text()}`);
  }

  const dup = await ctx.request.post(`${BASE}/api/rider/apply`, {
    multipart: { name: riderName, phone: riderPhone, vehicleType: 'BIKE', vehicleNumber: 'MH05XX0000', city: 'Badlapur', area: 'x road' },
    failOnStatusCode: false,
  });
  ok('rider: same number cannot register twice', dup.status() === 409, `got ${dup.status()}`);
  await ctx.close();
}

// ------------------------------------------------- rider blocked until approved
{
  const ctx = await signIn(riderPhone, riderName);
  const res = await ctx.request.post(`${BASE}/api/rider/location`, {
    data: { online: true, lat: RIDER_AT.latitude, lng: RIDER_AT.longitude },
    failOnStatusCode: false,
  });
  ok('rider: cannot go online before approval', res.status() === 403, `got ${res.status()}`);
  await ctx.close();
}

// ---------------------------------------------------------- admin approves
{
  const ctx = await browser.newContext();
  await ctx.request.post(`${BASE}/api/auth/admin`, { data: ADMIN });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/riders`, { waitUntil: 'networkidle' });

  const card = page.locator('article').filter({ hasText: riderName }).first();
  ok('admin: new rider shows in the queue', await visible(card));
  await card.getByRole('button', { name: /Approve karo/ }).click();
  await page.waitForTimeout(2000);

  // approve the far rider too, so matching has to choose on distance
  await page.goto(`${BASE}/admin/riders`, { waitUntil: 'networkidle' });
  const far = page.locator('article').filter({ hasText: `Far Rider ${stamp}` }).first();
  if (await visible(far, 5000)) {
    await far.getByRole('button', { name: /Approve karo/ }).click();
    await page.waitForTimeout(1500);
  }
  await ctx.close();
}

// -------------------------------------------------- riders go online (live GPS)
const riderCtx = await signIn(riderPhone, riderName);
const farCtx = await browser.newContext({ permissions: ['geolocation'], geolocation: FAR_AWAY });
{
  const sent = await (await farCtx.request.post(`${BASE}/api/auth/otp`, { data: { action: 'send', phone: farPhone } })).json();
  await farCtx.request.post(`${BASE}/api/auth/otp`, { data: { action: 'verify', phone: farPhone, code: sent.devCode, name: 'Far' } });

  const near = await riderCtx.request.post(`${BASE}/api/rider/location`, {
    data: { online: true, lat: RIDER_AT.latitude, lng: RIDER_AT.longitude, accuracyM: 12 },
    failOnStatusCode: false,
  });
  ok('rider: approved rider can go online', near.ok(), `got ${near.status()}`);

  await farCtx.request.post(`${BASE}/api/rider/location`, {
    data: { online: true, lat: FAR_AWAY.latitude, lng: FAR_AWAY.longitude },
  });
}

// ------------------------------------------------------------ customer books
let rideRef = null;
{
  const ctx = await browser.newContext();
  const quote = await ctx.request.post(`${BASE}/api/rides`, {
    data: {
      action: 'quote', vehicleType: 'BIKE',
      pickup: { lat: 19.1551, lng: 73.2661 },
      drop: { lat: 19.1613, lng: 73.2743 },
    },
    failOnStatusCode: false,
  });
  const q = await quote.json();
  ok('ride: fare quote returned', quote.ok() && q.fare > 0, JSON.stringify(q).slice(0, 120));

  const book = await ctx.request.post(`${BASE}/api/rides`, {
    data: {
      action: 'book', vehicleType: 'BIKE',
      pickup: { lat: 19.1551, lng: 73.2661, label: 'Badlapur Station (East)' },
      drop: { lat: 19.1613, lng: 73.2743, label: 'Katrap Naka, Badlapur' },
      customerName: 'Test Customer', customerPhone: '9999900000',
    },
    failOnStatusCode: false,
  });
  const b = await book.json();
  rideRef = b.ref ?? null;
  ok('ride: booking creates a ride', book.ok() && Boolean(rideRef), JSON.stringify(b).slice(0, 120));
  ok('ride: a rider was matched', b.matched === true, JSON.stringify(b).slice(0, 120));
  await ctx.close();
}

// --------------------------------------- nearest rider gets it, not the far one
{
  const near = await (await riderCtx.request.post(`${BASE}/api/rider/location`, {
    data: { online: true, lat: RIDER_AT.latitude, lng: RIDER_AT.longitude },
  })).json();
  ok('matching: nearest rider receives the offer', near.offer?.ref === rideRef, JSON.stringify(near.offer ?? null).slice(0, 120));

  const far = await (await farCtx.request.post(`${BASE}/api/rider/location`, {
    data: { online: true, lat: FAR_AWAY.latitude, lng: FAR_AWAY.longitude },
  })).json();
  ok('matching: rider outside the radius gets nothing', !far.offer, JSON.stringify(far.offer ?? null).slice(0, 120));
}

// ------------------------------------------- customer cannot see rider yet
{
  const ctx = await browser.newContext();
  const before = await (await ctx.request.get(`${BASE}/api/rides/${rideRef}`)).json();
  ok('privacy: rider details hidden before accept', before.rider === null, JSON.stringify(before.rider).slice(0, 80));
  await ctx.close();
}

// ------------------------------------------------------------- accept + trip
let startOtp = null;
{
  const offer = await (await riderCtx.request.post(`${BASE}/api/rider/location`, {
    data: { online: true, lat: RIDER_AT.latitude, lng: RIDER_AT.longitude },
  })).json();

  const accept = await riderCtx.request.post(`${BASE}/api/rider/trip`, {
    data: { rideId: offer.offer.id, action: 'accept' },
    failOnStatusCode: false,
  });
  ok('trip: rider accepts', accept.ok(), `got ${accept.status()}`);

  const ctx = await browser.newContext();
  const after = await (await ctx.request.get(`${BASE}/api/rides/${rideRef}`)).json();
  ok('privacy: rider details released after accept', after.rider?.name === riderName, JSON.stringify(after.rider ?? null).slice(0, 100));
  ok('trip: customer sees a live distance to the rider', typeof after.rider?.awayKm === 'number');
  startOtp = after.startOtp;
  ok('trip: customer is given a start code', /^\d{4}$/.test(startOtp ?? ''), String(startOtp));
  await ctx.close();

  const rideId = offer.offer.id;
  await riderCtx.request.post(`${BASE}/api/rider/trip`, { data: { rideId, action: 'arrived' } });

  const wrong = await riderCtx.request.post(`${BASE}/api/rider/trip`, {
    data: { rideId, action: 'start', otp: '0000' === startOtp ? '1111' : '0000' },
    failOnStatusCode: false,
  });
  ok('trip: wrong start code rejected', wrong.status() === 401, `got ${wrong.status()}`);

  const right = await riderCtx.request.post(`${BASE}/api/rider/trip`, {
    data: { rideId, action: 'start', otp: startOtp },
    failOnStatusCode: false,
  });
  ok('trip: correct start code starts the trip', right.ok(), `got ${right.status()}`);

  const done = await riderCtx.request.post(`${BASE}/api/rider/trip`, {
    data: { rideId, action: 'complete' },
    failOnStatusCode: false,
  });
  ok('trip: rider completes the trip', done.ok(), `got ${done.status()}`);

  const ctx2 = await browser.newContext();
  const final = await (await ctx2.request.get(`${BASE}/api/rides/${rideRef}`)).json();
  ok('trip: ride ends COMPLETED', final.status === 'COMPLETED', final.status);
  await ctx2.close();
}

// ------------------------------------------- no rider online -> honest answer
{
  await riderCtx.request.post(`${BASE}/api/rider/location`, { data: { online: false } });
  await farCtx.request.post(`${BASE}/api/rider/location`, { data: { online: false } });

  const ctx = await browser.newContext();
  const book = await ctx.request.post(`${BASE}/api/rides`, {
    data: {
      action: 'book', vehicleType: 'AUTO',
      pickup: { lat: 19.1551, lng: 73.2661, label: 'Badlapur Station (East)' },
      drop: { lat: 19.1613, lng: 73.2743, label: 'Katrap Naka, Badlapur' },
      customerName: 'Test Customer', customerPhone: '9999900000',
    },
  });
  const b = await book.json();
  const state = await (await ctx.request.get(`${BASE}/api/rides/${b.ref}`)).json();
  ok('matching: no rider online reports NO_RIDER', state.status === 'NO_RIDER', state.status);
  await ctx.close();
}

// ------------------------------------------------------------- pages render
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  let allOk = true;
  for (const r of ['/ride', '/rider/apply', `/ride/${rideRef}`]) {
    const res = await page.goto(BASE + r, { waitUntil: 'networkidle' });
    if (res.status() !== 200) {
      allOk = false;
      console.log(`      ${r} -> ${res.status()}`);
    }
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) {
      allOk = false;
      console.log(`      ${r} overflows horizontally`);
    }
  }
  ok('pages: ride pages render on mobile without overflow', allOk);
  ok('pages: no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

await riderCtx.close();
await farCtx.close();
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
