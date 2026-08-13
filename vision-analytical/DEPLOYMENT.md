# Deployment

Everything needed to take this project from a clean Ubuntu server to a running
site. No step assumes knowledge that isn't written down here.

---

## 1. Where the project lives

| | |
|---|---|
| **Git repository (use this)** | `https://github.com/visionanalytical96-boop/Vision-website` |
| **Former name (still redirects)** | `https://github.com/visionanalytical96-boop/n8n` |
| **Branch** | `claude/vision-analytical-server-arch-3jjosh` |
| **Application path inside the repo** | `vision-analytical/` |
| **Absolute path on the development machine** | `/home/user/n8n/vision-analytical` |

> **Important:** the repository root is an n8n fork; this application lives in
> the `vision-analytical/` **subdirectory**. Every command in this document is
> run from inside `vision-analytical/`, not from the repository root.

### The repository was renamed

It was created as `n8n` and is now `Vision-website`. Both URLs reach the same
repository — GitHub redirects the old name — which was verified by comparing
the complete ref lists of both URLs: they are byte-identical.

**Use `Vision-website`.** The redirect is not permanent in one specific way: if
anyone later creates a *new* repository called `n8n` under this account, the
redirect stops and `git clone .../n8n` silently fetches that new, wrong
repository instead. A clone that succeeds against the wrong source is worse
than one that fails.

An existing clone still pointing at the old name keeps working, but should be
updated:

```bash
cd ~/apps/n8n/vision-analytical      # wherever your clone lives
git remote -v                        # shows the old .../n8n URL
git remote set-url origin https://github.com/visionanalytical96-boop/Vision-website.git
git remote -v                        # confirm it now shows Vision-website
```

To find the exact commit a server is running:

```bash
cd <your-clone>/vision-analytical
git rev-parse HEAD
git log -1 --format='%h %ad %s' --date=iso
```

---

## 2. Where the generated files are

All paths relative to `vision-analytical/`.

| What | Where |
|---|---|
| Application source | `src/` |
| Pages and routes | `src/app/` |
| React components | `src/components/` |
| Server actions (writes) | `src/lib/actions/` |
| Data access (reads) | `src/lib/data/` |
| Domain logic | `src/lib/` |
| Database schema | `prisma/schema.prisma` |
| Migrations | `prisma/migrations/` |
| Seed script | `prisma/seed.ts` + `prisma/seed-data*.ts` |
| Generated Prisma client | `src/generated/prisma/` *(build artifact, gitignored)* |
| Documentation | `docs/`, `README.md`, `CONVENTIONS.md`, this file |
| Architecture review | `docs/architecture-review.md` |
| Attendance device notes | `docs/attendance-devices.md` |
| Deployment config | `deploy/` |
| Container image definition | `Dockerfile` |
| Static assets | `public/` |
| Uploaded files at runtime | `public/uploads/` *(Docker volume in production)* |
| Tests | `tests/` |

| Operational scripts | `scripts/` (backup, restore, healthcheck, changelog) |

There is no top-level `uploads/` directory — uploads live under
`public/uploads/`.

---

## 3. Build from scratch

Tested sequence on a clean Ubuntu 22.04/24.04 host.

### 3.1 Install prerequisites

```bash
sudo apt update
sudo apt install -y git curl ca-certificates

# Docker Engine + Compose plugin
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run docker without sudo (log out and back in afterwards)
sudo usermod -aG docker $USER
```

Verify:

```bash
docker --version
docker compose version
```

### 3.2 Clone

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/visionanalytical96-boop/Vision-website.git
cd Vision-website
git checkout claude/vision-analytical-server-arch-3jjosh
cd vision-analytical
```

The clone directory is named after the repository, so it is `Vision-website/`,
not `n8n/`. Adjust the paths in the rest of this document if your existing
clone is still called `n8n` — that is fine and needs no change.

### 3.3 Environment variables

```bash
cp deploy/.env.example deploy/.env
```

Then edit `deploy/.env`. Generate the two secrets:

```bash
openssl rand -base64 32   # -> SESSION_SECRET
openssl rand -base64 24   # -> POSTGRES_PASSWORD
```

| Variable | Required | Notes |
|---|---|---|
| `POSTGRES_USER` | yes | Defaults to `vision_analytical`. |
| `POSTGRES_PASSWORD` | **yes** | Compose refuses to start without it. |
| `POSTGRES_DB` | yes | Defaults to `vision_analytical`. |
| `SESSION_SECRET` | **yes** | Signs session cookies. Changing it logs everyone out. |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical URL. **Baked at build time** — changing it needs a rebuild. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | no | Fallback until Business Settings is filled in. |
| `NEXT_PUBLIC_CONTACT_PHONE` | no | Same. |
| `SEED_ADMIN_EMAIL` | first run | The admin account to create. |
| `SEED_ADMIN_PASSWORD` | first run | **No default.** Left empty, no admin is created. |
| `SEED_DEMO_DATA` | no | `"true"` seeds demo customer/engineer + sample records. Keep `"false"` in production. |
| `SEED_DEMO_PASSWORD` | no | Password for the demo logins. Defaults to `Demo1234!`. |
| `CLOUDFLARE_TUNNEL_TOKEN` | **yes** | Compose refuses to start without it. See §4.1. |

`DATABASE_URL` is **not** set by hand — compose builds it from the Postgres
variables.

### 3.4 One command does the rest

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

That single command runs, in order:

1. **build** — multi-stage Docker build (`Dockerfile`): install deps →
   `npx prisma generate` → `npm run build` → trim to a standalone runtime image.
2. **postgres** — starts and waits until `pg_isready` passes.
3. **migrate** — one-shot job: `npx prisma migrate deploy && npx prisma db seed`.
   Runs to completion before the app starts.
4. **app** — the Next.js standalone server on internal port 3000.
5. **nginx** — reverse proxy on internal port 80.
6. **cloudflared** — Cloudflare Tunnel; the only route in from the internet.

### 3.5 Individual commands, if you need them

Only for local development outside Docker:

```bash
npm ci                              # install (postinstall runs prisma generate)
npx prisma generate                 # regenerate the client after a schema edit
npx prisma migrate deploy           # apply pending migrations
npx prisma db seed                  # seed (idempotent, safe to re-run)
npm run build                       # production build
npm start                           # serve the production build
npm run dev                         # development server, hot reload
npm test                            # unit tests
npm run lint                        # eslint
npx tsc --noEmit                    # typecheck
```

---

## 4. Deploy to an Ubuntu server

### 4.1 Cloudflare Tunnel (first time only)

No ports are published to the host — the tunnel is the only ingress, which is
what keeps the server itself unreachable from the internet.

1. Cloudflare Zero Trust dashboard → **Networks → Tunnels → Create a tunnel**
2. Choose the **Docker** connector.
3. Copy the token from the `cloudflared tunnel run --token XXXX` command
   Cloudflare shows you. Paste **only the token** into `CLOUDFLARE_TUNNEL_TOKEN`
   in `deploy/.env`.
4. Under **Public Hostname**, point your domain at `http://nginx:80` — that is
   the internal compose service name, not a public address.

### 4.2 Required folders on the server

```
~/apps/n8n/                          the clone
~/apps/n8n/vision-analytical/        the application (all commands run here)
~/apps/n8n/vision-analytical/deploy/.env    secrets — never committed
```

Two Docker volumes hold everything that must survive a redeploy:

| Volume | Holds |
|---|---|
| `deploy_postgres-data` | The entire database |
| `deploy_uploads` | Uploaded images and documents |

Nothing else on disk is precious. The application is rebuilt from git.

### 4.3 Deploy an update

```bash
cd ~/apps/n8n/vision-analytical
git pull
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

Migrations run automatically as part of the `migrate` job. Data in the two
volumes is untouched.

### 4.4 Restart without rebuilding

```bash
# One service
docker compose -f deploy/docker-compose.yml --env-file deploy/.env restart app

# Everything
docker compose -f deploy/docker-compose.yml --env-file deploy/.env restart
```

### 4.5 Health checks

```bash
cd ~/apps/n8n/vision-analytical
COMPOSE="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"

# 1. Are all services up? `migrate` should read "Exited (0)" — that is success.
$COMPOSE ps

# 2. Is the database accepting connections?
$COMPOSE exec postgres pg_isready -U vision_analytical

# 3. Does the app answer through nginx? Expect 200.
$COMPOSE exec nginx wget -qS -O /dev/null http://app:3000/ 2>&1 | head -3

# 4. Did migrations actually apply?
$COMPOSE exec postgres psql -U vision_analytical -d vision_analytical \
  -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;"

# 5. Anything wrong in the logs?
$COMPOSE logs --tail=50 app
$COMPOSE logs --tail=30 migrate
```

The public check, once the tunnel is up:

```bash
curl -I https://visionanalytical.co.in
```

### 4.6 Rollback

The database and uploads live in volumes, so rolling back code is safe **as
long as the release you are rolling back to has the same or fewer migrations**.

```bash
cd ~/apps/n8n/vision-analytical

# What is running now — note this before you change anything
git rev-parse HEAD

# Go back to a known-good commit
git checkout <known-good-commit-sha>
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

**Rolling back across a migration needs care.** Prisma has no automatic "down"
migration. If the newer release added a migration, the older code will run
against a newer schema. Additive migrations (new tables/columns) are usually
harmless — the old code simply ignores them. A migration that *dropped* or
*renamed* something is not reversible this way, and you restore from backup
instead:

```bash
# Back up before every deploy that carries a migration
docker compose -f deploy/docker-compose.yml --env-file deploy/.env \
  exec -T postgres pg_dump -U vision_analytical vision_analytical \
  | gzip > ~/backups/va-$(date +%F-%H%M).sql.gz

# Restore
gunzip -c ~/backups/va-2026-08-13-1400.sql.gz \
  | docker compose -f deploy/docker-compose.yml --env-file deploy/.env \
    exec -T postgres psql -U vision_analytical -d vision_analytical
```

Check whether a release carries migrations before deploying it:

```bash
git diff --name-only HEAD origin/claude/vision-analytical-server-arch-3jjosh -- prisma/migrations
```

---

## 5. Preview the site

### Local development

```bash
cd vision-analytical
cp .env.example .env          # set DATABASE_URL + SESSION_SECRET
npm ci
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

| | URL |
|---|---|
| **Local** | `http://localhost:3000` |
| **LAN** | `http://<server-ip>:3000` — `npm run dev -- -H 0.0.0.0` to bind all interfaces |
| **Production** | Whatever `NEXT_PUBLIC_SITE_URL` is set to (default `https://visionanalytical.co.in`), served through the Cloudflare Tunnel |

### LAN access to the Docker stack

The compose stack deliberately publishes **no host ports**. To reach it over
the LAN — for testing on a phone, say — add a port mapping to the `nginx`
service in `deploy/docker-compose.yml`:

```yaml
  nginx:
    ports:
      - "8080:80"
```

Then `http://<server-ip>:8080`. Remove it before going to production; the
whole point of the tunnel is that nothing is exposed directly.

### Credentials

**There are no default admin credentials, by design.** The seed creates an
admin only when `SEED_ADMIN_PASSWORD` is set, and skips silently otherwise —
so an instance can never ship with a known password.

The admin account is whatever you set in `deploy/.env`:

| | |
|---|---|
| Email | `SEED_ADMIN_EMAIL` (default `admin@visionanalytical.co.in`) |
| Password | `SEED_ADMIN_PASSWORD` — chosen by you, no default |

Unset `SEED_ADMIN_PASSWORD` after the first successful login.

**Demo mode** (`SEED_DEMO_DATA="true"`, never in production) additionally
creates:

| Role | Email | Password |
|---|---|---|
| Customer | `demo.customer@example.com` | `SEED_DEMO_PASSWORD` (default `Demo1234!`) |
| Engineer | `demo.engineer@example.com` | `SEED_DEMO_PASSWORD` (default `Demo1234!`) |

### Forgotten admin password

```bash
cd ~/apps/n8n/vision-analytical
docker compose -f deploy/docker-compose.yml --env-file deploy/.env \
  exec postgres psql -U vision_analytical -d vision_analytical \
  -c "DELETE FROM \"User\" WHERE email = 'admin@visionanalytical.co.in';"
# then set SEED_ADMIN_PASSWORD in deploy/.env and re-run the migrate job:
docker compose -f deploy/docker-compose.yml --env-file deploy/.env run --rm migrate
```

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `env file …/deploy/.env not found` | `deploy/.env` must exist **as a file** — the `migrate` and `app` services declare `env_file: .env`, which is a separate mechanism from `--env-file`. Pointing `--env-file` somewhere else does not satisfy it. | `cp deploy/.env.example deploy/.env` and fill it in. |
| `set POSTGRES_PASSWORD in deploy/.env` | Compose guard | Fill it in. |
| `set CLOUDFLARE_TUNNEL_TOKEN in deploy/.env` | Compose guard | Fill it in, or comment out the `cloudflared` service for a LAN-only trial. |
| App container restarts in a loop | Usually a bad `DATABASE_URL` or a failed migration | `docker compose ... logs migrate` first — the migrate job runs before the app and its failure is the more useful message. |
| Site loads but images 404 | `uploads` volume not mounted, or files never uploaded | `docker volume ls \| grep uploads`; check Admin → Data Quality, which lists references pointing at files that no longer exist. |
| Changed `NEXT_PUBLIC_SITE_URL`, nothing happened | These are inlined at build time | Rebuild: `up -d --build`. |
| Everyone logged out after a deploy | `SESSION_SECRET` changed | Expected. Keep it stable. |
| `prisma migrate deploy` reports a failed migration | A migration errored midway | Read the error, fix the data, then re-run the migrate job. Do not edit an applied migration file. |
