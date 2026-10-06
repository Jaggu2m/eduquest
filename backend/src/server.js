import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './lib/prismaClient.js';
dotenv.config();
const app = express();
const httpServer = createServer(app); // Wrap Express with Node's http.Server
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
import apiRoutes from './routes/index.js';
import { startDocumentWorker } from './workers/document.worker.js';
import { documentQueue } from './queues/document.queue.js';
import { startNotificationWorker } from './workers/notification.worker.js';
import { notificationQueue } from './queues/notification.queue.js';
import { initSocketGateway } from './lib/socket.gateway.js';

// ── Socket.IO setup ──────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Inject io into every Express request so controllers can broadcast
app.use((req, _res, next) => {
  req.io = io;
  next();
});

let documentWorker = null;
let notificationWorker = null;

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);
// ── Global Error Handler ─────────────────────────────────────────────────────
// Must be defined AFTER routes and have 4 params for Express to recognise it.
app.use((err, _req, res, _next) => {
  console.error('[error]:', err.message);
  const status = err.statusCode || (typeof err.status === 'number' ? err.status : 500);
  res.status(status).json({ message: err.message ?? 'Internal Server Error' });
});
// ── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('[db]: PostgreSQL connected successfully');

    // Initialize Socket.IO Gateway
    initSocketGateway(io);
    console.log('[socket]: Socket.IO Gateway initialized');

    // Initialize BullMQ Document Worker
    documentWorker = startDocumentWorker();
    console.log('[worker]: BullMQ Document Worker initialized');

    // Initialize BullMQ Notification Worker
    notificationWorker = startNotificationWorker();
    console.log('[worker]: BullMQ Notification Worker initialized');

    httpServer.listen(port, () => {
      console.log(`[server]: Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('[db]: Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }
}
// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[server]: Shutting down gracefully...');
  if (documentWorker) await documentWorker.close();
  if (notificationWorker) await notificationWorker.close();
  await documentQueue.close();
  await notificationQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  if (documentWorker) await documentWorker.close();
  if (notificationWorker) await notificationWorker.close();
  await documentQueue.close();
  await notificationQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});
bootstrap();

//# sourceMappingURL=server.js.map
