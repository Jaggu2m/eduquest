/**
 * ChannelService — Phase 10
 *
 * Business logic for the Enterprise Discussion Platform.
 *
 * Design principles:
 *  - REST API handles all durable resource mutations (create, delete, history).
 *  - This service is called by the REST controller.
 *  - After persisting, it returns the result to the controller which then
 *    broadcasts via Socket.IO (separation of concerns — service knows nothing
 *    about WebSockets).
 *  - Heavy post-processing (notifications, analytics) are offloaded to BullMQ.
 */
export class ChannelService {
  /**
   * @param {object} deps
   * @param {import('../repositories/channel.repository.js').ChannelRepository} deps.channelRepository
   * @param {import('../repositories/class.repository.js').ClassRepository} deps.classRepository
   * @param {import('../queues/notification.queue.js').NotificationQueue} deps.notificationQueue
   */
  constructor({ channelRepository, classRepository, notificationQueue }) {
    this.channelRepo = channelRepository;
    this.classRepo = classRepository;
    this.notificationQueue = notificationQueue;
  }

  // ── Channel Management ──────────────────────────────────────────────────────

  /**
   * Create a new channel for a class. Only teachers can create channels.
   *
   * @param {object} params
   * @param {string} params.classId
   * @param {string} params.userId     - Must be teacher/creator of the class
   * @param {string} params.name
   * @param {string} [params.description]
   */
  async createChannel({ classId, userId, name, description }) {
    // Authorization: only teacher (class creator) can create channels
    const cls = await this.classRepo.findById(classId);
    if (!cls) throw Object.assign(new Error('Class not found.'), { statusCode: 404 });

    if (cls.createdById !== userId) {
      throw Object.assign(
        new Error('Only the class teacher can create channels.'),
        { statusCode: 403 },
      );
    }

    const channel = await this.channelRepo.create({ classId, name, description });

    // Auto-add the teacher as the first member
    await this.channelRepo.addMember(channel.id, userId);

    return channel;
  }

  /**
   * List all channels a user is a member of within a class.
   *
   * @param {string} classId
   * @param {string} userId
   */
  async listChannels(classId, userId) {
    return this.channelRepo.findByClass(classId, userId);
  }

  /**
   * Add a user to a channel (e.g., when a teacher adds a student).
   *
   * @param {string} channelId
   * @param {string} requestingUserId - Must be teacher
   * @param {string} targetUserId     - User to add
   */
  async addMember(channelId, requestingUserId, targetUserId) {
    const channel = await this.channelRepo.findByIdRaw(channelId);
    if (!channel) throw Object.assign(new Error('Channel not found.'), { statusCode: 404 });

    const cls = await this.classRepo.findById(channel.classId);
    if (cls.createdById !== requestingUserId) {
      throw Object.assign(
        new Error('Only the class teacher can add members.'),
        { statusCode: 403 },
      );
    }

    return this.channelRepo.addMember(channelId, targetUserId);
  }

  /**
   * Delete a channel. Only the teacher can delete channels.
   *
   * @param {string} channelId
   * @param {string} userId
   */
  async deleteChannel(channelId, userId) {
    const channel = await this.channelRepo.findByIdRaw(channelId);
    if (!channel) throw Object.assign(new Error('Channel not found.'), { statusCode: 404 });

    const cls = await this.classRepo.findById(channel.classId);
    if (cls.createdById !== userId) {
      throw Object.assign(new Error('Only the class teacher can delete channels.'), { statusCode: 403 });
    }

    return this.channelRepo.delete(channelId);
  }

  // ── Messaging ───────────────────────────────────────────────────────────────

  /**
   * Post a message to a channel (primary REST action).
   * Persists to PostgreSQL first, then returns the enriched message
   * for the controller to broadcast via Socket.IO.
   * Enqueues background jobs for notifications.
   *
   * @param {object} params
   * @param {string} params.channelId
   * @param {string} params.senderId
   * @param {string} params.content
   * @param {string} [params.parentId]  - For threaded replies
   */
  async postMessage({ channelId, senderId, content, parentId = null }) {
    // 1. Authorization: sender must be a channel member
    const isMember = await this.channelRepo.isMember(channelId, senderId);
    if (!isMember) {
      throw Object.assign(
        new Error('You are not a member of this channel.'),
        { statusCode: 403 },
      );
    }

    // 2. Persist to PostgreSQL — source of truth
    const message = await this.channelRepo.createMessage({
      channelId,
      senderId,
      content,
      parentId,
    });

    // 3. Enqueue async background jobs (fire-and-forget, does not block response)
    try {
      const memberIds = await this.channelRepo.getMemberIds(channelId);
      const recipientIds = memberIds.filter((id) => id !== senderId);

      if (recipientIds.length > 0) {
        await this.notificationQueue.addMessageNotification({
          messageId: message.id,
          channelId,
          senderId,
          recipientIds,
          contentPreview: content.slice(0, 100),
        });
      }
    } catch (queueErr) {
      // Queue failure must NOT fail the primary request
      console.error('[ChannelService] Failed to enqueue notification job:', queueErr.message);
    }

    return message;
  }

  /**
   * Get paginated message history for a channel (cursor-based).
   *
   * @param {object} params
   * @param {string} params.channelId
   * @param {string} params.userId
   * @param {string} [params.cursor]   - ISO timestamp to paginate backwards from
   * @param {number} [params.limit=30]
   */
  async getMessageHistory({ channelId, userId, cursor = null, limit = 30 }) {
    // Authorization: must be a channel member to read history
    const isMember = await this.channelRepo.isMember(channelId, userId);
    if (!isMember) {
      throw Object.assign(
        new Error('You are not a member of this channel.'),
        { statusCode: 403 },
      );
    }

    return this.channelRepo.getMessages(channelId, { cursor, limit });
  }

  /**
   * Soft-delete a message (sender only).
   *
   * @param {string} messageId
   * @param {string} userId
   */
  async deleteMessage(messageId, userId) {
    const result = await this.channelRepo.softDeleteMessage(messageId, userId);
    if (result.count === 0) {
      throw Object.assign(
        new Error('Message not found or you do not have permission to delete it.'),
        { statusCode: 403 },
      );
    }
    return { messageId, deleted: true };
  }

  /**
   * Edit a message (sender only).
   *
   * @param {string} messageId
   * @param {string} userId
   * @param {string} content
   */
  async editMessage(messageId, userId, content) {
    const result = await this.channelRepo.editMessage(messageId, userId, content);
    if (result.count === 0) {
      throw Object.assign(
        new Error('Message not found or you do not have permission to edit it.'),
        { statusCode: 403 },
      );
    }
    return { messageId, content, edited: true };
  }

  // ── Read Receipts ────────────────────────────────────────────────────────────

  /**
   * Mark a message as delivered (typically called by Socket.IO on connect).
   * @param {string} messageId
   * @param {string} userId
   */
  async markDelivered(messageId, userId) {
    return this.channelRepo.markDelivered(messageId, userId);
  }

  /**
   * Mark a message as read (called when user views/opens the channel).
   * @param {string} messageId
   * @param {string} userId
   */
  async markRead(messageId, userId) {
    return this.channelRepo.markRead(messageId, userId);
  }
}
