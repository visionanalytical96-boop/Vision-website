# BharatStay

Maharashtra ke stays, restaurants aur weekend trips — Badlapur–Karjat belt se
Konkan tak. Next.js 14 (App Router) + Postgres + Prisma.

## Kya-kya hai

- **Public site** — home, stays (filters + detail), restaurants, Badlapur→Karjat
  weekend planner, packages, activities, map, search, booking + voucher.
- **Partner listing form** (`/partner/apply`) — koi bhi farmhouse/hotel/restaurant
  owner bina login ke form bhar sakta hai, photos ke saath. Submit karne par ek
  private status link milta hai (`/partner/status/<token>`).
- **Admin panel** (`/admin`) — applications approve/reject, stays aur restaurants
  ka full CRUD with price editing aur photo upload, service on/off toggles, site
  ka text, bookings aur customers.
- **Auth** — admin email + password (argon2id hash, httpOnly JWT cookie),
  customer phone + OTP (server-side generated, hashed, 5-min expiry, 3 attempts).

## Local par chalane ke liye

```bash
cp .env.example .env      # DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD bharo
pnpm install
pnpm exec prisma migrate deploy
pnpm db:seed              # catalogue + admin account
pnpm dev
```

`pnpm e2e` poore flow ka test chalata hai (guards, partner form → approve → live
listing, admin price edit, OTP, saare routes mobile + desktop par).

## Content

Catalogue `src/content/*.json` mein hai. `prisma/seed.mjs` use database mein
daalta hai (upsert, isliye dobara chalana safe hai). Seed ke baad **database hi
asli source hai** — admin panel ke changes JSON ko overwrite nahi karte.

`pnpm extract-content` purane single-file app (`standalone/BharatStay.html`) se
JSON dobara nikaalta hai.

## Deploy (Railway)

Service ko in variables ki zaroorat hai:

| Variable | Kya hai |
|---|---|
| `DATABASE_URL` | Postgres — Railway apne aap deta hai |
| `JWT_SECRET` | Session cookie sign karta hai. `openssl rand -base64 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Pehle deploy par admin account banta hai |
| `NEXT_PUBLIC_APP_URL` | Public URL |
| `SMS_PROVIDER` | `mock` (default) ya `msg91` |
| `PAYMENT_PROVIDER` | `mock` (default) ya `razorpay` |

`railway.json` build aur release (migrate + seed) command set karta hai.

## Abhi kya asli nahi hai

Yeh cheezein paid account ke bina chal nahi saktin, isliye inka mock mode hai:

- **SMS OTP** — `SMS_PROVIDER=mock` par code SMS nahi jata, screen par dikhta
  hai. `msg91` + `SMS_API_KEY` set karne par asli SMS jayega.
- **Payment** — `PAYMENT_PROVIDER=mock` par booking bina paise kate confirm hoti
  hai. Razorpay keys daalne par asli charge hoga.
- **Photos** — seed ke saath koi photo nahi aati; jab tak upload nahi hoti, har
  listing ka `tone` ek drawn scene banata hai. Photos admin panel se ya partner
  form se upload hoti hain.
- **Prices aur timings** seed data mein sample hain — customers ko dikhane se
  pehle admin panel se sahi karein.

## Purana single-file app

`standalone/BharatStay.html` aur `standalone/BharatStay-Editable.html` abhi bhi
yahin hain — bina server ke chalne wala offline demo. Naya kaam is Next.js app
mein hota hai.
