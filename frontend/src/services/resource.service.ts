import api from './api';
import { DocumentResource } from '../types';

export const resourceService = {
  async getDocuments(orgId: string, classId: string): Promise<DocumentResource[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/documents`);
    return res.data.documents || res.data || [];
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
    return res.data.chunks || res.data || [];
  },
};
