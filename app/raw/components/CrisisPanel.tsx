'use client';
import { useState } from 'react';
import { api } from '../lib/api';

interface Props { sessionId: string | null; }

export default function CrisisPanel({ sessionId }: Props) {
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!transcript || !sessionId) return;
    setLoading(true); setError('');
    try {
      const r = await api.analyzeCrisis(transcript, sessionId);
      setResult(r);
      if (r.resources?.length) setResources(r.resources);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadResources() {
    try { setResources(await api.getCrisisResources()); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div className="card border border-red-900/40">
      <h2 className="section-title text-red-400">Crisis Detection</h2>
      <p className="text-xs text-gray-500 mb-3">Analyze text for crisis signals and get emergency resources.</p>
      {!sessionId && <p className="text-yellow-500 text-xs mb-2">Start a session first.</p>}
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <form onSubmit={analyze} className="space-y-2 mb-3">
        <textarea
          className="input w-full h-20 resize-none text-xs"
          placeholder="Enter transcript to analyze…"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <button type="submit" disabled={loading || !transcript || !sessionId}
          className="w-full py-1.5 rounded text-sm bg-red-800 hover:bg-red-700 text-white transition-colors disabled:opacity-50">
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>

      {result && (
        <div className={`rounded p-2 text-xs mb-3 ${result.signal ? 'bg-red-900/40 border border-red-700' : 'bg-green-900/30 border border-green-800'}`}>
          {result.signal
            ? <p className="text-red-300 font-medium">⚠ Signal detected: {result.signal}</p>
            : <p className="text-green-400">✓ No crisis signals detected</p>
          }
        </div>
      )}

      <button onClick={loadResources} className="btn-ghost w-full text-xs mb-2">
        Show Emergency Resources
      </button>

      {resources.length > 0 && (
        <div className="space-y-1">
          {resources.map((r: any, i: number) => (
            <div key={i} className="bg-gray-800 rounded px-2 py-1.5 text-xs">
              <p className="text-white font-medium">{r.name}</p>
              <p className="text-green-400">{r.phoneNumber}</p>
              <p className="text-gray-400">{r.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
