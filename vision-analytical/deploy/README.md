# Deployment

Docker Compose stack: Postgres, the Next.js app (standalone build), Nginx as a
reverse proxy, and `cloudflared` for a Cloudflare Tunnel. No ports are
published to the host - Cloudflare Tunnel is the only way in.

## First deploy

1. `cp deploy/.env.example deploy/.env` and fill it in (Postgres password,
   `SESSION_SECRET`, `SEED_ADMIN_PASSWORD`, Cloudflare Tunnel token - see the
   comments in that file for where each value comes from).
2. Create a tunnel in the Cloudflare Zero Trust dashboard (Networks >
   Tunnels > Create a tunnel > Docker connector) and set its Public Hostname
   to `http://nginx:80`.
3. From `vision-analytical/`:
   ```bash
   docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
   ```
   This builds the image, starts Postgres, runs `migrate` once (applies
   migrations + seeds), then starts `app`, `nginx` and `cloudflared`.
4. Unset `SEED_ADMIN_PASSWORD` in `deploy/.env` after confirming you can log
   in - it's only consumed the first time the admin account is created.

## Redeploying after a code change

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```
`migrate` re-runs (idempotently) before `app` restarts, so any new migrations
are applied automatically.

## Data that persists across redeploys

- `postgres-data` volume - the database.
- `uploads` volume - product/refurbished photos and blog cover images
  (mounted at `/app/public/uploads` in the `app` container).

## Logs

```bash
docker compose -f deploy/docker-compose.yml logs -f app
```
