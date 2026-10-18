import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { aiTutorService } from '../../services/ai-tutor.service';
import { resourceService } from '../../services/resource.service';
import { Conversation, ConversationMessage, DocumentResource } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Sparkles,
  Send,
  Plus,
  MessageCircle,
  FileText,
  BookOpen,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// Custom Markdown renderer with Tailwind-friendly styles
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ children }) => (
        <h1 className="text-lg font-bold text-stone-900 mt-3 mb-1.5">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-base font-bold text-stone-900 mt-3 mb-1">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-sm font-bold text-stone-800 mt-2 mb-1">{children}</h3>
      ),
      p: ({ children }) => <p className="text-stone-800 mb-2 leading-relaxed">{children}</p>,
      ul: ({ children }) => (
        <ul className="list-disc list-inside space-y-1 mb-2 text-stone-800">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal list-inside space-y-1 mb-2 text-stone-800">{children}</ol>
      ),
      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
      strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
      em: ({ children }) => <em className="italic text-stone-700">{children}</em>,
      code: ({ className, children, ...props }) => {
        const isInline = !className;
        return isInline ? (
          <code
            className="bg-stone-100 text-[#EA580C] rounded px-1 py-0.5 text-xs font-mono"
            {...props}
          >
            {children}
          </code>
        ) : (
          <code
            className="block bg-stone-100 rounded-lg p-3 text-xs font-mono text-stone-800 overflow-x-auto my-2"
            {...props}
          >
            {children}
          </code>
        );
      },
      pre: ({ children }) => <pre className="my-2">{children}</pre>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-[#EA580C]/40 pl-3 my-2 text-stone-600 italic">
          {children}
        </blockquote>
      ),
      table: ({ children }) => (
        <div className="overflow-x-auto my-3">
          <table className="min-w-full text-xs border-collapse border border-stone-200 rounded-lg overflow-hidden">
            {children}
          </table>
        </div>
      ),
      th: ({ children }) => (
        <th className="bg-stone-100 font-bold text-stone-700 px-3 py-2 text-left border border-stone-200">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="px-3 py-2 border border-stone-200 text-stone-800">{children}</td>
      ),
      hr: () => <hr className="border-stone-200 my-3" />,
    }}
  >
    {content}
  </ReactMarkdown>
);

export const AiTutorPage: React.FC = () => {
  const { selectedOrg, selectedClass } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [documents, setDocuments] = useState<DocumentResource[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingConv, setCreatingConv] = useState(false);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    const load = async () => {
      setLoading(true);
      setAccessDenied(null);
      try {
        const [convs, docs] = await Promise.all([
          aiTutorService.listConversations(selectedOrg.id, selectedClass.id),
          resourceService.getDocuments(selectedOrg.id, selectedClass.id),
        ]);
        setConversations(convs);
        setDocuments(docs.filter((d) => d.status === 'READY' || d.status === 'COMPLETED'));
        if (convs.length > 0) {
          await loadConversation(convs[0].id);
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosErr.response?.status === 403) {
          setAccessDenied(
            axiosErr.response?.data?.message || 'You do not have access to this classroom.',
          );
        } else {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedOrg?.id, selectedClass?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const loadConversation = async (id: string) => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    try {
      const data = await aiTutorService.getConversation(selectedOrg.id, selectedClass.id, id);
      setActiveConvId(id);
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewConversation = async () => {
    if (!selectedOrg?.id || !selectedClass?.id) return;
    setCreatingConv(true);
    try {
      const conv = await aiTutorService.createConversation(selectedOrg.id, selectedClass.id, {
        documentId: selectedDocId,
      });
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingConv(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConvId || !selectedOrg?.id || !selectedClass?.id) return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);

    // Optimistic user message
    const tempMsg: ConversationMessage = {
      id: `temp-${Date.now()}`,
      sender: 'USER',
      content: userMsg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const { userMessage, assistantMessage, conversationTitle } = await aiTutorService.sendMessage(
        selectedOrg.id,
        selectedClass.id,
        activeConvId,
        userMsg,
      );
      if (conversationTitle) {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === activeConvId
              ? { ...conversation, title: conversationTitle }
              : conversation,
          ),
        );
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempMsg.id),
        userMessage,
        assistantMessage,
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (accessDenied) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Classroom Enrollment Required</h2>
        <p className="text-stone-500 text-sm">{accessDenied}</p>
        <div className="flex justify-center gap-3 pt-3">
          <Button onClick={() => navigate('/app/classes/join')}>Join Class</Button>
          <Button variant="secondary" onClick={() => navigate('/app/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex h-screen w-screen gap-4 bg-[#FAF6F0] p-4'
          : 'h-[calc(100vh-11rem)] flex gap-6'
      }
    >
      {/* Conversation Sidebar */}
      <div className="w-60 shrink-0 flex flex-col gap-3">
        <Button
          size="sm"
          onClick={handleNewConversation}
          isLoading={creatingConv}
          className="w-full"
        >
          <Plus className="w-3.5 h-3.5" />
          New chat
        </Button>

        {/* Source filter */}
        <div className="px-1">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
            Filter by source
          </p>
          <select
            value={selectedDocId || ''}
            onChange={(e) => setSelectedDocId(e.target.value || undefined)}
            className="w-full text-xs bg-white/80 border border-[#EAE2D5] rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:border-[#EA580C]"
          >
            <option value="">All documents</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  activeConvId === conv.id
                    ? 'bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/20'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{conv.title || 'Untitled chat'}</span>
                </div>
              </button>
            ))
          )}
          {conversations.length === 0 && !loading && (
            <p className="text-xs text-stone-400 text-center py-6">
              No conversations yet.
              <br />
              Start your first chat!
            </p>
          )}
        </div>
      </div>

      {/* Chat Area (Figma D13) */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-[#EAE2D5]/70 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Ask EdQuest AI</h3>
              <p className="text-xs text-stone-500">
                {selectedDocId
                  ? `Grounded in: ${documents.find((d) => d.id === selectedDocId)?.title}`
                  : 'All class documents'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen((current) => !current)}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
              className="ml-auto rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {!activeConvId && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-stone-900">Your AI Tutor is ready</p>
                  <p className="text-sm text-stone-500 mt-1 max-w-xs">
                    Ask questions grounded in your class materials. Start a new chat or select an
                    existing one.
                  </p>
                </div>
                <Button onClick={handleNewConversation} isLoading={creatingConv}>
                  <Plus className="w-4 h-4" />
                  Start new chat
                </Button>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] ${msg.sender === 'USER' ? 'order-last' : 'order-first'}`}
                >
                  {msg.sender === 'ASSISTANT' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3 h-3 text-[#EA580C]" />
                      <span className="text-xs font-semibold text-[#EA580C]">EdQuest AI</span>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.sender === 'USER'
                        ? 'bg-[#EA580C] text-white rounded-tr-sm whitespace-pre-wrap'
                        : 'bg-white border border-[#EAE2D5] text-stone-800 rounded-tl-sm shadow-xs'
                    }`}
                  >
                    {msg.sender === 'USER' ? (
                      msg.content
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}
                  </div>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-stone-500 font-semibold">Sources & citations</p>
                      {msg.citations.map((cit, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-[#FAF6F0] border border-[#EAE2D5] rounded-xl px-3 py-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#EA580C] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-stone-700">
                              {cit.documentTitle}
                            </p>
                            {cit.page && <p className="text-xs text-stone-400">p. {cit.page}</p>}
                            <p className="text-xs text-stone-500 mt-0.5 italic">
                              &ldquo;{cit.snippet}&rdquo;
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#EA580C] animate-pulse" />
                <div className="bg-white border border-[#EAE2D5] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="px-6 py-4 border-t border-[#EAE2D5]/70">
            <div className="flex items-end gap-3 bg-[#F4EFEA]/60 border border-[#E2D8CC] rounded-2xl px-4 py-3">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cells turn glucose and oxygen into energy..."
                className="flex-1 resize-none bg-transparent text-sm text-stone-800 placeholder-stone-400 focus:outline-none max-h-32"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || sending || !activeConvId}
                isLoading={sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
