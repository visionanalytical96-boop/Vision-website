import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../src/generated/prisma/client';

// Bootstraps the first Admin account. Safe to re-run: does nothing unless
// SEED_ADMIN_PASSWORD is set, and skips if the account already exists - so
// there is never a default/known admin password shipped in source control.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@visionanalytical.co.in';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn(
      'SEED_ADMIN_PASSWORD is not set - skipping admin bootstrap.\n' +
        'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD and re-run `npx prisma db seed` to create the first admin account.',
    );
    await prisma.$disconnect();
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user ${adminEmail} already exists - skipping.`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Administrator',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Created admin user: ${adminEmail}`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
