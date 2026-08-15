# Recovery

The site is down. This page gets it back.

Work top to bottom — the scenarios are ordered by how common they are, and the
first three cover almost everything. **Diagnose before you act:** the most
expensive recoveries are the ones where someone restored a backup for a problem
that a restart would have fixed.

Related: [BACKUP.md](./BACKUP.md) · [HEALTHCHECK.md](./HEALTHCHECK.md) ·
[DEPLOYMENT.md](./DEPLOYMENT.md)

---

## First: 60 seconds of diagnosis

```bash
cd ~/apps/n8n/vision-analytical
./scripts/healthcheck.sh
```

That names the broken thing. If the script itself will not run:

```bash
COMPOSE="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"
$COMPOSE ps                  # what is up? (migrate showing "Exited (0)" is correct)
$COMPOSE logs --tail=50 app  # what did it say on the way down?
df -h /                      # full disk?
```

| What you see | Go to |
|---|---|
| Nothing running at all | [Scenario 1](#scenario-1-everything-stopped) |
| Some containers up, one restarting | [Scenario 2](#scenario-2-one-container-is-unhealthy) |
| `no space left on device` | [Scenario 3](#scenario-3-the-disk-is-full) |
| Site loads, data is wrong or missing | [Scenario 4](#scenario-4-the-data-is-damaged) |
| Server itself is gone | [Scenario 5](#scenario-5-the-server-is-gone) |
| Site is fine, just unreachable | [Scenario 6](#scenario-6-the-site-is-unreachable-but-healthy) |

---

## Scenario 1: everything stopped

**Usually:** the host rebooted, or Docker was restarted.
**Time: 1–2 minutes. No data loss.**

```bash
cd ~/apps/n8n/vision-analytical
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d
./scripts/healthcheck.sh
```

Note `up -d` **without** `--build` — nothing changed in the code, so there is
nothing to rebuild, and rebuilding turns a 90-second recovery into ten minutes.

Make it survive the next reboot (the compose file already sets
`restart: unless-stopped`, which only works if Docker itself starts on boot):

```bash
sudo systemctl enable docker
```

---

## Scenario 2: one container is unhealthy

**Time: 2–5 minutes.**

```bash
COMPOSE="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"
$COMPOSE ps                          # which one?
$COMPOSE logs --tail=100 <service>   # why?
$COMPOSE restart <service>
```

If `app` restarts in a loop, **read the migrate logs first** — it runs before
the app, and its failure is the more useful message:

```bash
$COMPOSE logs migrate
```

| Log says | Cause | Fix |
|---|---|---|
| `Can't reach database server` | Postgres not up yet, or wrong password | `$COMPOSE restart postgres`, wait 10s, restart app |
| `migration failed` | A migration errored midway | [Scenario 4](#scenario-4-the-data-is-damaged) |
| `EADDRINUSE` | Something else on the port | `sudo lsof -i :3000` |
| `SESSION_SECRET is not set` | `deploy/.env` missing or empty | Restore it from backup |

Rebuild only if you actually changed code:

```bash
$COMPOSE up -d --build app
```

---

## Scenario 3: the disk is full

**Time: 5 minutes.** Postgres stops accepting writes when the disk fills, and
the first symptom is often a site that looks fine until someone saves something.

```bash
df -h /
docker system df          # how much is Docker holding?
```

Reclaim, least destructive first:

```bash
# 1. Dangling build layers and stopped containers — always safe
docker system prune -f

# 2. Unused images — safe; the next build re-pulls what it needs
docker image prune -a -f

# 3. Old logs
sudo journalctl --vacuum-size=200M

# 4. Old backups, if they are on this disk (keep the recent ones)
ls -1t ~/backups/vision-analytical/db-*.sql.gz | tail -n +8 | xargs -r rm
```

> **Never run `docker volume prune`.** `deploy_postgres-data` and
> `deploy_uploads` are the database and the uploaded files. Pruning volumes is
> the fastest way to turn a full disk into total data loss.

Then restart:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env restart
./scripts/healthcheck.sh
```

---

## Scenario 4: the data is damaged

**Time: 10–15 minutes. Loses data written since the last backup.**

Only do this when the data really is wrong — a bad migration, a mistaken bulk
delete, corruption. **A slow or unreachable site is not this scenario.**

```bash
cd ~/apps/n8n/vision-analytical

# 1. What have we got?
ls -lt ~/backups/vision-analytical/db-*.sql.gz | head -5

# 2. Which commit does that backup belong to? Restoring data from a newer
#    schema into older code (or vice versa) leaves the site broken anyway.
cat ~/backups/vision-analytical/commit-<stamp>.txt
git rev-parse HEAD

# 3. If they differ, move the code to match the data first:
git checkout <commit-from-the-backup>
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build

# 4. Restore. This takes its own pre-restore dump before touching anything.
./scripts/restore.sh ~/backups/vision-analytical/db-<stamp>.sql.gz \
                     ~/backups/vision-analytical/uploads-<stamp>.tar.gz
```

The script finishes by running the health check. If it fails, the state from
before the restore is in `~/backups/vision-analytical/pre-restore-*.sql.gz`.

### A migration failed halfway

Prisma records migrations in `_prisma_migrations`. A row with `finished_at`
null is a migration that started and did not finish.

```bash
COMPOSE="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"
$COMPOSE exec postgres psql -U vision_analytical -d vision_analytical -c \
  "SELECT migration_name, started_at, finished_at, logs
     FROM _prisma_migrations WHERE finished_at IS NULL;"
```

Do **not** hand-edit an applied migration file. Either fix the data that made
it fail and re-run the migrate job:

```bash
$COMPOSE run --rm migrate
```

…or restore from the backup taken before the deploy, which is why
[BACKUP.md](./BACKUP.md#before-a-risky-change) says to take one.

---

## Scenario 5: the server is gone

Total loss — hardware failure, deleted VM, unrecoverable host.

**Realistic time: 30–45 minutes**, of which 20–30 is Docker installation and
the image build. Not 15. Anyone quoting 15 minutes for a from-scratch rebuild
has not timed the build.

### 5.1 Prerequisites (~10 min)

Install Docker per [DEPLOYMENT.md §3.1](./DEPLOYMENT.md#31-install-prerequisites).

### 5.2 Clone (~1 min)

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/visionanalytical96-boop/Vision-website.git
cd Vision-website && git checkout claude/vision-analytical-server-arch-3jjosh
cd vision-analytical
```

Check out the commit the backup belongs to, if it is not the newest:

```bash
git checkout $(cat /path/to/backups/commit-<stamp>.txt)
```

### 5.3 Secrets first (~1 min)

**Before anything else** — nothing starts without this:

```bash
cp /path/to/backups/env-<stamp>.backup deploy/.env
chmod 600 deploy/.env
```

If `deploy/.env` was never backed up, recreate it from
`deploy/.env.example`. Note what this costs:

- `SESSION_SECRET` — a new value logs everyone out. Acceptable.
- `POSTGRES_PASSWORD` — pick any value; the restore creates the database fresh.
- `CLOUDFLARE_TUNNEL_TOKEN` — must be regenerated in the Cloudflare dashboard.

### 5.4 Build and start (~15–25 min)

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

Wait for `migrate` to finish:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs -f migrate
```

At this point the site is up with an **empty** database — schema only.

### 5.5 Restore the data (~5 min)

```bash
./scripts/restore.sh /path/to/backups/db-<stamp>.sql.gz \
                     /path/to/backups/uploads-<stamp>.tar.gz
```

### 5.6 Point traffic at it (~2 min)

If the tunnel token was restored, `cloudflared` reconnects on its own and the
domain works immediately. If it was regenerated: Cloudflare Zero Trust →
Networks → Tunnels → your tunnel → Public Hostname → `http://nginx:80`.

### 5.7 Verify

```bash
./scripts/healthcheck.sh
curl -I https://visionanalytical.co.in
```

### Cutting this to ~15 minutes

The build dominates. To make a full rebuild fast, push the built image to a
registry as part of deployment and pull it instead of building:

```bash
docker tag vision-analytical-app ghcr.io/<you>/vision-analytical:latest
docker push ghcr.io/<you>/vision-analytical:latest
```

Then a recovery pulls (~2 min) rather than builds (~20 min). This is not set up
today — noted as the honest way to hit that target, not claimed as done.

---

## Scenario 6: the site is unreachable but healthy

`./scripts/healthcheck.sh` passes, but the public URL does not load. The
application is fine; the path to it is not.

```bash
COMPOSE="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"

# Is the tunnel connected?
$COMPOSE logs --tail=50 cloudflared
```

| Log shows | Fix |
|---|---|
| `Registered tunnel connection` | Tunnel is fine — check DNS and the Public Hostname mapping in Cloudflare |
| `Unauthorized` / `invalid token` | Token wrong or revoked. Regenerate it, update `deploy/.env`, `$COMPOSE up -d cloudflared` |
| Nothing / container not running | `$COMPOSE up -d cloudflared` |

Confirm the app answers internally, which separates "app broken" from
"route broken":

```bash
$COMPOSE exec nginx wget -qO- http://app:3000/ | head -5
```

If that returns HTML, the problem is entirely between Cloudflare and nginx.

---

## Keep this reachable offline

This file is in the repository — which is no help if the repository is what you
cannot reach. Keep a copy where you can read it when the server is down:

```bash
cp RECOVERY.md BACKUP.md ~/Dropbox/vision-analytical-runbook/   # or print it
```

Along with:

- Where the backups are (host, path, or cloud remote)
- The Cloudflare account login
- The server's SSH access details
