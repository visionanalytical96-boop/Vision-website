# syntax=docker/dockerfile:1

# --- deps: install once, reused by the builder ---------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: this stage doesn't have prisma/schema.prisma yet (only
# copied into the builder stage below), so the postinstall hook would fail
# looking for it. The builder stage's own `npx prisma generate` (after
# `COPY . .`) is what actually generates the client.
RUN npm ci --ignore-scripts

# --- builder: generate the Prisma client and build the Next.js app -------
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Prisma Client generation only needs the schema, not a reachable database -
# this placeholder keeps prisma.config.ts's datasource happy at build time.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL=${DATABASE_URL}

# Needed at BUILD time, not just runtime: NEXT_PUBLIC_* vars are inlined into
# the client bundle, and next.config.ts's headers() is evaluated during the
# build and baked into routes-manifest.json - so the CSP is fixed here, and a
# runtime-only value would arrive too late to affect it. Defaults to https so
# an unspecified build keeps the stricter header.
ARG NEXT_PUBLIC_SITE_URL="https://visionanalytical.co.in"
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

RUN npx prisma generate
RUN npm run build

# --- runner: minimal production image -------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone output excludes public/ and .next/static by design - copy them
# in separately so they land next to the traced server.js entrypoint.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Uploaded images live here at runtime - mounted as a volume in compose so
# they survive redeploys.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
