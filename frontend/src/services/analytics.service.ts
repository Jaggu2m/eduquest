import api from './api';
import { TopicMastery, QuestionDifficulty, RemedialRecommendation } from '../types';

export interface StudentTopicMastery {
  topic: string;
  topicName: string;
  totalAnswered: number;
  correctCount: number;
  accuracyPercent: number;
  mastery: number;
}

export interface StudentAttemptRecord {
  attemptId: string;
  assessmentTitle: string;
  totalMarks?: number;
  scoreAchieved?: number;
  scorePercent: number;
  timeSpentSecs?: number;
  submittedAt?: string;
  isPassed: boolean;
}

export interface StudentAnalytics {
  totalAttempts: number;
  averageScorePercent: number;
  bestScorePercent: number;
  totalTimeSpentSecs: number;
  strengths: StudentTopicMastery[];
  weaknesses: StudentTopicMastery[];
  topicMastery: StudentTopicMastery[];
  attemptHistory: StudentAttemptRecord[];
  recommendations: RemedialRecommendation[];
}

export const analyticsService = {
  async getClassOverview(orgId: string, classId: string): Promise<any> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/analytics/overview`);
    return res.data;
  },

  async getClassInsights(
    orgId: string,
    classId: string,
  ): Promise<{
    insights: RemedialRecommendation[] | string;
    classAverage?: number;
    passRate?: number;
    completionRate?: number;
    generatedAt?: string;
  }> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/analytics/insights`);
    return res.data;
  },

  async getClassTopics(orgId: string, classId: string): Promise<TopicMastery[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/analytics/topics`);
    const d = res.data.topics ?? res.data.data ?? res.data;
    return Array.isArray(d) ? d : [];
  },

  async getClassQuestions(orgId: string, classId: string): Promise<QuestionDifficulty[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/analytics/questions`);
    const d = res.data.questions ?? res.data.data ?? res.data;
    return Array.isArray(d) ? d : [];
  },

  async getStudentAnalytics(
    orgId: string,
    classId: string,
    studentId: string = 'me',
  ): Promise<StudentAnalytics> {
    const res = await api.get(
      `/organizations/${orgId}/classes/${classId}/analytics/students/${studentId}`,
    );
    const raw = res.data?.data ?? res.data ?? {};
    // Guarantee all nested array fields are arrays regardless of API shape
    return {
      ...raw,
      strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
      weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses : [],
      topicMastery: Array.isArray(raw.topicMastery) ? raw.topicMastery : [],
      attemptHistory: Array.isArray(raw.attemptHistory) ? raw.attemptHistory : [],
      recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
    };
  },
};
