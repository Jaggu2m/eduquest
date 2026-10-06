import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
// Prevent multiple instances of Prisma Client in development (hot-reload safe)
const globalForPrisma = globalThis;
function createPrismaClient() {
  // Prisma 7: uses driver adapters — the DB URL is handled by the pg Pool,
  // not read from schema.prisma (that's only for CLI/migrations via prisma7.config.ts)
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
//# sourceMappingURL=prismaClient.js.map
