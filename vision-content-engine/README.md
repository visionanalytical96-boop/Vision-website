# Vision AutoContent Engine

A self-hosted content studio for Vision Analytical: store products once, and the
engine renders professional, branded social and website graphics from them —
on schedule, or on demand.

**No GPU. No AI. No paid APIs. No npm dependencies.**

---

## Why it is built this way

The engine has **zero required runtime dependencies**. Everything comes from
Node 22's standard library:

| Need | Used |
| --- | --- |
| Database | `node:sqlite` (built in since Node 22.5) |
| HTTP server | `node:http` |
| Password hashing | `node:crypto` scrypt |
| Image composition | SVG generated in plain JavaScript |
| Rasterisation | Headless Chromium over the DevTools Protocol |

Chromium is used purely as a CPU rasteriser and text-metrics oracle. There is no
model of any kind in the pipeline. `sharp` and `@resvg/resvg-js` are used
automatically if they happen to be installed, but nothing requires them.

### How text is guaranteed to fit

Composition happens outside the browser, so the engine needs to know how wide a
headline will be before drawing it. Rather than estimating,
`scripts/calibrate-fonts.mjs` measures every glyph of the brand fonts once and
writes `assets/fonts/metrics.json`. Wrapping is then exact.

After rendering, the layout is measured again *in the browser* and checked for
overflow, collisions and out-of-canvas elements. If anything fails, the engine
recomposes at a smaller type scale and retries. **A layout that still fails
validation is never saved** — generation fails loudly instead of publishing a
broken graphic.

---

## Quick start

```bash
cd vision-content-engine
cp .env.example .env          # then edit: admin credentials, API key, secret

npm run fetch-fonts           # vendors the brand webfonts (once)
npm run calibrate-fonts       # measures them for exact text fitting (once)
npm run migrate               # workspace + database + seed templates
npm run seed                  # optional: a sample product library
npm run doctor                # confirms what the environment can do

npm start                     # http://127.0.0.1:4310
```

Sign in at `/` with the admin credentials from `.env`.

### Requirements

- Node.js **22.5 or newer** (for `node:sqlite`)
- Headless Chromium, for PNG/JPEG/WebP output
  (`apt install chromium` — Debian/Ubuntu). Without it the engine still runs and
  emits SVG; `npm run doctor` says so plainly.

---

## Using it

**Add a product** → Products → *Add Product*. Upload photography; a cut-out on a
transparent background gives the best result. Without an image the templates draw
a neutral placeholder rather than breaking.

**Generate a post** → *Generate Now* anywhere in the UI. Pick a product, a
template and a size; the preview renders instantly as vector, and *Generate*
writes the final image.

**Automate it** → Settings → Schedule. Choose times, timezone, days and posts per
run. The engine picks what to publish next by rotation: never-published content
first, then the least recently published, avoiding any product + template +
category combination used inside the rotation window.

Generated posts wait for approval by default. Automatic publishing requires
*both* the schedule toggle **and** `CONTENT_ENGINE_AUTO_PUBLISH=true` on the
server — a deliberate two-key arrangement so nothing reaches the public feed by
accident.

---

## Template families

Templates are **data, not code**. Each row picks a layout family and configures
it; administrators create, duplicate, edit and deactivate them freely.

| Family | For |
| --- | --- |
| `premium-product` | Large instrument hero, minimal headline, key specs |
| `instrument-sale` | The reusable sale layout — configuration, warranty, qualification |
| `modern-glass` | One glass card over a controlled gradient |
| `dark-laboratory` | Premium dark, instrument under a spotlight |
| `clean-white-laboratory` | Light, high-readability technical layout |
| `technical-specification` | Hero product plus a grid of specification cards |
| `refurbished-instrument` | Certified-refurbished badge, condition, warranty |
| `service-highlight` | AMC, CMC, calibration, IQ/OQ/PQ — led by scope of work |
| `spare-parts` | Part number as the hero data point, compatible instruments |
| `company-update` | Announcements in statement typography |
| `social-story` | 9:16, one dominant visual, full-width CTA |

Configuration keys: `maxSpecs`, `ctaLabel`, `badgeLabel`, `showFeatures`,
`maxFeatures`, `mediaWeight`, `background`, `imageTreatment`, `showPrice`,
`showContact`, `accentColor`.

### Output sizes

Instagram square (1080×1080), portrait (1080×1350), story (1080×1920), Facebook
(1200×630), LinkedIn (1200×627), WhatsApp (1080×1080), website banner
(1920×640), product card (800×1000) — plus any custom size.

One template produces all of them. The layout **re-composes** per aspect ratio
(square and portrait stack; landscape and wide split into columns; stories get a
tall composition) rather than being stretched.

---

## Publishing to the website

The existing Vision Analytical site is a static page with no CMS, so the engine
publishes to its own feed and the site reads it. Add two lines to `index.html`:

```html
<div id="vision-content-feed" data-endpoint="https://studio.visionanalytical.in" data-limit="6"></div>
<script src="/vision-content-feed.js" defer></script>
```

Copy `web/vision-content-feed.js` to the site's web root. The widget inherits the
page's own CSS variables, so it matches the site without further styling.

Set `CONTENT_ENGINE_PUBLISH_WEBHOOK` to also POST each publication to a
downstream system.

---

## n8n

The engine works fully without n8n; n8n is an optional driver. Import from
`n8n/` into the existing instance — do not install a second one:

- `daily-content.workflow.json` — generates one post per day for approval
- `publish-approved.workflow.json` — publishes on approval, retrying once

Both expect `CONTENT_ENGINE_URL` and `CONTENT_ENGINE_API_KEY` as n8n environment
variables.

---

## API

Admin routes need a session cookie or `X-API-Key`. `/api/feed`, `/healthz` and
published media are the only public surface.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` · `/logout` · `GET /me` | Session auth |
| `GET` | `/api/dashboard` | Counts, storage, renderer, schedule |
| `GET POST PUT DELETE` | `/api/templates[/:id]` | Template manager |
| `POST` | `/api/templates/:id/duplicate` | Copy (starts inactive) |
| `GET POST PUT DELETE` | `/api/products[/:id]` | Product library |
| `POST` | `/api/products/:id/images` | Upload (multipart; bytes are sniffed) |
| `POST` | `/api/products/:id/archive` · `/restore` · `/duplicate` | Lifecycle |
| `POST` | `/api/preview` | Instant SVG preview, nothing stored |
| `POST` | `/api/generate` | Generate; omit ids to use rotation |
| `GET` | `/api/content[/:id]` | Calendar and detail |
| `POST` | `/api/content/:id/publish` · `/retry` · `/regenerate` · `/schedule` · `/cancel` | Content actions |
| `GET PUT` | `/api/schedule` · `/api/settings/branding` · `/rotation` | Settings |
| `POST` | `/api/schedule/run` | One scheduler tick (n8n entry point) |
| `GET` | `/api/logs` · `/api/categories` · `/api/formats` | Reference |
| `GET` | `/api/feed` | **Public** published feed |
| `GET` | `/media/*` | Published files public; everything else admin-only |

---

## Operations

```bash
npm run doctor                       # environment check
npm test                             # 54 tests
npm run generate                     # next post by rotation
npm run generate -- --all-templates --product 1
npm run scheduler                    # one tick, for system cron
```

### Storage

```
/srv/vision-workspace/content-engine/
    generated/YYYY/MM/   templates/   products/   uploads/
    exports/   archives/   logs/      content-engine.sqlite
```

Filenames are unique and descriptive
(`instrument-sale-agilent-1260-premium-product-20260818-100000-a82f.png`) and
**generated files are never overwritten or deleted implicitly** — deleting a
content record leaves its image on disk.

### systemd

```ini
[Unit]
Description=Vision AutoContent Engine
After=network.target

[Service]
Type=simple
User=vision
WorkingDirectory=/opt/vision-content-engine
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
EnvironmentFile=/opt/vision-content-engine/.env

[Install]
WantedBy=multi-user.target
```

Bind to `127.0.0.1` and put nginx in front for TLS.

---

## Security

- Admin session cookies (`HttpOnly`, `SameSite=Lax`, `Secure` in production) and
  a constant-time-compared API key for machines.
- Uploads are validated by **sniffing the bytes**, not the declared MIME type.
- Media paths are resolved against the workspace root; traversal is rejected.
- Unpublished images are not publicly readable.
- Log context is scrubbed of anything matching password/token/secret/key.
- Internal errors return a generic 500; details go to the log, not the client.
- The admin page runs under a strict CSP and loads nothing external.

Secrets live only in `.env`.

---

## Known limitations

- **Rasterising needs Chromium** (or `sharp`). Without one, output is SVG only.
- **The scheduler is single-node.** Two instances against one database would both
  fire; run one, or drive it from n8n.
- **`node:sqlite` is marked experimental** by Node. It is stable in practice for
  this workload; the notice is filtered from logs. Migrating to Postgres would
  mean rewriting `src/db/` only.
- **The published feed is pull-based.** The engine does not post to Instagram,
  Facebook or LinkedIn — that needs their APIs and real credentials, which are
  deliberately not invented here.
- **Font calibration is per-font.** Adding a brand face means re-running
  `npm run calibrate-fonts`; without it, that face falls back to estimated
  metrics and the browser validation pass does the correcting.

## Possible next steps

Caption and hashtag assistance behind the optional AI module (off by default);
direct social publishing once API credentials exist; multi-image carousels; a
month-grid calendar view; per-user roles beyond the single admin role.
