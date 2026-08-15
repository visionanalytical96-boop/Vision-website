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

## People and records about people

An `Employee` is not a `User`. Field staff often have no login and most users
are customers, so the link is optional on both sides rather than folding HR data
onto the account.

Records that decide someone's pay carry stricter rules than the rest of the
platform:

- **Every change is audited, in the same transaction as the change.** If the log
  cannot be written, the change does not happen. One `AuditLog` table serves the
  whole platform, so an audit has one place to look.
- **A derived number is stored, not recomputed on read.** Worked, late and
  overtime minutes are written onto the attendance row, so changing a policy
  next quarter cannot rewrite a month that has already been paid.
- **Raw and derived data stay in separate tables.** Device punches are
  append-only and deduplicated by a unique index; a day's attendance is one
  derived row. That is what makes re-processing and duplicate detection possible
  rather than guesswork.
- **A manual correction outranks an automatic one.** A later sync skips any day
  a person entered by hand and signed for.
- **Nobody is deactivated by deletion.** Employment history is a payroll record;
  leavers are marked inactive so their attendance survives.
- **An unmarked day is not an absent day.** The gap is shown as unmarked and
  closed deliberately, by a named action that logs what it wrote.

Wall-clock policy carries an explicit IANA timezone. The server runs UTC in
Docker, so "09:30" has no fixed meaning without one, and a punch after midnight
local lands on the wrong day.

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

## Tests

`pnpm test` runs Node's built-in test runner over `tests/` through tsx — no test
framework dependency to keep current.

Pure logic that decides something consequential gets a test: the attendance
engine, timezone conversion, CSV escaping, device-export parsing. Keep that
logic in modules without `server-only` so it can be imported directly; a pure
function trapped behind a database guard is a function nobody will test. Where a
module has both halves, split them (`punch-csv.ts` / `attendance-sync.ts`,
`audit-diff.ts` / `audit.ts`).

Everything else is verified by driving the running app.

## Operational documentation

Five documents are kept current, not written once:

| Document | Updated when |
|---|---|
| `CHANGELOG.md` | **Every commit** — regenerated, never hand-edited |
| `DEPLOYMENT.md` | The build or deploy procedure changes |
| `BACKUP.md` | What must be backed up changes |
| `RECOVERY.md` | A new failure mode is discovered |
| `HEALTHCHECK.md` | A check is added, or an incident reveals a missing one |

`CHANGELOG.md` is generated by `npm run changelog` from git history. A
changelog someone has to remember to update goes stale, and a stale one is
worse than none because it is read as fact. Run it as the first step of
preparing a commit; it then covers history through the previous commit, and
catches up on the next one. `npm run changelog:check` fails if it has drifted,
so CI can enforce it.

The other four are procedures, not per-commit artifacts — regenerating them on
every commit would produce noise, not accuracy. Update them when the procedure
they describe actually changes, and add a `RECOVERY.md` scenario after any
incident the existing ones would not have covered.

## Definition of done

Typecheck and lint clean, mobile-first and responsive to desktop, accessible
(keyboard focus visible, contrast at AA), SEO metadata present, and verified
running — not just compiled. Server Components by default, images optimised,
heavy modules lazy-loaded.

Verify against a production build, not `next dev`. Dev-mode recompiles can add
tens of seconds to a request and look exactly like an application bug.

Route handlers do not run through layouts. A handler under `/admin` is
unprotected unless it calls `requireRole` itself — including file downloads.

Anything exported to CSV passes through `toCsv`, which neutralises cells a
spreadsheet would otherwise execute as a formula.
