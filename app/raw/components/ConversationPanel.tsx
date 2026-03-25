'use client';
import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';

interface Message { role: 'user' | 'assistant'; text: string; intent?: string; }

interface Props { userId: string; sessionId: string | null; }

export default function ConversationPanel({ userId, sessionId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!input.trim() || !sessionId) return;
    const text = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true); setError('');
    try {
      const res = await api.converse(userId, sessionId, text);
      setMessages((m) => [...m, {
        role: 'assistant',
        text: res.responseText,
        intent: res.intent?.type,
      }]);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="card flex flex-col h-full">
      <h2 className="section-title">Conversation</h2>
      {!sessionId && (
        <p className="text-yellow-500 text-xs mb-2">Start a session first to chat.</p>
      )}
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-[160px] max-h-64 pr-1">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs italic">Say something like "I need to relax" or "start breathing exercise"</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              m.role === 'user' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-100'
            }`}>
              {m.text}
              {m.intent && m.intent !== 'UNKNOWN' && (
                <span className="block text-xs mt-1 opacity-60">intent: {m.intent}</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-gray-400 text-sm animate-pulse">…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
        <input
          className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-green-500"
          placeholder={sessionId ? 'Type a message…' : 'Start a session first'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!sessionId || loading}
        />
        <button type="submit" disabled={!sessionId || loading || !input.trim()} className="btn-primary px-4">
          Send
        </button>
      </form>
    </div>
  );
}
