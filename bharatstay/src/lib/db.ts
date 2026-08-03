import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * One Prisma client, reaching Postgres through node-postgres.
 *
 * This is what makes the app run on Cloudflare. Prisma's old client shipped a
 * native query engine that the Workers runtime cannot load; the generated
 * client plus the `pg` driver adapter is plain JavaScript over a TCP socket,
 * and the same path works unchanged under Node — one code path, not two.
 *
 * DATABASE_URL must point at a *pooled* endpoint in production. A Worker can
 * fan out to many isolates at once and a direct connection string will run
 * Postgres out of sessions.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

// Next.js keeps modules alive across hot reloads in dev, so cache the client on
// globalThis to avoid exhausting Postgres connections.
export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
