import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@zhijie.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
const ADMIN_NAME = process.env.ADMIN_NAME || '管理员';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: 'admin' },
    });
    console.log(`Updated existing user ${ADMIN_EMAIL} to admin role`);
  } else {
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hashed,
        name: ADMIN_NAME,
        role: 'admin',
        quota: 9999,
      },
    });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
