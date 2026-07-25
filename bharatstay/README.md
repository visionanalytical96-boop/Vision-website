# BharatStay

**India's Complete Travel Booking Platform** — hotels, resorts, villas, homestays, farm-stays, flights, buses, trains, cabs, holiday packages, and activities in one place.

> "Explore India. Stay Your Way."

This directory is a self-contained Next.js application. It is **not** part of the n8n pnpm workspace — it has its own `package.json`, dependencies, and tooling, and can be developed, built and deployed independently of the rest of this repository.

## Status

This is an early, working scaffold of the platform, built step by step per the product brief in `docs/BRIEF.md`. It currently ships:

- Full marketing homepage (hero + multi-modal search, offers, destinations, categories, packages, trust section, testimonials, app promo, newsletter)
- Hotel search results page with filters/sorting and a hotel detail page
- Multi-step checkout flow (review → guest details → add-ons/coupon → payment → confirmation)
- Payment status, ticket voucher and payment receipt templates (screen-renderable, print/PDF-ready)
- Auth pages (login / register, OTP-ready UI)
- Customer, Partner, and Admin dashboards with demo data
- Prisma schema modelling the full domain (bookings, payments, properties, flights, buses, cabs, packages, agents, corporate accounts, refunds, reviews, etc.)
- Demo dataset (hotels, destinations, offers, packages, reviews, flights, buses, cabs)

Everything runs on **mock/demo data** — there are no live payment, GDS, or inventory integrations. See `docs/ARCHITECTURE.md` for the provider-adapter pattern intended for real integrations, and `docs/ROADMAP.md` for what's not built yet (agent/corporate dashboards, live PDF generation, real auth/session, real payment gateway wiring, SEO landing pages, etc).

## Tech stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Data layer (modeled, not yet wired to a live DB):** Prisma + PostgreSQL schema in `prisma/schema.prisma`
- **Demo data:** static TypeScript modules in `src/lib/mock-data`

## Getting started

```bash
cd bharatstay
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`.

## Scripts

```bash
npm run dev        # start dev server
npm run build       # production build
npm run start        # start production server
npm run lint          # eslint
npm run typecheck      # tsc --noEmit
```

## Testing

No test runner is wired up yet. Recommended next step: Vitest + React Testing Library for components, Playwright for e2e booking flows (see `docs/ROADMAP.md`).

## Project docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture, provider-adapter pattern for third-party integrations
- [`docs/SITEMAP.md`](docs/SITEMAP.md) — full sitemap of planned pages
- [`docs/ROLES.md`](docs/ROLES.md) — user roles & permissions matrix
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what's built vs. what's left
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deployment instructions
- [`prisma/schema.prisma`](prisma/schema.prisma) — database schema

## Security notes

No real secrets are present anywhere in this project. `.env.example` lists every environment variable the architecture expects (payment gateways, SMS/WhatsApp/email providers, DB, JWT signing key) as empty placeholders — never commit real values to `.env.local`.
