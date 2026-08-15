# Health checks

How to know production is genuinely working — not merely that the containers
are running.

Related: [RECOVERY.md](./RECOVERY.md) (something is broken) ·
[BACKUP.md](./BACKUP.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## The 30-second check

```bash
cd ~/apps/n8n/vision-analytical
./scripts/healthcheck.sh
```

```
Vision Analytical health check — 2026-08-13 14:32:07

  OK    container postgres is running
  OK    container app is running
  OK    container nginx is running
  OK    container cloudflared is running
  OK    migrate job finished cleanly
  OK    database accepting connections
  OK    all migrations applied
  OK    catalogue has data (29 products)
  OK    active admin account exists (1)
  OK    homepage responds 200 through nginx
  OK    login page responds 200
  OK    admin redirects anonymous visitors (307)
  OK    disk at 42%
  OK    most recent backup is 12h old

All 14 checks passed.
```

Exit code is `0` when everything passes, otherwise the **number of failures** —
so it wires straight into monitoring without parsing output.

---

## What each check is actually for

Every check exists because of a specific way this system can be broken while
still *looking* fine.

### Containers running

`postgres`, `app`, `nginx`, `cloudflared` must all be `running`.

`migrate` is a **one-shot job** — `Exited (0)` is success. If you see it in a
list of "stopped containers" and restart it out of alarm, you will just re-run
migrations that are already applied (harmless, but not a fix).

### Migrate job exit code

Exit `0` means migrations and the seed completed. A non-zero exit means the app
may be running against a schema that does not match the code — which surfaces
later as a confusing runtime error on one page, not as an outage.

### Database accepting connections

`pg_isready`. Postgres can be *running* while refusing connections — during
recovery, or when the disk is full.

### All migrations applied

Counts rows in `_prisma_migrations` with `finished_at IS NULL`. A migration
that started and never finished leaves the schema in an unknown state. This is
the check that catches a half-applied deploy.

### Catalogue has data

`SELECT count(*) FROM "Product"`. Zero means a seed or restore did not complete.
The site would load perfectly and show an empty shop.

### Active admin account exists

No admin means nobody can log in and fix anything. Worth knowing before you
need to. If this fails, see [DEPLOYMENT.md §5](./DEPLOYMENT.md#5-preview-the-site).

### Homepage and login respond 200

Requested through nginx (`http://app:3000` from inside the nginx container),
which is how real traffic arrives — not against the app directly, which would
skip the proxy that could itself be misconfigured.

### Admin redirects anonymous visitors

`/admin` must return **307 or 302**, not 200.

**A 200 here is a security failure, not a success.** It would mean the admin
panel is serving to anyone. This check is the reason the script exists in this
form rather than as a simple "is the site up" ping.

### Disk under 90%

Postgres stops accepting writes when the disk fills. The site keeps serving
reads, so the first symptom is usually a customer unable to place an order —
long after the problem started. See
[RECOVERY.md Scenario 3](./RECOVERY.md#scenario-3-the-disk-is-full).

### Recent backup exists

Fails if the newest backup is more than 48 hours old. An unchecked backup job
is the classic way to discover at restore time that it has been failing for
months.

---

## Run it automatically

Daily at 08:00, quiet unless something fails, so mail only arrives when it
matters:

```cron
0 8 * * * cd ~/apps/n8n/vision-analytical && ./scripts/healthcheck.sh --quiet
```

`--quiet` prints only failures. cron mails you output, so silence means healthy.

Every 15 minutes, logging:

```cron
*/15 * * * * cd ~/apps/n8n/vision-analytical && ./scripts/healthcheck.sh --quiet >> ~/logs/health.log 2>&1
```

### External uptime monitoring

The script runs *on* the server, so it cannot tell you the server is
unreachable. Add an external check — free tiers are enough:

- [UptimeRobot](https://uptimerobot.com) — 50 monitors free, 5-minute interval
- [Better Stack](https://betterstack.com) — 10 monitors free

Point it at `https://visionanalytical.co.in` and alert on non-200. That covers
the case where the machine is off entirely and no local script will ever fire.

---

## Manual checks

Run after a deploy, or when investigating something the script does not cover.

### After every deploy

```bash
COMPOSE="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"

./scripts/healthcheck.sh                    # 1. the basics
$COMPOSE logs --tail=30 migrate             # 2. did migrations apply cleanly?
$COMPOSE logs --tail=50 app | grep -i error # 3. anything shouting?
curl -I https://visionanalytical.co.in      # 4. public URL, expect 200
```

Then, in a browser, five things a script cannot judge:

1. Homepage renders with images.
2. A product page loads and shows its specifications.
3. Search returns results.
4. Admin login works, and the dashboard shows real numbers.
5. Uploading an image in the admin succeeds and displays.

### Data integrity

```bash
$COMPOSE exec postgres psql -U vision_analytical -d vision_analytical -c \
 'SELECT
    (SELECT count(*) FROM "Product")        AS products,
    (SELECT count(*) FROM "User")           AS users,
    (SELECT count(*) FROM "Order")          AS orders,
    (SELECT count(*) FROM "Quote")          AS quotes,
    (SELECT count(*) FROM "Invoice")        AS invoices,
    (SELECT count(*) FROM "ServiceRequest") AS service_requests,
    (SELECT count(*) FROM "BlogPost")       AS articles,
    (SELECT count(*) FROM "Employee")       AS employees;'
```

Counts that drop unexpectedly between deploys mean a migration removed data.
Compare against the previous run.

### Broken file references

The application checks this itself. Admin → **Data Quality** lists database rows
pointing at files that no longer exist — the usual cause of missing images after
a restore where the uploads archive was skipped.

### Performance

```bash
curl -o /dev/null -s -w 'total: %{time_total}s  ttfb: %{time_starttransfer}s\n' \
  https://visionanalytical.co.in
```

Target is under 2 seconds. If it is slower, check in this order:

```bash
$COMPOSE stats --no-stream        # is a container starved of CPU/memory?
$COMPOSE exec postgres psql -U vision_analytical -d vision_analytical -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

### Certificates

Handled by Cloudflare, not by this stack — there is no certificate on the
server to expire. Verify the edge:

```bash
curl -sI https://visionanalytical.co.in | grep -i 'server\|cf-ray'
```

---

## Reading the failures

| Failure | Meaning | Go to |
|---|---|---|
| `container X` not running | Crashed or never started | [RECOVERY 1](./RECOVERY.md#scenario-1-everything-stopped) / [2](./RECOVERY.md#scenario-2-one-container-is-unhealthy) |
| `migrate job exit code N` | Migration or seed failed | [RECOVERY 4](./RECOVERY.md#scenario-4-the-data-is-damaged) |
| `database pg_isready failed` | Postgres down or full disk | [RECOVERY 3](./RECOVERY.md#scenario-3-the-disk-is-full) |
| `migrations N unfinished` | Half-applied schema | [RECOVERY 4](./RECOVERY.md#a-migration-failed-halfway) |
| `catalogue no products` | Seed or restore incomplete | Re-run: `$COMPOSE run --rm migrate` |
| `admin account none` | No one can log in | [DEPLOYMENT §5](./DEPLOYMENT.md#5-preview-the-site) |
| `homepage HTTP 500` | Application error | `$COMPOSE logs --tail=100 app` |
| **`admin access control got 200`** | **Admin panel is public** | Investigate immediately — check `src/lib/dal.ts` and `src/proxy.ts` are intact and the deploy is not a partial build |
| `disk N%` | Filling up | [RECOVERY 3](./RECOVERY.md#scenario-3-the-disk-is-full) |
| `backups Nh old` | Cron not running | [BACKUP.md](./BACKUP.md#automating-it) |

---

## Adding a check

Checks live in `scripts/healthcheck.sh`. Each is a command plus `pass`/`fail`:

```bash
if <condition>; then
  pass "what is true when this passes"
else
  fail "what broke" "the detail that helps"
fi
```

Add a check whenever an incident happens that the existing set would not have
caught. That is what keeps this file worth running.
