/**
 * Socket.IO Gateway — Phase 10
 *
 * Handles all real-time WebSocket events for the discussion platform.
 *
 * Design principle: Socket.IO is the delivery layer only.
 * - Message persistence happens FIRST via REST API (PostgreSQL).
 * - Socket.IO broadcasts AFTER the REST call succeeds.
 * - This gateway handles presence, typing indicators, and joining rooms.
 *
 * Room naming convention:
 *   class:<classId>    — joined when a user logs in/opens a class
 *   channel:<channelId> — joined when a user opens a specific channel
 *
 * Events emitted (server → client):
 *   channel:new          - A new channel was created
 *   channel:deleted      - A channel was deleted
 *   message:new          - A new top-level message
 *   reply:new            - A new threaded reply
 *   message:updated      - A message was edited
 *   message:deleted      - A message was soft-deleted
 *   user:typing          - A user started typing
 *   user:stopped_typing  - A user stopped typing
 *   presence:update      - Online/offline status update
 *   notification:new     - In-app notification
 *
 * Events received (client → server):
 *   join:channel         - Join a channel room
 *   leave:channel        - Leave a channel room
 *   user:typing          - Broadcast typing indicator to channel
 *   user:stopped_typing  - Broadcast stop typing to channel
 */

import { prisma } from '../lib/prismaClient.js';

// In-memory presence store (replace with Redis for multi-server)
// Map<userId, Set<socketId>>
const onlineUsers = new Map();

function addOnlineUser(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

function removeOnlineUser(userId, socketId) {
  if (!onlineUsers.has(userId)) return false;
  const sockets = onlineUsers.get(userId);
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true; // User is now fully offline
  }
  return false; // User still has other connections
}

export function initSocketGateway(io) {
  // Middleware: authenticate socket connections via JWT/session
  io.use(async (socket, next) => {
    try {
      // Extract user from handshake (adapt to your auth strategy)
      // For JWT: const token = socket.handshake.auth.token;
      // For sessions: socket.request.session.user
      const userId = socket.handshake.auth?.userId;
      if (!userId) return next(new Error('Authentication required.'));

      // Attach user to socket
      socket.userId = userId;
      next();
    } catch (err) {
      next(new Error('Authentication failed.'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;
    console.log(`[SocketGateway] User connected: ${userId} (socket: ${socket.id})`);

    // ── Presence ──────────────────────────────────────────────────────────────
    addOnlineUser(userId, socket.id);
    // Broadcast to all that this user came online
    socket.broadcast.emit('presence:update', { userId, status: 'online' });

    // ── Room management ───────────────────────────────────────────────────────

    // Join a class room (called when student/teacher opens a class dashboard)
    socket.on('join:class', (classId) => {
      socket.join(`class:${classId}`);
      console.log(`[SocketGateway] ${userId} joined class room: ${classId}`);
    });

    // Join a specific channel room (called when user opens a channel)
    socket.on('join:channel', (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`[SocketGateway] ${userId} joined channel room: ${channelId}`);
    });

    // Leave a channel room (called when user navigates away)
    socket.on('leave:channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
      console.log(`[SocketGateway] ${userId} left channel room: ${channelId}`);
    });

    // ── Typing indicators ─────────────────────────────────────────────────────

    socket.on('user:typing', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('user:typing', { userId, channelId });
    });

    socket.on('user:stopped_typing', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('user:stopped_typing', { userId, channelId });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const isFullyOffline = removeOnlineUser(userId, socket.id);
      if (isFullyOffline) {
        socket.broadcast.emit('presence:update', { userId, status: 'offline' });
        console.log(`[SocketGateway] User offline: ${userId}`);
      }
    });
  });

  console.log('[SocketGateway] Real-time gateway initialized.');
}
