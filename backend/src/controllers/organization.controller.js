export class OrganizationController {
  constructor(organizationService) {
    this.organizationService = organizationService;
  }

  // GET /api/organizations?all=true
  getAllOrganizations = async (req, res, next) => {
    try {
      const activeOnly = req.query.all !== 'true';
      const orgs = await this.organizationService.getAllOrganizations(activeOnly);
      res.json(orgs);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/organizations/:id
  getOrganizationById = async (req, res, next) => {
    try {
      const org = await this.organizationService.getOrganizationById(req.params.id);
      if (!org) {
        res.status(404).json({ message: 'Organization not found.' });
        return;
      }
      res.json(org);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/organizations/slug/:slug
  getOrganizationBySlug = async (req, res, next) => {
    try {
      const org = await this.organizationService.getOrganizationBySlug(req.params.slug);
      if (!org) {
        res.status(404).json({ message: 'Organization not found.' });
        return;
      }
      res.json(org);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/organizations — req.body already validated by Zod (CreateOrganizationSchema)
  createOrganization = async (req, res, next) => {
    try {
      const org = await this.organizationService.createOrganization(req.body);
      res.status(201).json(org);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already exists')) {
        res.status(409).json({ message });
        return;
      }
      next(error);
    }
  };

  // PATCH /api/organizations/:id — req.body already validated by Zod (UpdateOrganizationSchema)
  updateOrganization = async (req, res, next) => {
    try {
      const org = await this.organizationService.updateOrganization(req.params.id, req.body);
      res.json(org);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        res.status(404).json({ message });
        return;
      }
      next(error);
    }
  };

  // DELETE /api/organizations/:id  (soft-delete)
  deleteOrganization = async (req, res, next) => {
    try {
      await this.organizationService.deleteOrganization(req.params.id);
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        res.status(404).json({ message });
        return;
      }
      next(error);
    }
  };
}

//# sourceMappingURL=organization.controller.js.map
