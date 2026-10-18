import api from './api';
import { DiscussionChannel, DiscussionMessage } from '../types';

export const discussionService = {
  async listChannels(orgId: string, classId: string): Promise<DiscussionChannel[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/channels`);
    const d = res.data.channels ?? res.data.data ?? res.data;
    return Array.isArray(d) ? d : [];
  },

  async createChannel(
    orgId: string,
    classId: string,
    payload: { name: string; description?: string },
  ): Promise<DiscussionChannel> {
    const res = await api.post(`/organizations/${orgId}/classes/${classId}/channels`, payload);
    return res.data.data || res.data.channel || res.data;
  },

  async getMessageHistory(
    orgId: string,
    classId: string,
    channelId: string,
    params?: { cursor?: string; limit?: number },
  ): Promise<{ messages: DiscussionMessage[]; nextCursor?: string }> {
    const res = await api.get(
      `/organizations/${orgId}/classes/${classId}/channels/${channelId}/messages`,
      {
        params,
      },
    );
    const raw = res.data;
    return {
      messages: raw.data || raw.messages || [],
      nextCursor: raw.nextCursor,
    };
  },

  async postMessage(
    orgId: string,
    classId: string,
    channelId: string,
    payload: { content: string; parentId?: string },
  ): Promise<DiscussionMessage> {
    const res = await api.post(
      `/organizations/${orgId}/classes/${classId}/channels/${channelId}/messages`,
      payload,
    );
    return res.data.data || res.data.message || res.data;
  },
};
