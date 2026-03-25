'use client';
import { useState } from 'react';
import { api } from '../lib/api';

interface Props {
  userId: string;
  sessionId: string | null;
  onSessionChange: (id: string | null) => void;
}

export default function SessionPanel({ userId, sessionId, onSessionChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [stress, setStress] = useState(5);
  const [history, setHistory] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  async function start() {
    setLoading(true); setError('');
    try {
      const s = await api.startSession(userId);
      onSessionChange(s.sessionId);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function end() {
    if (!sessionId) return;
    setLoading(true); setError('');
    try {
      await api.endSession(sessionId, stress);
      onSessionChange(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadHistory() {
    setLoading(true); setError('');
    try {
      const h = await api.getSessionHistory(userId);
      setHistory(h);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="card">
      <h2 className="section-title">Session</h2>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      {!sessionId ? (
        <button onClick={start} disabled={loading} className="btn-primary w-full">
          {loading ? 'Starting…' : 'Start Session'}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Active: <span className="font-mono text-green-300">{sessionId}</span></p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-24">Stress (1–10):</label>
            <input type="range" min={1} max={10} value={stress} onChange={(e) => setStress(+e.target.value)} className="flex-1" />
            <span className="text-white text-sm w-4">{stress}</span>
          </div>
          <button onClick={end} disabled={loading} className="btn-danger w-full">
            {loading ? 'Ending…' : 'End Session'}
          </button>
        </div>
      )}

      <button onClick={loadHistory} disabled={loading} className="btn-ghost w-full mt-3 text-xs">
        Load History
      </button>

      {history && (
        <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
          {history.length === 0 && <p className="text-gray-500 text-xs">No sessions yet.</p>}
          {history.map((s: any, i: number) => (
            <div key={i} className="text-xs bg-gray-800 rounded px-2 py-1 flex justify-between">
              <span className="text-gray-300">{new Date(s.startTime).toLocaleDateString()}</span>
              <span className="text-gray-400">{s.durationMinutes?.toFixed(1) ?? '?'} min</span>
              <span className="text-yellow-400">stress: {s.averageStressRating?.toFixed(1) ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
