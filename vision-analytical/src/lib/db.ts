import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

// `next build` imports every route to collect page data - even force-dynamic
// ones that never run their query code until a real request comes in - so
// merely importing this module must not require a database to be
// configured yet (e.g. before .env exists). Fall back to a placeholder
// connection string during the build phase specifically (same value the
// Dockerfile already uses for the same reason); nothing at build time ever
// executes a real query through it. Outside that phase a missing
// DATABASE_URL is a genuine misconfiguration and should fail loudly.
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return 'postgresql://build:build@localhost:5432/build';
  }
  throw new Error('DATABASE_URL environment variable is not set');
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reuse a single client across hot reloads in dev so we don't exhaust
// Postgres connections every time a file changes.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
