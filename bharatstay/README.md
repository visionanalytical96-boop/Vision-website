# BharatStay

Maharashtra ke stays, restaurants aur weekend trips — Badlapur–Karjat belt se
Konkan tak. Next.js 14 (App Router) + Postgres + Prisma.

## Kya-kya hai

- **Glass theme** — frosted, floating panels. Blur, transparency, corner
  round, floating aur background ka rang sab `/admin/theme` se live badalte
  hain (4 ready presets bhi hain), redeploy ki zaroorat nahi.
- **Bike, e-bike, auto aur cab rides** (`/ride`) — Badlapur–Karjat belt ke liye live
  ride service — 2-wheeler, 3-wheeler aur ab 4-wheeler cab (sedan + SUV) bhi.
  Rider khud register karta hai (`/rider/apply`), admin approve
  karta hai, phir rider apne phone se online jaake (`/rider`) rides leta hai.
  Sabse nazdeeki online rider apne aap match hota hai, customer use live map par
  aata hua dekhta hai, aur trip 4-digit OTP se shuru hoti hai.
- **Public site** — home, stays (filters + detail), restaurants, Badlapur→Karjat
  weekend planner, packages, activities, map, search, booking + voucher.
- **Partner listing form** (`/partner/apply`) — koi bhi farmhouse/hotel/restaurant
  owner bina login ke form bhar sakta hai, photos ke saath. Submit karne par ek
  private status link milta hai (`/partner/status/<token>`).
- **Payments** — seedha UPI, koi gateway nahi. Admin panel mein apna UPI ID
  daaliye; customer ko QR banke dikhta hai (kisi bhi app se scan) ya phone par
  GPay/PhonePe/Paytm khulta hai, amount pehle se bhara hua. Paisa seedha aapke
  bank mein — na commission, na merchant account. Customer UTR daalta hai aur
  aap `/admin/payments` par statement se milaan karke booking confirm karte ho.
- **Google Maps** — `NEXT_PUBLIC_GOOGLE_MAPS_KEY` set karte hi asli Google Map
  (markers, live rider, satellite, street view) chalu ho jaata hai. Key na ho
  to site apna banaya naksha dikhati hai — kuch toota nahi.
- **Photos** — har listing par kai photos, lightbox gallery ke saath.
- **Admin panel** (`/admin`) — applications approve/reject, riders aur fares,
  services **add aur delete**, stays aur restaurants
  ka full CRUD with price editing aur photo upload, service on/off toggles, site
  ka text, bookings aur customers.
- **Auth** — admin email + password (argon2id hash, httpOnly JWT cookie),
  customer phone + OTP (server-side generated, hashed, 5-min expiry, 3 attempts).

## Local par chalane ke liye

```bash
cp .env.example .env      # DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD bharo
                          # ADMIN_PASSWORD: openssl rand -base64 24
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

## Deploy

Yeh ek normal Next.js app hai — kisi bhi Node hosting par chalti hai (Vercel,
Render, Fly, apna VPS). Zaroorat sirf ek Postgres database aur in variables ki
hai:

| Variable | Kya hai |
|---|---|
| `DATABASE_URL` | Postgres ka connection string |
| `JWT_SECRET` | Session cookie sign karta hai. `openssl rand -base64 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Pehle deploy par admin account banta hai. Password kam se kam 12 akshar ka — `openssl rand -base64 24` se banaiye. Seed kamzor ya jaana-pehchana password reject kar deta hai. |
| `NEXT_PUBLIC_APP_URL` | Public URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Asli Google Maps ke liye (billing wala Google Cloud project) |
| `SMS_PROVIDER` | `mock` (default) ya `msg91` |

Payment ke liye koi env variable nahi hai — UPI ID admin panel ke **Site
settings** se set hota hai, aur wahi customer ko dikhta hai.

Build aur release commands:

```bash
pnpm install --frozen-lockfile && pnpm build   # build
pnpm release && pnpm start                     # migrate + seed, phir chalu
```

## Abhi kya asli nahi hai

Yeh cheezein paid account ke bina chal nahi saktin, isliye inka mock mode hai:

- **SMS OTP** — `SMS_PROVIDER=mock` par code SMS nahi jata, screen par dikhta
  hai. `msg91` + `SMS_API_KEY` set karne par asli SMS jayega.
- **Payment ka confirmation haath se hota hai** — paisa asli hai aur seedha
  aapke UPI par aata hai, lekin gateway na hone se site ko apne aap pata nahi
  chalta ki paisa aaya. Customer ka UTR queue mein aata hai aur aap bank
  statement se milaan karke confirm karte ho. Bina verify kiye booking kabhi
  confirm nahi hoti.
- **Ride distance aur ETA** — doori seedhi rekha (haversine) se nikaal kar
  raaste ke hisaab se 1.3x ki jaati hai. Asli road routing aur ETA ke liye paid
  Directions API chahiye, isliye har jagah ise "anumaanit" likha hai aur
  turn-by-turn ke liye Google Maps ka link diya hai.
- **Rider location** browser ke Geolocation API se aati hai, isliye rider ka page
  khula rehna zaroori hai. Background tracking ke liye asli mobile app chahiye.
- **Google Maps** key ke bina site apna banaya naksha dikhati hai. Asli Maps ke
  liye billing wala Google Cloud project chahiye.
- **Photos** — `photos/` folder ki tasveerein `pnpm import-photos` se database
  mein aati hain aur us sheher ke stays/restaurants par lag jaati hain. Jis
  listing ki photo nahi hai, uska `tone` ek drawn scene banata hai.
- **Prices aur timings** seed data mein sample hain — customers ko dikhane se
  pehle admin panel se sahi karein.

## Purana single-file app

`standalone/BharatStay.html` aur `standalone/BharatStay-Editable.html` abhi bhi
yahin hain — bina server ke chalne wala offline demo. Naya kaam is Next.js app
mein hota hai.
