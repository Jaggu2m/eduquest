export class OrgInvitationController {
  constructor(orgInvitationService) {
    this.orgInvitationService = orgInvitationService;
  }

  // POST /organizations/:orgId/invitations
  createInvitation = async (req, res, next) => {
    try {
      const orgId = req.params.orgId;
      const { email, role } = req.body;

      if (!email || !role) {
        res.status(400).json({ message: 'Missing email or role in request body.' });
        return;
      }

      const invitation = await this.orgInvitationService.createInvitation({
        organizationId: orgId,
        email,
        role,
        invitedById: req.user.userId, // from JWT via requireAuth
      });

      res.status(201).json({ message: 'Invitation created successfully.', invitation });
    } catch (error) {
      if (error.message?.includes('already exists')) {
        res.status(409).json({ message: error.message });
      } else {
        next(error);
      }
    }
  };

  // GET /organizations/:orgId/invitations
  getInvitations = async (req, res, next) => {
    try {
      const orgId = req.params.orgId;
      // Optional ?status=PENDING|ACCEPTED|DECLINED|EXPIRED query param
      const status = req.query.status;

      const invitations = await this.orgInvitationService.getInvitations(orgId, status);
      res.json(invitations);
    } catch (error) {
      next(error);
    }
  };

  // POST /invitations/accept  — public route, uses token from body
  acceptInvitation = async (req, res, next) => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ message: 'Missing invitation token.' });
        return;
      }

      const invitation = await this.orgInvitationService.acceptInvitation(token);
      res.json({
        message: 'Invitation accepted. You are now a member of the organization.',
        invitation,
      });
    } catch (error) {
      const msg = error.message ?? '';
      if (msg.includes('not found') || msg.includes('No account')) {
        res.status(404).json({ message: msg });
      } else if (msg.includes('expired') || msg.includes('already')) {
        res.status(410).json({ message: msg });
      } else {
        next(error);
      }
    }
  };

  // DELETE /organizations/:orgId/invitations/:invitationId
  cancelInvitation = async (req, res, next) => {
    try {
      const invitationId = req.params.invitationId;
      await this.orgInvitationService.cancelInvitation(invitationId);
      res.json({ message: 'Invitation cancelled successfully.' });
    } catch (error) {
      const msg = error.message ?? '';
      if (msg.includes('not found')) {
        res.status(404).json({ message: msg });
      } else if (msg.includes('Only pending')) {
        res.status(409).json({ message: msg });
      } else {
        next(error);
      }
    }
  };
}
