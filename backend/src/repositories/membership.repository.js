import { prisma } from '../lib/prismaClient.js';
export class MembershipRepository {
  async create(data) {
    return prisma.membership.create({ data });
  }
  async findById(id) {
    return prisma.membership.findUnique({ where: { id } });
  }
  async findByUserAndOrg(userId, organizationId) {
    return prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  }
  async findAllByOrgId(organizationId, activeOnly = true) {
    return prisma.membership.findMany({
      where: {
        organizationId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }
  async findAllByUserId(userId, activeOnly = true) {
    return prisma.membership.findMany({
      where: {
        userId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        organization: true,
      },
      orderBy: { joinedAt: 'desc' },
    });
  }
  async update(id, data) {
    return prisma.membership.update({
      where: { id },
      data,
    });
  }
}
//# sourceMappingURL=membership.repository.js.map
