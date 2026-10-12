import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      const token = localStorage.getItem('token');
      this.socket = io('/', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('[socket] Connected to server, id:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('[socket] Disconnected');
      });
    }
    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  joinClass(classId: string) {
    this.socket?.emit('join:class', classId);
  }

  joinChannel(channelId: string) {
    this.socket?.emit('channel:join', { channelId });
  }

  leaveChannel(channelId: string) {
    this.socket?.emit('channel:leave', { channelId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
