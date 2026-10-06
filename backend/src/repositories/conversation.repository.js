import { prisma } from '../lib/prismaClient.js';

export class ConversationRepository {
  /**
   * Create a new conversation.
   *
   * @param {object} data
   * @param {string} data.userId
   * @param {string} data.classId
   * @param {string} [data.documentId]
   * @param {string} [data.title]
   * @returns {Promise<object>}
   */
  async create({ userId, classId, documentId = null, title = 'Document Discussion' }) {
    return prisma.conversation.create({
      data: {
        userId,
        classId,
        documentId,
        title,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find conversation by ID, verified for user and class.
   *
   * @param {string} id
   * @param {string} userId
   * @param {string} classId
   * @returns {Promise<object|null>}
   */
  async findById(id, userId, classId) {
    return prisma.conversation.findFirst({
      where: {
        id,
        userId,
        classId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * List conversations for a specific user and class.
   *
   * @param {string} userId
   * @param {string} classId
   * @param {object} [options]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @returns {Promise<{ conversations: Array<object>, total: number }>}
   */
  async findByUserAndClass(userId, classId, { page = 1, limit = 20 } = {}) {
    const where = {
      userId,
      classId,
    };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return { conversations, total };
  }

  /**
   * Delete a conversation by ID.
   *
   * @param {string} id
   * @param {string} [_userId]
   * @param {string} [_classId]
   * @returns {Promise<object>}
   */
  async delete(id, _userId, _classId) {
    return prisma.conversation.delete({
      where: {
        id,
      },
    });
  }

  /**
   * Create a message in a conversation.
   *
   * @param {object} data
   * @param {string} data.conversationId
   * @param {'USER'|'ASSISTANT'} data.senderRole
   * @param {string} data.content
   * @param {string} [data.sourcesJson]
   * @returns {Promise<object>}
   */
  async createMessage({ conversationId, senderRole, content, sourcesJson = null }) {
    return prisma.message.create({
      data: {
        conversationId,
        senderRole,
        content,
        sourcesJson,
      },
    });
  }

  /**
   * Fetch recent messages from a conversation for prompt context.
   *
   * @param {string} conversationId
   * @param {number} [limit=10]
   * @returns {Promise<Array<object>>}
   */
  async getRecentMessages(conversationId, limit = 10) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }
}
