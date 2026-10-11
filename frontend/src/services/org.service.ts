import api from './api';
import { Organization } from '../types';

export const orgService = {
  async getOrganizations(): Promise<Organization[]> {
    const res = await api.get('/organizations');
    return res.data.organizations || res.data || [];
  },

  async getOrganizationById(id: string): Promise<Organization> {
    const res = await api.get(`/organizations/${id}`);
    return res.data.organization || res.data;
  },

  async createOrganization(payload: {
    name: string;
    slug: string;
    description?: string;
  }): Promise<Organization> {
    const res = await api.post('/organizations', payload);
    return res.data.organization || res.data;
  },

  async getMembers(orgId: string): Promise<any[]> {
    const res = await api.get(`/organizations/${orgId}/members`);
    return res.data.members || res.data || [];
  },
};
