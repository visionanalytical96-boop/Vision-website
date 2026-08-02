import { PrismaClient } from '@prisma/client';

// Next.js keeps modules alive across hot reloads in dev, so cache the client on
// globalThis to avoid exhausting Postgres connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
