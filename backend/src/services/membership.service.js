export class MembershipService {
  constructor(membershipRepository) {
    this.membershipRepository = membershipRepository;
  }

  // 'memberData' is already validated by Zod at the route level
  async addMember(memberData) {
    const existing = await this.membershipRepository.findByUserAndOrg(
      memberData.userId,
      memberData.organizationId,
    );

    if (existing) {
      if (existing.isActive) {
        throw new Error('User is already an active member of this organization.');
      }
      // If inactive, reactivate and update role
      return this.membershipRepository.update(existing.id, {
        isActive: true,
        role: memberData.role,
      });
    }

    return this.membershipRepository.create({
      userId: memberData.userId,
      organizationId: memberData.organizationId,
      role: memberData.role,
      isActive: true,
    });
  }

  async getMembership(userId, organizationId) {
    return this.membershipRepository.findByUserAndOrg(userId, organizationId);
  }

  async getOrganizationMembers(organizationId, activeOnly = true) {
    return this.membershipRepository.findAllByOrgId(organizationId, activeOnly);
  }

  async getUserMemberships(userId, activeOnly = true) {
    return this.membershipRepository.findAllByUserId(userId, activeOnly);
  }

  // 'updates' is already validated + stripped by Zod at the route level
  async updateMembership(userId, organizationId, updates) {
    const existing = await this.membershipRepository.findByUserAndOrg(userId, organizationId);
    if (!existing) {
      throw new Error('Membership not found.');
    }
    return this.membershipRepository.update(existing.id, updates);
  }

  async removeMember(userId, organizationId) {
    const existing = await this.membershipRepository.findByUserAndOrg(userId, organizationId);
    if (!existing) {
      throw new Error('Membership not found.');
    }
    return this.membershipRepository.update(existing.id, { isActive: false });
  }
}

//# sourceMappingURL=membership.service.js.map
