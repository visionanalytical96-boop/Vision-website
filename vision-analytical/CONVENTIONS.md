# Vision Analytical — Project Conventions

Standing rules for every development session. These override individual session
briefs when they conflict. Read this before writing code.

## What this is

Not a company website. A platform that grows into: corporate site, product
catalogue, spare-parts database, knowledge centre, customer/dealer/engineer
portals, admin ERP, CRM, inventory, quoting, service management and an AI
knowledge layer. Build today's code so tomorrow's module drops in without a
rewrite.

## Working method

1. Review what exists before building. Most sessions are extending, not starting.
2. **Never rebuild a working feature.** Improve, extend, refactor, reuse.
3. Never duplicate UI. If a component nearly fits, generalise it.
4. Make the enterprise-grade decision yourself. Only stop for a decision that
   changes business logic.
5. Report at the end of a session: what was completed, what was reused, what was
   added, what remains, what's next.

## Design language

Reference points: Cloudflare, Stripe, Linear, Apple, Microsoft, Adobe
Enterprise, Vercel. Premium industrial, never startup-landing-page or gaming.

- White-first UI, large whitespace, minimal colour
- Accent blue, dark-gray text, light-gray borders, dark graphite footer
- Radius 8–12px, soft shadows, thin borders
- Borders carry structure; shadows only signal state change
- Minimal animation, professional iconography (Lucide, one weight)
- Every page must look like it belongs to the same system

The full specification — tokens, type scale, spacing, component library,
wireframes, responsive strategy — is the Session 1 design system. Components
bind to semantic tokens (`var(--surface)`), never to literal colours.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL · Docker.
Forms with React Hook Form + Zod. Icons from Lucide.

**Deliberate deviations from the stack sheet, and why:**

- **Auth is custom (jose JWT + bcrypt), not Auth.js.** It is built, working and
  hardened: httpOnly cookies, role-based access enforced in the DAL rather than
  only at the route edge, per-account and per-IP rate limiting. Swapping it out
  today is a large rewrite with no functional gain and real regression risk.
  Revisit when Google/Microsoft SSO or OTP is actually scheduled — that is the
  point where Auth.js starts paying for itself.
- **UI primitives are local, not shadcn/ui packages.** `components/ui/*` already
  follows the same pattern shadcn generates — unstyled primitives, `cn()` class
  merging, variant helpers — and every page depends on them. Adopt shadcn
  component *source* where a new primitive is needed; do not replace what works.

Both deviations follow the "never rebuild a working feature" rule above. If a
future session needs the packaged versions, migrate incrementally behind the
existing component API so no page changes.

## Database

Design for growth, never for the current screen. Model real entities rather than
free-text fields — a value that will need a page, a filter or an attachment is
an entity. Migrations are checked in; when a migration would lose data, hand-write
it so it backfills before it drops.

Reserved extension points, to be modelled before the modules that need them:
customer-owned instruments (calibration, warranty and service history attach to
an instrument at a site, not to a catalogue product — `InstrumentModel` is the
anchor these hang off), polymorphic document attachments, payment state on
orders, and price tiers.

Nothing in the catalogue is capped: products, categories, brands, spare parts,
instrument models, compatibility mappings, documents and downloads are all
open-ended by design.

## Roles

Today: Admin, Engineer, Customer. The role system must extend to Super Admin,
Sales, Accounts, Warehouse, Dealer and Technician without a rewrite —
so authorise against a permission derived from the role, never against a
hardcoded role check scattered through pages. Access is enforced in the DAL,
not only at the route edge.

## Code

TypeScript only. No `any` — use `unknown` plus a type guard. Avoid `as` casts
outside tests. Server Components by default; client components only where
interaction requires. Validate every input with Zod at the boundary. Never
hardcode a URL, secret or colour — `.env` and design tokens respectively.

Lazy-load native modules (`await import()`) at point of use rather than at module
top level, or they get pulled into build-time analysis of routes that never call
them.

## Deployment

Docker-first, self-hosted Ubuntu, Cloudflare Tunnel, Portainer for container
management. Deployment is `git pull && docker compose build && docker compose up -d`
with no manual editing after. Everything configurable through `.env`.

`NEXT_PUBLIC_*` values are inlined at build time — they must be passed as build
args, not only as runtime environment, or the built image ignores them.

No new containers, services or frameworks without a concrete need. One owner
has to run this.

## Cost

Open-source and self-hosted by default; nothing in development may require a
paid service. Keep the architecture ready for Razorpay, Google/Microsoft SSO,
OTP, object storage (R2 or MinIO), Redis, Meilisearch and an email provider —
but never depend on one to run locally or to deploy.

## Operations

Design for these from the start rather than retrofitting:

- **Backup**: database, Docker volumes, uploaded documents and `.env`, on a
  schedule, with a written restore procedure that has actually been run.
- **Monitoring**: CPU, RAM, disk, containers, database, site availability, SSL
  expiry and backup health.

Anything stateful must be in a named volume or the database — never only in a
container's writable layer.

## Platform control

Nothing that an owner should be able to change belongs in code.

- **Feature flags** (`src/lib/features.ts`) gate every module that can be
  switched off. The registry holds the defaults and the database only stores
  overrides, so an unseeded flag is never an outage. Add a flag alongside the
  module it controls — a toggle that gates nothing is worse than no toggle,
  because it tells the admin they turned something off when they didn't.
  Switching a module off must take its routes (404), its nav links and its
  homepage sections with it.
- **Content workflow**: knowledge content moves Draft → In review → Approved →
  Published → Archived, with scheduled publishing expressed as a query
  condition (`publiclyVisibleWhere()`), not a timer. Nothing needs a cron for a
  scheduled item to appear, and nothing can stick half-published.
- **Data quality** is a first-class admin surface, not a spreadsheet: what is
  missing an image, a document, compatibility, specifications or SEO; what is
  waiting in review; which references point at files that no longer exist.

## Phase discipline

After each phase: review, refactor, reuse, document, test — then continue.
Debt does not roll forward. A two-state boolean that has to express five states
gets migrated, not worked around.

## Definition of done

Typecheck and lint clean, mobile-first and responsive to desktop, accessible
(keyboard focus visible, contrast at AA), SEO metadata present, and verified
running — not just compiled. Server Components by default, images optimised,
heavy modules lazy-loaded.
