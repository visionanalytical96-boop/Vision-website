# BharatStay — Deployment

## Local development

```bash
cd bharatstay
npm install
cp .env.example .env.local   # fill in real values only for providers you actually connect
npm run dev
```

## Production build

```bash
npm run build
npm run start   # serves the production build on $PORT (default 3000)
```

## Recommended hosting

- **App:** Vercel (native Next.js support) or any Node 18+ host / Docker container running `npm run build && npm run start`.
- **Database:** managed PostgreSQL (Neon, RDS, Supabase, etc.) once `prisma/schema.prisma` is connected — run `npx prisma migrate deploy` as part of the release step.
- **Cache:** managed Redis (Upstash, ElastiCache) for search-result and session caching.
- **Object storage:** S3-compatible bucket for property images, KYC documents, generated PDFs/vouchers.

## Environment variables

See `.env.example` for the full list. Categories:

- Core app (`NEXTAUTH_SECRET`/`JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `NEXT_PUBLIC_APP_URL`)
- Payments need no keys — the owner's UPI ID is set in the admin panel's Site settings, not in the environment
- Messaging (SMS gateway, WhatsApp Business API, transactional email)
- Storage (S3-compatible bucket credentials)
- Maps: none needed — the site uses OpenStreetMap tiles, which take no key

**Never** commit `.env.local` or any file containing real secrets. `.env.example` must only ever contain empty placeholders.

## Docker (suggested, not yet included)

A minimal production Dockerfile for this app would look like:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## CI checklist before deploying

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. (once tests exist) `npm run test`
5. `npx prisma migrate deploy` against the target database (once wired to a real DB)
