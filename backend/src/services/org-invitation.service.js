import { MembershipRepository } from '../repositories/membership.repository.js';
import { MembershipService } from './membership.service.js';

// How many days an invitation stays valid before it expires
const INVITE_EXPIRY_DAYS = 7;

export class OrgInvitationService {
  /**
   * @param {import('../repositories/org-invitation.repository.js').OrgInvitationRepository} orgInvitationRepository
   * @param {import('../repositories/user.repository.js').UserRepository} userRepository
   */
  constructor(orgInvitationRepository, userRepository) {
    this.orgInvitationRepository = orgInvitationRepository;
    this.userRepository = userRepository;
    // Membership service is needed to create membership on acceptance
    this.membershipService = new MembershipService(new MembershipRepository());
  }

  /**
   * Create a new invitation for an email address to join an org with a given role.
   * Prevents duplicate pending invitations for the same email+org combo.
   */
  async createInvitation({ organizationId, email, role, invitedById }) {
    // Check if there's already a pending invite for this email in this org
    const existing = await this.orgInvitationRepository.findAllByOrgId(organizationId, 'PENDING');
    const duplicate = existing.find((inv) => inv.email === email);
    if (duplicate) {
      throw new Error(`A pending invitation already exists for ${email} in this organization.`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    return this.orgInvitationRepository.create({
      email,
      role,
      organizationId,
      invitedById,
      expiresAt,
    });
  }

  /**
   * Accept an invitation by its token.
   * - Validates the token exists, is PENDING, and hasn't expired
   * - Creates a Membership record for the invited user
   * - Marks the invitation as ACCEPTED
   */
  async acceptInvitation(token) {
    const invitation = await this.orgInvitationRepository.findByToken(token);

    if (!invitation) {
      throw new Error('Invitation not found.');
    }

    if (invitation.status !== 'PENDING') {
      throw new Error(`Invitation is already ${invitation.status.toLowerCase()}.`);
    }

    if (new Date() > invitation.expiresAt) {
      // Auto-expire it in DB too
      await this.orgInvitationRepository.update(invitation.id, { status: 'EXPIRED' });
      throw new Error('Invitation has expired.');
    }

    // Find the user by email — they must already have an account to accept
    const user = await this.userRepository.findByEmail(invitation.email);
    if (!user) {
      throw new Error('No account found for this invitation email. Please register first.');
    }

    // Create the membership
    await this.membershipService.addMember({
      userId: user.id,
      organizationId: invitation.organizationId,
      role: invitation.role,
    });

    // Mark invite as accepted
    return this.orgInvitationRepository.update(invitation.id, { status: 'ACCEPTED' });
  }

  /**
   * List all invitations for an organization, optionally filtered by status.
   */
  async getInvitations(organizationId, status) {
    return this.orgInvitationRepository.findAllByOrgId(organizationId, status);
  }

  /**
   * Cancel (expire) a pending invitation.
   */
  async cancelInvitation(id) {
    const invitation = await this.orgInvitationRepository.findById(id);
    if (!invitation) {
      throw new Error('Invitation not found.');
    }
    if (invitation.status !== 'PENDING') {
      throw new Error('Only pending invitations can be cancelled.');
    }
    return this.orgInvitationRepository.update(id, { status: 'EXPIRED' });
  }
}
