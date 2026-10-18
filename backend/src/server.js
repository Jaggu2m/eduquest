import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { prisma } from './lib/prismaClient.js';
import { logger, httpLogger } from './lib/logger.js';
import {
  csrfProtection,
  sanitizeInput,
  preventParameterPollution,
} from './middleware/security.middleware.js';
import { apiLimiter } from './middleware/rate-limit.middleware.js';
import apiRoutes from './routes/index.js';
import { startDocumentWorker } from './workers/document.worker.js';
import { documentQueue } from './queues/document.queue.js';
import { startNotificationWorker } from './workers/notification.worker.js';
import { notificationQueue } from './queues/notification.queue.js';
import { initSocketGateway } from './lib/socket.gateway.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

// Security & Header middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  }),
);

app.use(cors());

// Structured HTTP request logging with Pino
app.use(httpLogger);

// Input sanitization & security parsers
app.use(express.json());
app.use(sanitizeInput);
app.use(preventParameterPollution);
app.use(csrfProtection);

// Apply rate limiting to all /api routes
app.use('/api', apiLimiter);

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
app.use((err, req, res, _next) => {
  const status = err.statusCode || (typeof err.status === 'number' ? err.status : 500);
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        statusCode: status,
      },
      path: req.path,
      method: req.method,
    },
    `Request error: ${err.message}`,
  );
  res.status(status).json({ message: err.message ?? 'Internal Server Error' });
});

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('[db]: PostgreSQL connected successfully');

    // Initialize Socket.IO Gateway
    initSocketGateway(io);
    logger.info('[socket]: Socket.IO Gateway initialized');

    // Initialize BullMQ Document Worker
    documentWorker = startDocumentWorker();
    logger.info('[worker]: BullMQ Document Worker initialized');

    // Initialize BullMQ Notification Worker
    notificationWorker = startNotificationWorker();
    logger.info('[worker]: BullMQ Notification Worker initialized');

    httpServer.listen(port, () => {
      logger.info(`[server]: Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    logger.error({ error }, '[db]: Failed to connect to PostgreSQL');
    process.exit(1);
  }
}

// ── Graceful shutdown ────────────────────────────────────────────────────────
async function handleShutdown(signal) {
  logger.info(`[server]: Received ${signal}, shutting down gracefully...`);
  try {
    if (documentWorker) await documentWorker.close();
    if (notificationWorker) await notificationWorker.close();
    await documentQueue.close();
    await notificationQueue.close();
    await prisma.$disconnect();
    logger.info('[server]: Cleanup complete, exiting process');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, '[server]: Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

bootstrap();
