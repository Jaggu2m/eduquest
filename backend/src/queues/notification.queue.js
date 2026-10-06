import { Queue } from 'bullmq';
import { redisConnection } from '../lib/redis.js';

export const NOTIFICATION_QUEUE_NAME = 'notifications';

const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 24 * 3600,   // keep completed jobs for 24 hours
      count: 5000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
    },
  },
});

/**
 * Provides a clean API for enqueueing notification jobs.
 * Used by ChannelService to decouple message delivery from background tasks.
 */
export class NotificationQueue {
  /**
   * Enqueue a job to notify users of a new channel message.
   *
   * @param {object} params
   * @param {string} params.messageId
   * @param {string} params.channelId
   * @param {string} params.senderId
   * @param {string[]} params.recipientIds
   * @param {string} params.contentPreview
   */
  async addMessageNotification({ messageId, channelId, senderId, recipientIds, contentPreview }) {
    return notificationQueue.add('channel-message-notification', {
      type: 'channel_message',
      messageId,
      channelId,
      senderId,
      recipientIds,
      contentPreview,
    });
  }

  /**
   * Enqueue a job to send an announcement email blast to class members.
   *
   * @param {object} params
   * @param {string} params.classId
   * @param {string} params.title
   * @param {string} params.content
   * @param {string[]} params.recipientEmails
   */
  async addAnnouncementEmailBlast({ classId, title, content, recipientEmails }) {
    return notificationQueue.add('announcement-email-blast', {
      type: 'announcement_email',
      classId,
      title,
      content,
      recipientEmails,
    });
  }
}

export { notificationQueue };
