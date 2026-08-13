# Backup and restore

What has to be backed up, how, and how to prove the backup actually works.

Related: [RECOVERY.md](./RECOVERY.md) (server is down) ·
[HEALTHCHECK.md](./HEALTHCHECK.md) (is it working) ·
[DEPLOYMENT.md](./DEPLOYMENT.md) (how it is deployed)

---

## What needs backing up

Only three things cannot be rebuilt from the git repository:

| # | What | Where it lives | Lost if not backed up |
|---|---|---|---|
| 1 | **Database** | Docker volume `deploy_postgres-data` | Every product, customer, order, quote, invoice, service record, employee, attendance row and article |
| 2 | **Uploaded files** | Docker volume `deploy_uploads` (`/app/public/uploads`) | Every product image, document, signature and article cover |
| 3 | **`deploy/.env`** | On disk, gitignored | The secrets. Without it a restore cannot start. |

Everything else — source code, migrations, container images, `node_modules` —
is rebuilt from git. Do not waste backup space on it.

> **`deploy/.env` is the one people forget.** It is deliberately not in git, so
> a "full git backup" does not contain it. A database backup without it leaves
> you unable to bring the stack up at all.

---

## Taking a backup

```bash
cd ~/apps/n8n/vision-analytical
./scripts/backup.sh
```

Writes to `~/backups/vision-analytical/`:

```
db-2026-08-13-140000.sql.gz        the database
uploads-2026-08-13-140000.tar.gz   the uploaded files
env-2026-08-13-140000.backup       deploy/.env (mode 600)
commit-2026-08-13-140000.txt       the git commit this data belongs to
```

A different destination:

```bash
./scripts/backup.sh /mnt/backup-disk/vision-analytical
```

The script keeps the **14 most recent** of each file and deletes older ones. It
deliberately does not delete "anything older than N days" — a machine that was
switched off for a month would wake up and delete every backup it had.

**Safe to run while the site is live.** `pg_dump` takes a consistent snapshot
without locking the application out.

### Why the commit hash is recorded

A restore against the wrong code version is how a "successful" restore still
leaves the site broken: newer code expecting a column the older dump does not
have. `commit-*.txt` says exactly which code that data belongs to.

---

## Automating it

Daily at 02:30, with a log:

```bash
mkdir -p ~/logs
crontab -e
```

```cron
30 2 * * * cd ~/apps/n8n/vision-analytical && ./scripts/backup.sh >> ~/logs/backup.log 2>&1
```

Confirm it is actually running — an unchecked backup job is the classic way to
discover at restore time that it has been failing for months:

```bash
tail -20 ~/logs/backup.log
ls -lt ~/backups/vision-analytical/db-*.sql.gz | head -3
```

`./scripts/healthcheck.sh` also fails if the newest backup is more than 48
hours old, so a silently dead cron job shows up in the daily health check
rather than during an emergency.

### Off the machine

Backups on the same server do not survive the server. Copy them somewhere else:

```bash
# To another machine over SSH
rsync -az --delete ~/backups/vision-analytical/ backup-user@other-host:~/va-backups/

# Or to any rclone remote (Google Drive, S3, Backblaze — all have free tiers)
rclone sync ~/backups/vision-analytical remote:va-backups
```

Add whichever you use to the same cron line, after the backup script.

---

## Restoring

```bash
cd ~/apps/n8n/vision-analytical

# Database only
./scripts/restore.sh ~/backups/vision-analytical/db-2026-08-13-140000.sql.gz

# Database and uploaded files
./scripts/restore.sh \
  ~/backups/vision-analytical/db-2026-08-13-140000.sql.gz \
  ~/backups/vision-analytical/uploads-2026-08-13-140000.tar.gz
```

The script:

1. Asks for confirmation — you must type `restore`.
2. **Dumps the current database first**, to `pre-restore-<timestamp>.sql.gz`.
   Restoring the wrong file is a common way to turn one bad day into two.
3. Stops the app so nothing writes mid-restore.
4. Restores with `ON_ERROR_STOP`, so a broken dump fails loudly instead of
   leaving a half-restored database that looks fine.
5. Starts the app and runs the health check.

If the health check fails afterwards, it tells you where the pre-restore dump
is so you can go back.

### Restoring by hand

If the script is unavailable:

```bash
cd ~/apps/n8n/vision-analytical
COMPOSE="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"

$COMPOSE stop app
gunzip -c backup.sql.gz | $COMPOSE exec -T postgres \
  psql -U vision_analytical -d vision_analytical --set ON_ERROR_STOP=on
$COMPOSE start app
```

### Restoring onto a fresh server

See [RECOVERY.md — Scenario 5](./RECOVERY.md#scenario-5-the-server-is-gone).
The short version: restore `deploy/.env` **first**, bring the stack up, then
restore the database and uploads.

---

## Testing the backup

**An untested backup is not a backup.** Test quarterly, and after any change to
the database or deployment setup.

The honest test is a restore onto a machine that is not production:

```bash
# On a spare machine or a second directory
git clone https://github.com/visionanalytical96-boop/n8n.git test-restore
cd test-restore && git checkout claude/vision-analytical-server-arch-3jjosh
cd vision-analytical

cp ~/backups/vision-analytical/env-<stamp>.backup deploy/.env
# Change POSTGRES_PASSWORD and the compose project name so it cannot touch production:
docker compose -p va-test -f deploy/docker-compose.yml --env-file deploy/.env up -d postgres
./scripts/restore.sh ~/backups/vision-analytical/db-<stamp>.sql.gz
```

Then check the data is really there:

```bash
docker compose -p va-test -f deploy/docker-compose.yml --env-file deploy/.env \
  exec postgres psql -U vision_analytical -d vision_analytical -c \
  'SELECT
     (SELECT count(*) FROM "Product")   AS products,
     (SELECT count(*) FROM "User")      AS users,
     (SELECT count(*) FROM "Order")     AS orders,
     (SELECT count(*) FROM "BlogPost")  AS articles;'
```

Compare against production. If the numbers differ, the backup is not complete —
find out why before you need it.

Tear the test down:

```bash
docker compose -p va-test -f deploy/docker-compose.yml --env-file deploy/.env down -v
```

---

## How much can we lose?

With the daily 02:30 cron job:

| | |
|---|---|
| **Recovery Point Objective** (data loss) | up to 24 hours |
| **Recovery Time Objective** (downtime) | 10–15 min for a database restore; 30–45 min for a full rebuild — see [RECOVERY.md](./RECOVERY.md) |

To lose less than a day, run the backup more often — every 4 hours is
inexpensive at this data size:

```cron
0 */4 * * * cd ~/apps/n8n/vision-analytical && ./scripts/backup.sh >> ~/logs/backup.log 2>&1
```

Raise the retention count in `scripts/backup.sh` if you do (it keeps 14 of
each, which at 4-hourly is under three days).

---

## Before a risky change

Always take a manual backup before deploying a release that carries a
migration, since Prisma has no automatic down-migration:

```bash
# Does this release change the schema?
git fetch && git diff --name-only HEAD origin/claude/vision-analytical-server-arch-3jjosh -- prisma/migrations

# If it does:
./scripts/backup.sh
```
