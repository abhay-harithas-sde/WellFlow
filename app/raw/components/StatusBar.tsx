'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Props {
  userId: string;
  sessionId: string | null;
  onUserChange: (id: string) => void;
}

export default function StatusBar({ userId, sessionId, onUserChange }: Props) {
  const [online, setOnline] = useState<boolean | null>(null);
  // health endpoint is now a Next.js API route — no separate server needed
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(userId);

  useEffect(() => {
    const check = () =>
      api.health()
        .then(() => setOnline(true))
        .catch(() => setOnline(false));
    check();
    const t = setInterval(check, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-bold text-white tracking-wide">WellFlow</span>
        <span className={`flex items-center gap-1 text-xs ${online === null ? 'text-gray-500' : online ? 'text-green-400' : 'text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${online === null ? 'bg-gray-500' : online ? 'bg-green-400' : 'bg-red-400'}`} />
          {online === null ? 'checking…' : online ? 'online' : 'offline'}
        </span>
      </div>
      <div className="flex items-center gap-3 text-gray-400">
        {sessionId && (
          <span className="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded">
            session: {sessionId.slice(0, 8)}…
          </span>
        )}
        <span className="text-xs">user:</span>
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); onUserChange(draft); setEditing(false); }} className="flex gap-1">
            <input
              className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded border border-gray-600 w-28"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <button type="submit" className="text-green-400 text-xs">✓</button>
            <button type="button" onClick={() => setEditing(false)} className="text-gray-500 text-xs">✕</button>
          </form>
        ) : (
          <button onClick={() => { setDraft(userId); setEditing(true); }} className="text-white font-mono text-xs hover:text-green-400">
            {userId}
          </button>
        )}
      </div>
    </div>
  );
}
