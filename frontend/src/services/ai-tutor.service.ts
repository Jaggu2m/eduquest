import api from './api';
import { Conversation, ConversationMessage } from '../types';

export const aiTutorService = {
  async listConversations(orgId: string, classId: string): Promise<Conversation[]> {
    const res = await api.get(`/organizations/${orgId}/classes/${classId}/conversations`);
    return res.data.data || res.data.conversations || [];
  },

  async getConversation(
    orgId: string,
    classId: string,
    conversationId: string,
  ): Promise<{
    conversation: Conversation;
    messages: ConversationMessage[];
  }> {
    const res = await api.get(
      `/organizations/${orgId}/classes/${classId}/conversations/${conversationId}`,
    );
    const raw = res.data.data || res.data;
    const messages = (raw.messages || []).map(
      (m: Record<string, unknown>) =>
        ({
          id: m.id,
          sender: m.senderRole || m.sender,
          content: m.content,
          createdAt: m.createdAt,
          citations: m.sources || m.citations || undefined,
        }) as ConversationMessage,
    );
    return { conversation: raw, messages };
  },

  async createConversation(
    orgId: string,
    classId: string,
    payload: { title?: string; documentId?: string },
  ): Promise<Conversation> {
    const res = await api.post(`/organizations/${orgId}/classes/${classId}/conversations`, payload);
    return res.data.data?.conversation || res.data.conversation || res.data.data || res.data;
  },

  async sendMessage(
    orgId: string,
    classId: string,
    conversationId: string,
    content: string,
  ): Promise<{ userMessage: ConversationMessage; assistantMessage: ConversationMessage }> {
    const res = await api.post(
      `/organizations/${orgId}/classes/${classId}/conversations/${conversationId}/messages`,
      { content },
    );
    const raw = res.data.data || res.data;
    const normalize = (m: Record<string, unknown>): ConversationMessage =>
      ({
        id: m.id,
        sender: m.senderRole || m.sender,
        content: m.content,
        createdAt: m.createdAt,
        citations: m.sources || m.citations || undefined,
      }) as ConversationMessage;
    return {
      userMessage: normalize(raw.userMessage),
      assistantMessage: normalize(raw.assistantMessage),
    };
  },

  async deleteConversation(orgId: string, classId: string, conversationId: string): Promise<void> {
    await api.delete(`/organizations/${orgId}/classes/${classId}/conversations/${conversationId}`);
  },
};
