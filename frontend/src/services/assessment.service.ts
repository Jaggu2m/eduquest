import api from './api';
import { Assessment, QuizAttempt } from '../types';

export interface GenerateQuizPayload {
  documentId?: string;
  content?: string;
  title?: string;
  description?: string;
  numQuestions?: number;
  questionTypes?: Array<'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'>;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitMins?: number;
  passingScore?: number;
  customPrompt?: string;
}

export const assessmentService = {
  async getAssessments(orgId: string, classId: string): Promise<Assessment[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/assessments`);
    return res.data.assessments || res.data || [];
  },

  async getAssessmentById(
    orgId: string,
    classId: string,
    assessmentId: string,
  ): Promise<Assessment> {
    const res = await api.get(
      `/organizations/${orgId}/classes/${classId}/assessments/${assessmentId}`,
    );
    return res.data.assessment || res.data;
  },

  async generateAiQuiz(
    orgId: string,
    classId: string,
    payload: GenerateQuizPayload,
  ): Promise<Assessment> {
    const res = await api.post(
      `/organizations/${orgId}/classes/${classId}/assessments/generate`,
      payload,
    );
    return res.data.assessment || res.data;
  },

  async createAssessment(orgId: string, classId: string, payload: any): Promise<Assessment> {
    const res = await api.post(`/organizations/${orgId}/classes/${classId}/assessments`, payload);
    return res.data.assessment || res.data;
  },

  async updateAssessment(
    orgId: string,
    classId: string,
    assessmentId: string,
    payload: {
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      title?: string;
      description?: string;
      type?: 'PRACTICE' | 'EXAM' | 'AI_GENERATED' | 'TEACHER_CREATED';
      timeLimitMins?: number;
      startDate?: string | null;
      dueDate?: string | null;
    },
  ): Promise<Assessment> {
    const res = await api.patch(
      `/organizations/${orgId}/classes/${classId}/assessments/${assessmentId}`,
      payload,
    );
    return res.data.assessment || res.data;
  },

  async getAssignments(orgId: string, classId: string): Promise<any[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/assignments`);
    return res.data.assignments || res.data || [];
  },

  async createAssignment(
    orgId: string,
    classId: string,
    payload: { assessmentId: string },
  ): Promise<any> {
    const res = await api.post(`/organizations/${orgId}/classes/${classId}/assignments`, payload);
    return res.data.assignment || res.data;
  },

  async startAttempt(orgId: string, classId: string, assignmentId: string): Promise<any> {
    const res = await api.post(
      `/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts`,
    );
    return res.data.attempt || res.data;
  },

  async submitAttempt(
    orgId: string,
    classId: string,
    assignmentId: string,
    attemptId: string,
    responses: Array<{
      questionId: string;
      selectedOptionId?: string;
      textResponse?: string;
      timeSpentSecs?: number;
    }>,
  ): Promise<QuizAttempt> {
    const res = await api.post(
      `/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts/${attemptId}/submit`,
      { responses },
    );
    return res.data.attempt || res.data;
  },

  async getAttemptResult(
    orgId: string,
    classId: string,
    assignmentId: string,
    attemptId: string,
  ): Promise<QuizAttempt> {
    const res = await api.get(
      `/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts/${attemptId}`,
    );
    return res.data.attempt || res.data;
  },
};
