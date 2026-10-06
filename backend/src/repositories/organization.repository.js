import { prisma } from '../lib/prismaClient.js';
export class OrganizationRepository {
  async findAll(activeOnly = true) {
    return prisma.organization.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { createdAt: 'desc' },
    });
  }
  async findById(id) {
    return prisma.organization.findUnique({ where: { id } });
  }
  async findBySlug(slug) {
    return prisma.organization.findUnique({ where: { slug } });
  }
  async create(data) {
    return prisma.organization.create({ data });
  }
  async update(id, data) {
    return prisma.organization.update({ where: { id }, data });
  }
  // Soft-delete: sets isActive = false instead of hard deleting
  async softDelete(id) {
    return prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
//# sourceMappingURL=organization.repository.js.map
