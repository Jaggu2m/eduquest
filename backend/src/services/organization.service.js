// ── Implementation ────────────────────────────────────────────────────────────
export class OrganizationService {
  constructor(organizationRepository) {
    this.organizationRepository = organizationRepository;
  }

  async getAllOrganizations(activeOnly = true) {
    return this.organizationRepository.findAll(activeOnly);
  }

  async getOrganizationById(id) {
    return this.organizationRepository.findById(id);
  }

  async getOrganizationBySlug(slug) {
    return this.organizationRepository.findBySlug(slug);
  }

  // 'fields' is already validated + stripped by Zod at the route level
  async createOrganization(fields) {
    const existing = await this.organizationRepository.findBySlug(fields.slug);
    if (existing) {
      throw new Error(`An organization with slug "${fields.slug}" already exists.`);
    }
    return this.organizationRepository.create(fields);
  }

  // 'updates' is already validated + stripped by Zod at the route level
  async updateOrganization(id, updates) {
    const existing = await this.organizationRepository.findById(id);
    if (!existing) throw new Error('Organization not found.');
    return this.organizationRepository.update(id, updates);
  }

  async deleteOrganization(id) {
    const existing = await this.organizationRepository.findById(id);
    if (!existing) throw new Error('Organization not found.');
    return this.organizationRepository.softDelete(id);
  }
}

//# sourceMappingURL=organization.service.js.map
