import api from './api';
import { ClassRoom, Enrollment } from '../types';

export const classService = {
  async getClasses(orgId: string): Promise<ClassRoom[]> {
    const res = await api.get(`/organizations/${orgId}/classes`);
    return res.data.classes || res.data || [];
  },

  async getClassById(orgId: string, classId: string): Promise<ClassRoom> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}`);
    return res.data.class || res.data;
  },

  async createClass(
    orgId: string,
    payload: { name: string; code?: string; description?: string },
  ): Promise<ClassRoom> {
    const res = await api.post(`/organizations/${orgId}/classes`, payload);
    return res.data.class || res.data;
  },

  async getEnrollments(orgId: string, classId: string): Promise<Enrollment[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/enrollments`);
    return res.data.enrollments || res.data || [];
  },

  async enrollStudent(orgId: string, classId: string, userId: string): Promise<Enrollment> {
    const res = await api.post(`/organizations/${orgId}/classes/${classId}/enrollments`, {
      userId,
    });
    return res.data.enrollment || res.data;
  },

  async joinClassByCode(orgId: string, code: string): Promise<ClassRoom> {
    const res = await api.post(`/organizations/${orgId}/classes/join`, {
      code: code.trim(),
    });
    return res.data.class || res.data;
  },

  async leaveClass(orgId: string, classId: string): Promise<void> {
    await api.post(`/organizations/${orgId}/classes/${classId}/leave`);
  },

  async removeStudent(orgId: string, classId: string, userId: string): Promise<void> {
    await api.delete(`/organizations/${orgId}/classes/${classId}/enrollments/${userId}`);
  },
};
