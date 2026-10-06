import { prisma } from '../lib/prismaClient.js';

export class ClassRepository {
  async findAllByOrgId(organizationId, activeOnly = true) {
    return prisma.class.findMany({
      where: {
        organizationId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id, organizationId) {
    return prisma.class.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { isActive: true },
            },
          },
        },
      },
    });
  }

  async create(data) {
    return prisma.class.create({
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id, data) {
    return prisma.class.update({
      where: { id },
      data,
    });
  }

  // ── Enrollments ─────────────────────────────────────────────────────────────

  async findEnrollmentsByClassId(classId, activeOnly = true) {
    return prisma.enrollment.findMany({
      where: {
        classId,
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

  async findEnrollment(classId, userId) {
    return prisma.enrollment.findUnique({
      where: {
        classId_userId: {
          classId,
          userId,
        },
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
    });
  }

  async createEnrollment(data) {
    return prisma.enrollment.create({
      data,
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
    });
  }

  async updateEnrollment(id, data) {
    return prisma.enrollment.update({
      where: { id },
      data,
    });
  }

  async deleteEnrollment(id) {
    return prisma.enrollment.delete({
      where: { id },
    });
  }
}
