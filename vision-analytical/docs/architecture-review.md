# Architecture Review — before Session 6

State of the platform after Sessions 1–5 plus the Team/HRMS phase, and what
Session 6 (Knowledge Center) and the demo-data environment should do with it.

Rule applied throughout: **reuse first, extend second, build new only when
necessary.**

## What is actually there

Measured, not remembered:

| | Count |
|---|---|
| Database tables | 57 |
| Page routes | 100 |
| Server-action modules | 25 |
| Data-access modules | 31 |
| Shared UI primitives | 14 |

### Subsystems already built

| Subsystem | Where it lives | State |
|---|---|---|
| Auth & roles | `lib/session.ts`, `lib/dal.ts`, `proxy.ts` | Custom JWT cookie; `proxy.ts` does optimistic edge redirects, the DAL does the real check. Roles: ADMIN, ENGINEER, CUSTOMER. |
| Catalogue | `Product`, `Category`, `Brand`, `InstrumentModel`, `ProductSpecification`, `ProductCompatibility` | Faceted filtering, parts finder, compatibility mapping. |
| Commerce | `Order`, `OrderItem`, `Quote`, `QuoteItem`, `Invoice`, `Address` | Full lifecycle with status enums. |
| Service | `ServiceRequest`, `ServiceReport`, `AmcContract` | Request → assign → report, AMC contracts. |
| CRM | `CrmLead`, `CrmActivity` | Lead pipeline. |
| Team / HRMS | 12 tables + `AuditLog` | Employees, attendance, leave, devices, audit trail. |
| Content workflow | `ContentStatus` + `publishAt` + `publiclyVisibleWhere()` | Draft → Review → Approved → Published → Archived, with scheduling as a query condition. |
| CMS | `SiteSettings`, `ThemeSettings`, `PageContent`, `HomeSection` | Homepage builder, theme customiser, page editor, media manager. |
| Search | `lib/data/search.ts`, `/search` | Global across products, parts, refurbished, brands, articles. |
| Downloads | `Download` + `/downloads/[slug]/file` | Gated route, `downloadCount`, `requiresLogin`. |
| Feature flags | `lib/features.ts` + `FeatureFlag` | Registry holds defaults; DB stores only overrides. |
| Data quality | `lib/data/admin-quality.ts` | Missing images, documents, specs, SEO; broken file references. |
| Audit trail | `AuditLog` | Platform-wide, written in-transaction. |

### The gap this review found

Row counts on the working database:

```
users=3  products=29  orders=1  quotes=6  invoices=1
amc=1    svcreq=1     svcrep=0  downloads=0  testimonials=0
```

Every module is built; almost none of them has enough data to exercise.
`ServiceReport` is empty, so the service→knowledge link has never had a real
row to hang off. This is exactly the problem the demo-data phase addresses, and
it is the reason to do it **before** Session 6 rather than after.

---

## 1. Reuse without modification

These need nothing:

- **Auth and role enforcement.** `requireRole` / `requireUser` / `getCurrentUser`
  already gate everything. Session 6 adds no new role.
- **Content workflow.** `ContentStatus` and `publiclyVisibleWhere()` already
  give Session 6's "Draft / Review / Approved / Published / Archived" and
  scheduled publishing. `ErrorCode` and `ServiceCase` reuse the same enum
  rather than inventing their own.
- **UI primitives.** `Table`, `Card`, `Badge`, `StatCard`, `EmptyState`,
  `FormField`, `Select`, `Input`, `Textarea`, `ImageInput`. No new primitive is
  needed for the Knowledge Center.
- **Upload pipeline.** `saveUploadedImage` (sharp, lazy-loaded) and the
  `/uploads` route handler serve knowledge images unchanged.
- **Download delivery.** The gated file route and download counter serve the
  Document Library as-is.
- **Feature flags.** `knowledge_center` and `downloads` flags already exist.
- **Audit trail.** `recordAudit` / `diffFields` extend to knowledge edits with
  no schema change.
- **CSV export.** `lib/csv.ts` (with formula-injection neutralisation) serves
  any knowledge report.

## 2. Extend

| Thing | Extension | Why not new |
|---|---|---|
| `KnowledgeArticle` | `topicId`, `reviewerId`, `version`, tags, revisions | The article model is sound; it was missing a subject axis and provenance. |
| `ArticleKind` | 7 → 15 values | Session 6 asks for 12 content types; the enum already existed. |
| `Download` | `topicId` | Lets the Document Library filter by technique using the table that already holds every document. |
| `Brand`, `InstrumentModel`, `Product` | back-relations to error codes, cases, symptoms | Knowledge hangs off the catalogue that already exists. |
| Global search | log queries, add knowledge surfaces | `search.ts` already federates; it needs the new entities and a `SearchQuery` write. |
| `ServiceReport` | optional `serviceCase` back-relation | Keeps the case library anchored to real jobs. |

## 3. Refactor

One, and it is the reason this review mattered:

**`BlogCategory` conflated content type with subject.** `TROUBLESHOOTING` was
both a `kind` and a `category`, so there was no way to express "a
troubleshooting guide about HPLC" — which is precisely what Session 6's
19 techniques × 12 article types requires.

Fix: `kind` keeps the content type, a new `KnowledgeTopic` carries the subject,
`BlogCategory` is dropped after backfilling into `kind`. The migration asserts
it left nothing behind before dropping the column.

> **Disclosure:** this refactor was already written and applied before this
> review was requested. It is verified — all 6 articles kept their kinds, all
> 29 products, 57 compatibility rows and 22 instrument models intact — and
> typecheck and lint are clean. Nothing else was built ahead of the review.

Not refactored, deliberately: `KnowledgeArticle` still `@@map`s to the
`BlogPost` table. Renaming the table buys nothing and costs a data migration.

## 4. Build new

| New | Reason an existing table could not serve |
|---|---|
| `KnowledgeTopic` | Product `Category` is scoped by `CategoryKind` for the catalogue; "Software" and "General Laboratory" are subjects we do not sell. Bridged by an optional `categoryId`. |
| `ErrorCode` (+ `ErrorCodePart`, `ErrorCodeDocument`) | Was a string on an article. An engineer at an instrument needs cause, fix and part number as queryable fields. |
| `ServiceCase` (+ `ServiceCasePart`) | Structured write-up of a real job; optionally anchored to its `ServiceReport`. |
| `TroubleshootingSymptom` / `Cause` (+ parts) | The wizard's branches must be admin-editable rows, not code. |
| `Tag`, `KnowledgeArticleTag` | Rows rather than a string array, so a tag can be renamed once and counted. |
| `ArticleRevision` | Version history with restore. |
| `SearchQuery` | Zero-result searches are a customer-written list of missing content. |

## 5. Database changes

Applied in `20260813140000_knowledge_center`:

- 13 new tables, 1 new enum (`ErrorSeverity`), 8 new `ArticleKind` values
- 3 new columns on `BlogPost`, 1 on `Download`
- 1 column dropped (`BlogPost.category`) — backfilled and asserted first
- 2 functional unique indexes using `COALESCE`, because Postgres treats NULLs
  as distinct and a plain composite unique would let the same error code be
  entered twice with no brand

## 6. Impact on existing modules

| Module | Impact |
|---|---|
| Blog / Knowledge admin | **Moderate** — category selector replaced by topic + tags + reviewer. Done. |
| Public knowledge index | **Moderate** — category chips became topic chips. Done. |
| Homepage knowledge preview | **Low** — query gained an include. |
| Search | **Low→moderate** — new surfaces and query logging still to add. |
| Catalogue, commerce, service, CRM, Team, CMS | **None** — untouched. |
| Data quality | **Low** — will gain knowledge checks. |

Verified after the change: typecheck clean, lint clean, no data lost.

## 7. Risks and conflicts

1. **Demo data becoming indistinguishable from real data.** *The most serious
   risk in the whole plan.* Fake customers, invoices and service reports that
   cannot be told apart from real ones will eventually be shipped to
   production. **Mitigation: every demo row must carry a machine-detectable
   marker and there must be one command that removes all of it.** Designed
   before any demo row is written — see the Data Import Plan.
2. **Demo content that reads as a technical claim.** A fabricated error code or
   calibration procedure is something an engineer might act on. Demo knowledge
   content must be visibly fictional (placeholder brands/models), never a
   plausible-looking claim about a real instrument.
3. **Enum growth in Postgres.** `ALTER TYPE … ADD VALUE` cannot be *used* in
   the same transaction that adds it. Handled: new values are added in the
   migration, rows using them come from the seed.
4. **Scope.** Session 6 as specified is several sessions of work (wizard,
   libraries, analytics, revisions, admin for all of it). It will be delivered
   in slices, with each slice reported honestly rather than half-built
   everywhere.
5. **Dev-mode timing noise.** Verification runs against a production build;
   `next dev` recompiles can add tens of seconds to a request and imitate an
   application bug.

## Sequence

1. Demo data environment (marked, purgeable) — unblocks testing every module.
2. Verification sweep across the checklist.
3. Session 6 remaining slices on top of the schema already migrated.
4. Data Import Plan.
