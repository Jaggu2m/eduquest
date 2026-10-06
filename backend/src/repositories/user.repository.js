import { prisma } from '../lib/prismaClient.js';
export class UserRepository {
  async findAll() {
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }
  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }
  async create(data) {
    return prisma.user.create({ data });
  }
  async update(id, data) {
    return prisma.user.update({ where: { id }, data });
  }
}
//# sourceMappingURL=user.repository.js.map
