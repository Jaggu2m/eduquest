export class MembershipController {
  membershipService;
  constructor(membershipService) {
    this.membershipService = membershipService;
  }
  addMember = async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const { userId, role } = req.body;
      if (!userId || !role) {
        res.status(400).json({ message: 'Missing userId or role in request body.' });
        return;
      }
      const membership = await this.membershipService.addMember({
        organizationId: orgId,
        userId,
        role,
      });
      res.status(201).json({ message: 'Member added successfully', membership });
    } catch (error) {
      if (error.message === 'User is already an active member of this organization.') {
        res.status(409).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };
  getOrganizationMembers = async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const activeOnly = req.query.active !== 'false'; // default to true unless explicitly false
      const members = await this.membershipService.getOrganizationMembers(orgId, activeOnly);
      res.json(members);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };
  getMembership = async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userId = req.params.userId;
      const membership = await this.membershipService.getMembership(userId, orgId);
      if (!membership) {
        res.status(404).json({ message: 'Membership not found.' });
        return;
      }
      res.json(membership);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };
  updateMembership = async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userId = req.params.userId;
      const { role, isActive } = req.body;
      const membership = await this.membershipService.updateMembership(userId, orgId, {
        role,
        isActive,
      });
      res.json({ message: 'Membership updated successfully', membership });
    } catch (error) {
      if (error.message === 'Membership not found.') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };
  removeMember = async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const userId = req.params.userId;
      await this.membershipService.removeMember(userId, orgId);
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      if (error.message === 'Membership not found.') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(400).json({ message: error.message });
      }
    }
  };
}
//# sourceMappingURL=membership.controller.js.map
