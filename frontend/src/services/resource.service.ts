import api from './api';
import { DocumentResource } from '../types';

export const resourceService = {
  async getDocuments(orgId: string, classId: string): Promise<DocumentResource[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/documents`);
    const d = res.data.documents ?? res.data.data ?? res.data;
    return Array.isArray(d) ? d : [];
  },

  async uploadDocument(
    orgId: string,
    classId: string,
    file: File,
    title: string,
  ): Promise<DocumentResource> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    const res = await api.post(`/organizations/${orgId}/classes/${classId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.document || res.data;
  },

  async deleteDocument(orgId: string, classId: string, docId: string): Promise<void> {
    await api.delete(`/organizations/${orgId}/classes/${classId}/documents/${docId}`);
  },

  async getDocumentChunks(orgId: string, classId: string, docId: string): Promise<any[]> {
    const res = await api.get(
      `/organizations/${orgId}/classes/${classId}/documents/${docId}/chunks`,
    );
    const d = res.data.chunks ?? res.data.data ?? res.data;
    return Array.isArray(d) ? d : [];
  },
};
