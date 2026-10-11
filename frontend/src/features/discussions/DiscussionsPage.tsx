import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { discussionService } from '../../services/discussion.service';
import { socketService } from '../../services/socket.service';
import { DiscussionChannel, DiscussionMessage } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { MessageSquare, Plus, Send, Hash, Loader2 } from 'lucide-react';

export const DiscussionsPage: React.FC = () => {
  const { selectedOrg, selectedClass, user, isTeacher } = useAuth();
  const [channels, setChannels] = useState<DiscussionChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<DiscussionChannel | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const chs = await discussionService.listChannels(selectedOrg.id, selectedClass.id);
        setChannels(chs);
        if (chs.length > 0) {
          await openChannel(chs[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Connect socket
    const socket = socketService.connect();
    socketRef.current = socket;

    socket.on('message:new', (msg: DiscussionMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      if (activeChannel) socketService.leaveChannel(activeChannel.id);
    };
  }, [selectedOrg?.id, selectedClass?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChannel = async (channel: DiscussionChannel) => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    if (activeChannel) socketService.leaveChannel(activeChannel.id);
    setActiveChannel(channel);
    socketService.joinChannel(channel.id);

    try {
      const { messages: msgs } = await discussionService.getMessageHistory(
        selectedOrg.id,
        selectedClass.id,
        channel.id,
        { limit: 50 },
      );
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChannel || !selectedOrg?.id || !selectedClass?.id) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await discussionService.postMessage(selectedOrg.id, selectedClass.id, activeChannel.id, {
        content,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    setCreating(true);
    try {
      const ch = await discussionService.createChannel(
        selectedOrg.id,
        selectedClass.id,
        newChannel,
      );
      setChannels((prev) => [...prev, ch]);
      setCreateOpen(false);
      setNewChannel({ name: '', description: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-11rem)] flex gap-6">
      {/* Channel List */}
      <div className="w-56 shrink-0 flex flex-col gap-3">
        {isTeacher && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full">
            <Plus className="w-3.5 h-3.5" />
            New channel
          </Button>
        )}

        <div className="space-y-1 overflow-y-auto flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 px-1 mb-1">
            Channels
          </p>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-stone-400 mx-auto mt-4" />
          ) : (
            channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => openChannel(ch)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  activeChannel?.id === ch.id
                    ? 'bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/20'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </div>
              </button>
            ))
          )}
          {channels.length === 0 && !loading && (
            <p className="text-xs text-stone-400 text-center py-6">
              No channels yet.{isTeacher ? ' Create one!' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Chat Area (Figma D21) */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Channel Header */}
          <div className="px-6 py-4 border-b border-[#EAE2D5]/70 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                {activeChannel?.name || 'Select a channel'}
              </h3>
              {activeChannel?.description && (
                <p className="text-xs text-stone-500">{activeChannel.description}</p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {!activeChannel && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <MessageSquare className="w-12 h-12 text-stone-200" />
                <p className="font-semibold text-stone-500">Select a channel to start chatting</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full bg-[#EA580C]/10 text-[#EA580C] text-xs font-bold flex items-center justify-center shrink-0 ${!isMe && 'border border-[#EA580C]/20'}`}
                  >
                    {msg.sender?.firstName?.[0] || '?'}
                  </div>
                  <div
                    className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}
                  >
                    {!isMe && (
                      <p className="text-xs font-semibold text-stone-500 mb-1">
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'bg-[#EA580C] text-white rounded-tr-sm' : 'bg-white border border-[#EAE2D5] text-stone-800 rounded-tl-sm shadow-xs'}`}
                    >
                      {msg.content}
                    </div>
                    <p className="text-xs text-stone-400 mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-[#EAE2D5]/70">
            <div className="flex items-end gap-3 bg-[#F4EFEA]/60 border border-[#E2D8CC] rounded-2xl px-4 py-3">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Message #${activeChannel?.name || 'channel'}...`}
                disabled={!activeChannel}
                className="flex-1 resize-none bg-transparent text-sm text-stone-800 placeholder-stone-400 focus:outline-none max-h-32 disabled:opacity-40"
                style={{ fieldSizing: 'content' } as any}
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || sending || !activeChannel}
                isLoading={sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Create Channel Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create channel">
        <div className="space-y-4">
          <Input
            label="Channel name"
            placeholder="general, announcements..."
            value={newChannel.name}
            onChange={(e) => setNewChannel((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Description (optional)"
            placeholder="What is this channel for?"
            value={newChannel.description}
            onChange={(e) => setNewChannel((f) => ({ ...f, description: e.target.value }))}
          />
          <Button className="w-full" onClick={handleCreateChannel} isLoading={creating}>
            Create channel
          </Button>
        </div>
      </Modal>
    </div>
  );
};
