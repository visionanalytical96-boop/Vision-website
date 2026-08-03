import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 keeps the connection out of schema.prisma. The CLI (migrate, db
 * push, studio) reads it from here; the running app builds its own client in
 * src/lib/db.ts with the node-postgres adapter.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
  migrations: { seed: 'tsx prisma/seed.mjs' },
});
