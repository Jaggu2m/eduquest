import { prisma } from '../lib/prismaClient.js';

export class ClassService {
  constructor(classRepository, membershipRepository, organizationRepository) {
    this.classRepository = classRepository;
    this.membershipRepository = membershipRepository;
    this.organizationRepository = organizationRepository;
  }

  async getClasses(organizationId, activeOnly = true, user = null) {
    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new Error('Organization not found.');
    }

    const userId = user?.userId || user?.id;
    let isTeacherOrAdmin = user?.isPlatformAdmin;

    if (userId && !isTeacherOrAdmin) {
      const membership = await this.membershipRepository.findByUserAndOrg(userId, organizationId);
      if (membership?.role === 'TEACHER') {
        isTeacherOrAdmin = true;
      }
    }

    // Students only see classes they are actively enrolled in
    if (userId && !isTeacherOrAdmin) {
      return this.classRepository.findAllEnrolledByStudent({
        organizationId,
        userId,
        activeOnly,
      });
    }

    return this.classRepository.findAllByOrgId(organizationId, activeOnly);
  }

  async getClassById(classId, organizationId) {
    const cls = await this.classRepository.findById(classId, organizationId);
    if (!cls) {
      throw new Error('Class not found.');
    }
    return cls;
  }

  async createClass({ organizationId, user, classData }) {
    const userId = user.userId || user.id;
    const org = await this.organizationRepository.findById(organizationId);
    if (!org || !org.isActive) {
      throw new Error('Organization not found or inactive.');
    }

    // Role check: PLATFORM_ADMIN or active TEACHER in this org
    if (!user.isPlatformAdmin) {
      const membership = await this.membershipRepository.findByUserAndOrg(userId, organizationId);
      if (!membership || !membership.isActive || membership.role !== 'TEACHER') {
        throw new Error(
          'Forbidden: Only teachers or platform admins can create classes in this organization.',
        );
      }
    }

    const generatedCode =
      classData.code?.trim().toUpperCase() ||
      `${
        (classData.name || 'CLS')
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 3)
          .toUpperCase() || 'CLS'
      }-${Math.floor(100 + Math.random() * 900)}`;

    const newClass = await this.classRepository.create({
      organizationId,
      createdById: userId,
      name: classData.name,
      code: generatedCode,
      description: classData.description || null,
      isActive: true,
    });

    // Auto-create default #general channel for the class
    try {
      const channel = await prisma.channel.create({
        data: {
          classId: newClass.id,
          name: 'general',
          description: 'General class discussion',
        },
      });
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId,
        },
      });
    } catch (err) {
      console.error('[ClassService] Failed to auto-create general channel:', err.message);
    }

    return newClass;
  }

  async updateClass({ classId, organizationId, user, updates }) {
    const userId = user.userId || user.id;
    const cls = await this.classRepository.findById(classId, organizationId);
    if (!cls) {
      throw new Error('Class not found.');
    }

    // Permission check: PLATFORM_ADMIN, or the creator, or an active TEACHER in org
    if (!user.isPlatformAdmin && cls.createdById !== userId) {
      const membership = await this.membershipRepository.findByUserAndOrg(userId, organizationId);
      if (!membership || !membership.isActive || membership.role !== 'TEACHER') {
        throw new Error('Forbidden: You do not have permission to update this class.');
      }
    }

    return this.classRepository.update(classId, updates);
  }

  async deleteClass({ classId, organizationId, user }) {
    const userId = user.userId || user.id;
    const cls = await this.classRepository.findById(classId, organizationId);
    if (!cls) {
      throw new Error('Class not found.');
    }

    if (!user.isPlatformAdmin && cls.createdById !== userId) {
      const membership = await this.membershipRepository.findByUserAndOrg(userId, organizationId);
      if (!membership || !membership.isActive || membership.role !== 'TEACHER') {
        throw new Error('Forbidden: You do not have permission to delete this class.');
      }
    }

    // Soft delete
    return this.classRepository.update(classId, { isActive: false });
  }

  // ── Enrollments ─────────────────────────────────────────────────────────────

  async getEnrollments(classId, organizationId, activeOnly = true) {
    const cls = await this.classRepository.findById(classId, organizationId);
    if (!cls) {
      throw new Error('Class not found.');
    }
    const enrollments = await this.classRepository.findEnrollmentsByClassId(classId, activeOnly);
    // Filter out class creator or any non-student enrollments
    return enrollments.filter((e) => e.userId !== cls.createdById);
  }

  async enrollStudent({ classId, organizationId, studentUserId, requestingUser }) {
    const requestingUserId = requestingUser.userId || requestingUser.id;
    const cls = await this.classRepository.findById(classId, organizationId);
    if (!cls || !cls.isActive) {
      throw new Error('Class not found or inactive.');
    }

    if (studentUserId === cls.createdById) {
      throw new Error('Class creator/teacher cannot be enrolled as a student.');
    }

    // Permission check for requestingUser: PLATFORM_ADMIN, teacher, or self-enrolling
    const isSelfEnroll = requestingUserId === studentUserId;
    if (!requestingUser.isPlatformAdmin && !isSelfEnroll) {
      const teacherMembership = await this.membershipRepository.findByUserAndOrg(
        requestingUserId,
        organizationId,
      );
      if (
        !teacherMembership ||
        !teacherMembership.isActive ||
        teacherMembership.role !== 'TEACHER'
      ) {
        throw new Error('Forbidden: Only teachers or platform admins can enroll other students.');
      }
    }

    // Target student must be an active member of the organization (auto-create if new)
    let studentMembership = await this.membershipRepository.findByUserAndOrg(
      studentUserId,
      organizationId,
    );
    if (!studentMembership) {
      await this.membershipRepository.create({
        userId: studentUserId,
        organizationId,
        role: 'STUDENT',
        isActive: true,
      });
    } else if (!studentMembership.isActive) {
      throw new Error('Student membership in this organization is inactive.');
    } else if (studentMembership.role === 'TEACHER') {
      throw new Error('Teachers cannot be enrolled as students.');
    }

    // Check existing enrollment
    const existing = await this.classRepository.findEnrollment(classId, studentUserId);
    let enrollment;
    if (existing) {
      if (existing.isActive) {
        throw new Error('Student is already enrolled in this class.');
      }
      enrollment = await this.classRepository.updateEnrollment(existing.id, { isActive: true });
    } else {
      enrollment = await this.classRepository.createEnrollment({
        classId,
        userId: studentUserId,
        isActive: true,
      });
    }

    // Auto-join student to all existing channels in this class
    try {
      const channels = await prisma.channel.findMany({
        where: { classId },
        select: { id: true },
      });
      for (const ch of channels) {
        await prisma.channelMember
          .upsert({
            where: { channelId_userId: { channelId: ch.id, userId: studentUserId } },
            create: { channelId: ch.id, userId: studentUserId },
            update: {},
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('[ClassService] Failed to auto-join student to channels:', err.message);
    }

    return enrollment;
  }

  async removeStudent({ classId, organizationId, studentUserId, requestingUser }) {
    const requestingUserId = requestingUser.userId || requestingUser.id;
    const cls = await this.classRepository.findById(classId, organizationId);
    if (!cls) {
      throw new Error('Class not found.');
    }

    const isSelfLeaving = requestingUserId === studentUserId;
    if (!requestingUser.isPlatformAdmin && !isSelfLeaving) {
      const teacherMembership = await this.membershipRepository.findByUserAndOrg(
        requestingUserId,
        organizationId,
      );
      if (
        !teacherMembership ||
        !teacherMembership.isActive ||
        teacherMembership.role !== 'TEACHER'
      ) {
        throw new Error('Forbidden: You do not have permission to remove this student.');
      }
    }

    const existing = await this.classRepository.findEnrollment(classId, studentUserId);
    if (!existing || !existing.isActive) {
      throw new Error('Enrollment not found.');
    }

    return this.classRepository.updateEnrollment(existing.id, { isActive: false });
  }

  async joinClassByCode({ organizationId, user, code }) {
    const userId = user.userId || user.id;
    if (!code || typeof code !== 'string') {
      throw new Error('Class invite code is required.');
    }

    const cleanCode = code.trim().toUpperCase();
    const cls = await this.classRepository.findByCode(cleanCode, organizationId);
    if (!cls || !cls.isActive) {
      throw new Error(`Class with invite code "${cleanCode}" not found.`);
    }

    if (cls.createdById === userId) {
      throw new Error('You are the teacher/creator of this class and cannot join as a student.');
    }

    await this.enrollStudent({
      classId: cls.id,
      organizationId,
      studentUserId: userId,
      requestingUser: user,
    });

    return cls;
  }
}
