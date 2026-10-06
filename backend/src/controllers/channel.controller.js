/**
 * ChannelController — Phase 10
 *
 * Exposes ChannelService methods as Express route handlers.
 *
 * Important: After any write operation that should broadcast to connected clients,
 * the controller emits a Socket.IO event using req.io (injected by middleware).
 *
 * Flow for a new message:
 *   Client → POST /messages → Controller → ChannelService (persists to DB)
 *                                        → req.io.to(channelId).emit('message:new', ...)
 *                                        → BullMQ (notification job enqueued by service)
 */
export class ChannelController {
  /** @param {{ channelService: import('../services/channel.service.js').ChannelService }} deps */
  constructor({ channelService }) {
    this.channelService = channelService;

    // Bind handlers for use as Express route callbacks
    this.createChannel = this.createChannel.bind(this);
    this.listChannels = this.listChannels.bind(this);
    this.deleteChannel = this.deleteChannel.bind(this);
    this.addMember = this.addMember.bind(this);
    this.postMessage = this.postMessage.bind(this);
    this.getMessageHistory = this.getMessageHistory.bind(this);
    this.deleteMessage = this.deleteMessage.bind(this);
    this.editMessage = this.editMessage.bind(this);
    this.markRead = this.markRead.bind(this);
  }

  // ── POST /channels ──────────────────────────────────────────────────────────
  async createChannel(req, res, next) {
    try {
      const { classId } = req.params;
      const userId = req.user.userId;
      const { name, description } = req.body;

      const channel = await this.channelService.createChannel({ classId, userId, name, description });

      // Notify connected class members about the new channel
      if (req.io) {
        req.io.to(`class:${classId}`).emit('channel:new', channel);
      }

      return res.status(201).json({ success: true, data: channel });
    } catch (err) {
      next(err);
    }
  }

  // ── GET /channels ───────────────────────────────────────────────────────────
  async listChannels(req, res, next) {
    try {
      const { classId } = req.params;
      const userId = req.user.userId;
      const channels = await this.channelService.listChannels(classId, userId);
      return res.json({ success: true, data: channels });
    } catch (err) {
      next(err);
    }
  }

  // ── DELETE /channels/:channelId ─────────────────────────────────────────────
  async deleteChannel(req, res, next) {
    try {
      const { classId, channelId } = req.params;
      const userId = req.user.userId;
      await this.channelService.deleteChannel(channelId, userId);

      if (req.io) {
        req.io.to(`class:${classId}`).emit('channel:deleted', { channelId });
      }

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // ── POST /channels/:channelId/members ───────────────────────────────────────
  async addMember(req, res, next) {
    try {
      const { channelId } = req.params;
      const requestingUserId = req.user.userId;
      const { userId: targetUserId } = req.body;

      const member = await this.channelService.addMember(channelId, requestingUserId, targetUserId);
      return res.status(201).json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  }

  // ── POST /channels/:channelId/messages ──────────────────────────────────────
  async postMessage(req, res, next) {
    try {
      const { channelId } = req.params;
      const senderId = req.user.userId;
      const { content, parentId } = req.body;

      // 1. Persist to PostgreSQL via service
      const message = await this.channelService.postMessage({ channelId, senderId, content, parentId });

      // 2. Broadcast via Socket.IO to all connected members in this channel
      //    The message is already enriched with sender info from the repository
      if (req.io) {
        const event = parentId ? 'reply:new' : 'message:new';
        req.io.to(`channel:${channelId}`).emit(event, message);
      }

      return res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  }

  // ── GET /channels/:channelId/messages ───────────────────────────────────────
  async getMessageHistory(req, res, next) {
    try {
      const { channelId } = req.params;
      const userId = req.user.userId;
      const { cursor, limit } = req.query;

      const messages = await this.channelService.getMessageHistory({
        channelId,
        userId,
        cursor: cursor || null,
        limit: limit ? Math.min(50, parseInt(limit, 10)) : 30,
      });

      return res.json({
        success: true,
        data: messages,
        // Provide the next cursor for the frontend to paginate backwards
        nextCursor: messages.length > 0 ? messages[0].createdAt.toISOString() : null,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── DELETE /channels/:channelId/messages/:messageId ─────────────────────────
  async deleteMessage(req, res, next) {
    try {
      const { channelId, messageId } = req.params;
      const userId = req.user.userId;

      const result = await this.channelService.deleteMessage(messageId, userId);

      // Broadcast soft-delete to all members
      if (req.io) {
        req.io.to(`channel:${channelId}`).emit('message:deleted', { messageId });
      }

      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ── PATCH /channels/:channelId/messages/:messageId ──────────────────────────
  async editMessage(req, res, next) {
    try {
      const { channelId, messageId } = req.params;
      const userId = req.user.userId;
      const { content } = req.body;

      const result = await this.channelService.editMessage(messageId, userId, content);

      // Broadcast edit to all members
      if (req.io) {
        req.io.to(`channel:${channelId}`).emit('message:updated', result);
      }

      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // ── POST /channels/:channelId/messages/:messageId/read ──────────────────────
  async markRead(req, res, next) {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId;
      await this.channelService.markRead(messageId, userId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
