export class ClassService {
  constructor(classRepository, membershipRepository, organizationRepository) {
    this.classRepository = classRepository;
    this.membershipRepository = membershipRepository;
    this.organizationRepository = organizationRepository;
  }

  async getClasses(organizationId, activeOnly = true) {
    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new Error('Organization not found.');
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

    return this.classRepository.create({
      organizationId,
      createdById: userId,
      name: classData.name,
      code: classData.code || null,
      description: classData.description || null,
      isActive: true,
    });
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
    return this.classRepository.findEnrollmentsByClassId(classId, activeOnly);
  }

  async enrollStudent({ classId, organizationId, studentUserId, requestingUser }) {
    const requestingUserId = requestingUser.userId || requestingUser.id;
    const cls = await this.classRepository.findById(classId, organizationId);
    if (!cls || !cls.isActive) {
      throw new Error('Class not found or inactive.');
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

    // Target student must be an active member of the organization
    const studentMembership = await this.membershipRepository.findByUserAndOrg(
      studentUserId,
      organizationId,
    );
    if (!studentMembership || !studentMembership.isActive) {
      throw new Error(
        'Student must be an active member of the organization to enroll in this class.',
      );
    }

    // Check existing enrollment
    const existing = await this.classRepository.findEnrollment(classId, studentUserId);
    if (existing) {
      if (existing.isActive) {
        throw new Error('Student is already enrolled in this class.');
      }
      return this.classRepository.updateEnrollment(existing.id, { isActive: true });
    }

    return this.classRepository.createEnrollment({
      classId,
      userId: studentUserId,
      isActive: true,
    });
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
}
