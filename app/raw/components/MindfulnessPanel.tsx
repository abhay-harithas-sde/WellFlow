'use client';
import { useState } from 'react';
import { api } from '../lib/api';

interface Props { sessionId: string | null; }

export default function MindfulnessPanel({ sessionId }: Props) {
  const [duration, setDuration] = useState<5 | 10 | 15>(5);
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    if (!sessionId) return;
    setLoading(true); setError('');
    try {
      await api.startMindfulness(sessionId, duration);
      setActive(true); setElapsed(0);
      const t = setInterval(() => setElapsed((e) => e + 1), 1000);
      setTimerRef(t);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function stop() {
    if (!sessionId) return;
    if (timerRef) clearInterval(timerRef);
    setActive(false);
    try { await api.stopMindfulness(sessionId); } catch {}
  }

  const totalSecs = duration * 60;
  const progress = Math.min((elapsed / totalSecs) * 100, 100);
  const remaining = Math.max(totalSecs - elapsed, 0);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="card">
      <h2 className="section-title">Mindfulness</h2>
      {!sessionId && <p className="text-yellow-500 text-xs mb-2">Start a session first.</p>}
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <div className="flex gap-2 mb-4">
        {([5, 10, 15] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`flex-1 py-1 rounded text-sm border transition-colors ${
              duration === d
                ? 'bg-purple-700 border-purple-500 text-white'
                : 'border-gray-700 text-gray-400 hover:border-purple-600'
            }`}
          >
            {d} min
          </button>
        ))}
      </div>

      {active ? (
        <div className="text-center py-2">
          <div className="text-4xl font-mono text-white mb-3">{mm}:{ss}</div>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-400 text-xs mb-3 italic">Focus on your breath. Let thoughts pass.</p>
          <button onClick={stop} className="btn-danger">Stop</button>
        </div>
      ) : (
        <button onClick={start} disabled={!sessionId || loading} className="btn-primary w-full" style={{ background: 'rgb(126 34 206)' }}>
          {loading ? 'Starting…' : 'Begin Session'}
        </button>
      )}
    </div>
  );
}
