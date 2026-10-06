import { prisma } from '../src/lib/prismaClient.js';
import { Role } from '../src/generated/prisma/client.js';
async function main() {
  console.log('Start seeding...');
  // 1. Create a platform admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@eduquest.com' },
    update: {},
    create: {
      email: 'admin@eduquest.com',
      firstName: 'Platform',
      lastName: 'Admin',
      isPlatformAdmin: true,
      isEmailVerified: true,
      // For testing, a simple plaintext password hash or dummy value (we'll implement real hashing later)
      passwordHash: 'dummy_hash',
    },
  });
  console.log(`Created admin user with id: ${admin.id}`);
  // 2. Create a test organization
  const org = await prisma.organization.upsert({
    where: { slug: 'test-school' },
    update: {},
    create: {
      name: 'Test School',
      slug: 'test-school',
      description: 'A test organization for EduQuest development.',
    },
  });
  console.log(`Created organization with id: ${org.id}`);
  // 3. Create a membership for the admin in the test organization as a TEACHER
  const membership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      organizationId: org.id,
      role: Role.TEACHER,
    },
  });
  console.log(`Created membership for ${admin.firstName} in ${org.name} as ${membership.role}`);
  console.log('Seeding finished.');
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
//# sourceMappingURL=seed.js.map
