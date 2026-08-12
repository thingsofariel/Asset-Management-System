import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Writes straight to the DB. Every account created after this one
  // goes through the normal admin-invite flow (POST /users/invite),
  // which requires an existing admin's JWT — so it can't be used to
  // create the very first admin. This script is that one exception.
  await prisma.user.create({
    data: {
      fullName: 'System Admin',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`Created admin user: ${adminEmail} (change the password after first login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
