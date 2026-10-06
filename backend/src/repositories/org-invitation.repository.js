import { prisma } from '../lib/prismaClient.js';

export class OrgInvitationRepository {
  // Create a new invitation
  async create(data) {
    return prisma.orgInvitation.create({ data });
  }

  // Find by unique token (used when accepting an invite)
  async findByToken(token) {
    return prisma.orgInvitation.findUnique({ where: { token } });
  }

  // Find by id
  async findById(id) {
    return prisma.orgInvitation.findUnique({ where: { id } });
  }

  // List all invitations for an org
  async findAllByOrgId(organizationId, status) {
    return prisma.orgInvitation.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        invitedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update (used to change status to ACCEPTED / DECLINED / EXPIRED)
  async update(id, data) {
    return prisma.orgInvitation.update({ where: { id }, data });
  }
}
