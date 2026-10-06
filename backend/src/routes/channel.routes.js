import { Router } from 'express';
import { ChannelController } from '../controllers/channel.controller.js';
import { ChannelService } from '../services/channel.service.js';
import { ChannelRepository } from '../repositories/channel.repository.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { NotificationQueue } from '../queues/notification.queue.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  CreateChannelSchema,
  PostMessageSchema,
  EditMessageSchema,
  AddChannelMemberSchema,
} from '../schemas/index.js';

// ── Composition root ──────────────────────────────────────────────────────────
const channelRepository = new ChannelRepository();
const classRepository = new ClassRepository();
const notificationQueue = new NotificationQueue();

const channelService = new ChannelService({
  channelRepository,
  classRepository,
  notificationQueue,
});

const channelController = new ChannelController({ channelService });

// mergeParams: true gives access to :orgId and :classId from the parent router
const router = Router({ mergeParams: true });

router.use(requireAuth);

// ── Channel management ─────────────────────────────────────────────────────────

// POST   /api/organizations/:orgId/classes/:classId/channels
router.post('/', validate(CreateChannelSchema), channelController.createChannel);

// GET    /api/organizations/:orgId/classes/:classId/channels
router.get('/', channelController.listChannels);

// DELETE /api/organizations/:orgId/classes/:classId/channels/:channelId
router.delete('/:channelId', channelController.deleteChannel);

// POST   /api/organizations/:orgId/classes/:classId/channels/:channelId/members
router.post('/:channelId/members', validate(AddChannelMemberSchema), channelController.addMember);

// ── Messaging ─────────────────────────────────────────────────────────────────

// POST   /api/organizations/:orgId/classes/:classId/channels/:channelId/messages
router.post('/:channelId/messages', validate(PostMessageSchema), channelController.postMessage);

// GET    /api/organizations/:orgId/classes/:classId/channels/:channelId/messages
//        Query params: ?cursor=<ISO timestamp>&limit=<number>
router.get('/:channelId/messages', channelController.getMessageHistory);

// DELETE /api/organizations/:orgId/classes/:classId/channels/:channelId/messages/:messageId
router.delete('/:channelId/messages/:messageId', channelController.deleteMessage);

// PATCH  /api/organizations/:orgId/classes/:classId/channels/:channelId/messages/:messageId
router.patch(
  '/:channelId/messages/:messageId',
  validate(EditMessageSchema),
  channelController.editMessage,
);

// ── Read receipts ─────────────────────────────────────────────────────────────

// POST   /api/organizations/:orgId/classes/:classId/channels/:channelId/messages/:messageId/read
router.post('/:channelId/messages/:messageId/read', channelController.markRead);

export default router;
