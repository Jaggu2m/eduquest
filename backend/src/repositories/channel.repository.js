import { prisma } from '../lib/prismaClient.js';

const SENDER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
};

export class ChannelRepository {
  // ── Channel CRUD ────────────────────────────────────────────────────────────

  /**
   * Create a new channel for a class.
   * @param {object} data
   * @param {string} data.classId
   * @param {string} data.name
   * @param {string} [data.description]
   */
  async create({ classId, name, description = null }) {
    return prisma.channel.create({
      data: { classId, name, description },
    });
  }

  /**
   * Find all channels for a class (that the user is a member of).
   * @param {string} classId
   * @param {string} userId
   */
  async findByClass(classId, userId) {
    return prisma.channel.findMany({
      where: {
        classId,
        members: { some: { userId } },
      },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find a single channel by ID, ensuring the user is a member.
   * @param {string} id
   * @param {string} userId
   */
  async findById(id, userId) {
    return prisma.channel.findFirst({
      where: {
        id,
        members: { some: { userId } },
      },
    });
  }

  /**
   * Find a channel by ID without membership check (for internal use).
   * @param {string} id
   */
  async findByIdRaw(id) {
    return prisma.channel.findUnique({ where: { id } });
  }

  /**
   * Delete a channel.
   * @param {string} id
   */
  async delete(id) {
    return prisma.channel.delete({ where: { id } });
  }

  // ── Membership ──────────────────────────────────────────────────────────────

  /**
   * Add a user to a channel.
   * @param {string} channelId
   * @param {string} userId
   */
  async addMember(channelId, userId) {
    return prisma.channelMember.upsert({
      where: { channelId_userId: { channelId, userId } },
      create: { channelId, userId },
      update: {},
    });
  }

  /**
   * Check if a user is a member of a channel.
   * @param {string} channelId
   * @param {string} userId
   */
  async isMember(channelId, userId) {
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    return !!member;
  }

  /**
   * Get all user IDs who are members of a channel (for notification targeting).
   * @param {string} channelId
   */
  async getMemberIds(channelId) {
    const members = await prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  /**
   * Persist a new message to a channel (source of truth).
   * @param {object} data
   * @param {string} data.channelId
   * @param {string} data.senderId
   * @param {string} data.content
   * @param {string} [data.parentId]  - For threaded replies
   */
  async createMessage({ channelId, senderId, content, parentId = null }) {
    return prisma.channelMessage.create({
      data: { channelId, senderId, content, parentId },
      include: {
        sender: { select: SENDER_SELECT },
        replies: {
          include: { sender: { select: SENDER_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Cursor-based paginated message history for a channel.
   * @param {string} channelId
   * @param {object} [options]
   * @param {string} [options.cursor]   - createdAt timestamp (ISO string) to paginate from
   * @param {number} [options.limit=30]
   */
  async getMessages(channelId, { cursor = null, limit = 30 } = {}) {
    const where = {
      channelId,
      parentId: null, // Top-level messages only; replies are nested
      isDeleted: false,
    };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await prisma.channelMessage.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' }, // Fetch newest first, reverse for display
      include: {
        sender: { select: SENDER_SELECT },
        replies: {
          where: { isDeleted: false },
          include: { sender: { select: SENDER_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
    });

    return messages.reverse(); // Return chronological order
  }

  /**
   * Soft-delete a message.
   * @param {string} messageId
   * @param {string} senderId - Ownership check
   */
  async softDeleteMessage(messageId, senderId) {
    return prisma.channelMessage.updateMany({
      where: { id: messageId, senderId },
      data: { isDeleted: true, content: '[This message was deleted]' },
    });
  }

  /**
   * Edit a message.
   * @param {string} messageId
   * @param {string} senderId - Ownership check
   * @param {string} content
   */
  async editMessage(messageId, senderId, content) {
    return prisma.channelMessage.updateMany({
      where: { id: messageId, senderId, isDeleted: false },
      data: { content, isEdited: true },
    });
  }

  // ── Read Receipts ────────────────────────────────────────────────────────────

  /**
   * Upsert a delivered receipt for a message.
   * @param {string} messageId
   * @param {string} userId
   */
  async markDelivered(messageId, userId) {
    return prisma.messageReceipt.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, deliveredAt: new Date() },
      update: { deliveredAt: new Date() },
    });
  }

  /**
   * Upsert a read receipt for a message.
   * @param {string} messageId
   * @param {string} userId
   */
  async markRead(messageId, userId) {
    return prisma.messageReceipt.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, deliveredAt: new Date(), readAt: new Date() },
      update: { readAt: new Date() },
    });
  }
}
