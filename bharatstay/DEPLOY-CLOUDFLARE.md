# Cloudflare par BharatStay live karna

Yeh app Cloudflare Workers par chalti hai. Cloudflare Postgres host nahi karta,
isliye database bahar se lena padega — free plan kaafi hai.

Poora kaam ek baar ka hai, roughly 20 minute.

---

## Zaroorat kya hai

| Cheez | Kyun | Kharcha |
|---|---|---|
| Cloudflare account | Site yahan chalegi | Free plan se shuru, neeche caveat padhiye |
| Postgres database (Neon ya Supabase) | Listings, bookings, photos | Free tier |
| Node 20+ aur pnpm | Build karne ke liye | — |

---

## 1. Database banaiye (Neon)

1. [neon.tech](https://neon.tech) par free account banaiye, ek project banaiye.
2. **Connection string copy kijiye — `-pooler` waala.** Aisa dikhega:

   ```
   postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

   > **Yeh zaroori hai.** Worker ek saath bahut saare copies mein chal sakta hai.
   > Bina pooler ke Postgres ke connections khatam ho jayenge aur site 500 dene
   > lagegi. Host ke naam mein `-pooler` hona chahiye.

3. Us URL se schema chadha dijiye aur catalogue seed kar dijiye:

   ```bash
   cd bharatstay
   pnpm install
   export DATABASE_URL="<upar wala pooled URL>"
   export ADMIN_EMAIL="aap@example.com"
   export ADMIN_PASSWORD="$(openssl rand -base64 24)"   # ise sambhal kar rakhiye
   pnpm exec prisma migrate deploy
   pnpm db:seed
   ```

   Seed kamzor password reject kar deta hai — kam se kam 12 akshar.

---

## 2. Cloudflare par bhejiye

```bash
pnpm exec wrangler login          # browser khulega
```

Secrets bhejiye (yeh `wrangler.jsonc` mein **nahi** hain, kyunki wo file git mein jaati hai):

```bash
pnpm exec wrangler secret put DATABASE_URL      # pooled URL paste kijiye
pnpm exec wrangler secret put JWT_SECRET        # openssl rand -base64 32
pnpm exec wrangler secret put ADMIN_EMAIL
pnpm exec wrangler secret put ADMIN_PASSWORD
```

Build aur deploy:

```bash
pnpm cf:build      # Next build + OpenNext Worker bundle
pnpm cf:deploy
```

Wrangler `https://bharatstay.<aapka-subdomain>.workers.dev` de dega.

Local par dekhna ho to `.dev.vars` file banaiye (gitignored hai) —
`DATABASE_URL=...` aur `JWT_SECRET=...` — phir `pnpm cf:preview`.

---

## 3. Apna domain jodiye

Cloudflare dashboard → **Workers & Pages** → `bharatstay` → **Settings** →
**Domains & Routes** → **Add custom domain**. SSL apne aap lag jaata hai.

Phir `NEXT_PUBLIC_APP_URL` apne domain par set kar dijiye
(`wrangler secret put NEXT_PUBLIC_APP_URL`) aur dobara deploy kar dijiye.

---

## 4. Live hone se pehle — teen kaam

1. **UPI ID daaliye** — `/admin` → Site settings. Bina iske customer payment
   nahi kar payega, use "UPI ID set nahi hai" dikhega.
2. **Prices aur timings theek kijiye** — seed data sample hai, business naam
   asli hain. Purane daam par booking aa gayi to nuksan aapka.
3. **Admin password sambhal kar rakhiye** — reset ka koi email flow nahi hai.
   Bhool gaye to `ADMIN_PASSWORD` badal ke `pnpm db:seed` dobara chalana padega.

---

## Jaanne layak baatein

**Workers ka free plan shayad kam padega.** Password aur OTP hashing
jaan-boojh kar dheemi hai (600,000 PBKDF2 rounds) — yahi use surakshit banata
hai. Free plan mein har request ko 10ms CPU milta hai, aur hashing usse zyada
leti hai, isliye **login fail ho sakta hai**. Workers Paid ($5/month) mein 30
second tak milta hai. Baaki poori site free plan par theek chalti hai — sirf
login aur OTP verify par yeh asar padta hai.

**Naksha OpenStreetMap ka hai** — koi key nahi. OSM ke server donation par
chalte hain aur unki policy chhoti sites ke liye hai. Traffic bahut badhe to
kisi paid tile provider ka URL `NEXT_PUBLIC_MAP_TILE_URL` mein daal dijiye.

**Photos database mein hain**, R2 mein nahi. Chhoti site ke liye theek hai aur
isse redeploy par photos gayab nahi hotin. Hazaaron photos ho jayein to unhe
R2 par le jaana behtar rahega.

**SMS OTP abhi mock hai** — code screen par dikhta hai, phone par nahi jaata.
Asli SMS ke liye MSG91 ka account chahiye, phir `SMS_PROVIDER=msg91` aur
`wrangler secret put SMS_API_KEY`.

**Payment confirm aap karte ho.** Paisa seedha aapke UPI par aata hai, par
gateway na hone se site ko apne aap pata nahi chalta. Customer ka UTR
`/admin/payments` mein aata hai; bank statement se milaan karke confirm
kijiye. Bina verify kiye booking kabhi confirm nahi hoti.

---

## Cloudflare nahi, kisi aur jagah?

Yahi code kisi bhi Node host par bhi chalta hai (Render, Fly.io, apna VPS) —
kuch badalna nahi padta:

```bash
pnpm install --frozen-lockfile
pnpm build:node
pnpm release      # migrate + seed
pnpm start
```

Zaroorat sirf `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` ki
hai. Waha CPU ki koi 10ms limit nahi hai, to hashing wali dikkat bhi nahi hoti.
