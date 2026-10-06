import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { NOTIFICATION_QUEUE_NAME } from '../queues/notification.queue.js';

/**
 * NotificationWorker — Phase 10
 *
 * Processes notification jobs enqueued by ChannelService.
 * Runs in the background completely isolated from the HTTP request lifecycle.
 *
 * Job types handled:
 *  - channel_message:   In-app notification for offline/idle channel members
 *  - announcement_email: Email blast via Nodemailer for class announcements
 *
 * NOTE: Nodemailer is intentionally stubbed here. To activate real emails:
 *  1. npm install nodemailer
 *  2. Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env
 *  3. Replace the stub sendEmail() with a real transporter.
 */

// ── Stub email sender (replace with real Nodemailer transporter) ───────────────
async function sendEmail({ to, subject, text }) {
  // TODO: Replace with:
  // const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, ... });
  // await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
  console.log(`[NotificationWorker] [STUB] Email to ${to}: "${subject}"`);
}

// ── Job handlers ─────────────────────────────────────────────────────────────

async function handleChannelMessageNotification(job) {
  const { messageId, channelId, senderId, recipientIds, contentPreview } = job.data;

  console.log(
    `[NotificationWorker] Processing channel_message notification — messageId: ${messageId}, recipients: ${recipientIds.length}`,
  );

  // In production, look up user preferences and send in-app or push notifications.
  // For now, log the intent. Replace with real push/email logic as needed.
  for (const userId of recipientIds) {
    console.log(`  → Notifying user ${userId}: New message in channel ${channelId}`);
  }
}

async function handleAnnouncementEmailBlast(job) {
  const { classId, title, content, recipientEmails } = job.data;

  console.log(
    `[NotificationWorker] Processing announcement_email — classId: ${classId}, recipients: ${recipientEmails.length}`,
  );

  // Send emails concurrently in batches to avoid SMTP rate limits
  const BATCH_SIZE = 20;
  for (let i = 0; i < recipientEmails.length; i += BATCH_SIZE) {
    const batch = recipientEmails.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map((email) =>
        sendEmail({
          to: email,
          subject: `[EdQuest] Announcement: ${title}`,
          text: `${content}\n\n---\nLog in to EdQuest AI to see more details.`,
        }),
      ),
    );
  }

  console.log(`[NotificationWorker] Announcement email blast completed for classId: ${classId}`);
}

// ── Worker factory ────────────────────────────────────────────────────────────

export function startNotificationWorker() {
  const worker = new Worker(
    NOTIFICATION_QUEUE_NAME,
    async (job) => {
      switch (job.data.type) {
        case 'channel_message':
          return handleChannelMessageNotification(job);
        case 'announcement_email':
          return handleAnnouncementEmailBlast(job);
        default:
          console.warn(`[NotificationWorker] Unknown job type: ${job.data.type}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 10, // Process up to 10 notification jobs simultaneously
    },
  );

  worker.on('completed', (job) => {
    console.log(`[NotificationWorker] Job completed — id: ${job.id}, type: ${job.data.type}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[NotificationWorker] Job failed — id: ${job?.id}: ${err.message}`);
  });

  console.log('[NotificationWorker] Listening for notification jobs...');
  return worker;
}
