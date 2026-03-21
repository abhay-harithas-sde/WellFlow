'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface Props { sessionId: string | null; }

const PHASE_COLORS: Record<string, string> = {
  inhale: 'text-blue-400',
  hold: 'text-yellow-400',
  exhale: 'text-green-400',
  'hold-out': 'text-purple-400',
};

export default function BreathingPanel({ sessionId }: Props) {
  const [techniques, setTechniques] = useState<any[]>([]);
  const [selected, setSelected] = useState('BOX');
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    api.getBreathingTechniques().then(setTechniques).catch(() => {});
  }, []);

  function runPhases(phases: any[]) {
    let idx = 0;
    function tick() {
      if (idx >= phases.length) idx = 0;
      const p = phases[idx];
      setPhase(p.label);
      setPhaseIdx(idx);
      let remaining = Math.round(p.durationMs / 1000);
      setCountdown(remaining);
      const inner = setInterval(() => {
        remaining--;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(inner);
          idx++;
          tick();
        }
      }, 1000);
      timerRef.current = inner;
    }
    tick();
  }

  async function start() {
    if (!sessionId) return;
    setLoading(true); setError('');
    try {
      const res = await api.startBreathing(sessionId, selected);
      sessionRef.current = res;
      setActive(true);
      const tech = techniques.find((t) => t.id === selected);
      if (tech?.phases) runPhases(tech.phases);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function stop() {
    if (!sessionId) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false); setPhase(''); setCountdown(0);
    try { await api.stopBreathing(sessionId); } catch {}
  }

  const tech = techniques.find((t) => t.id === selected);

  return (
    <div className="card">
      <h2 className="section-title">Breathing</h2>
      {!sessionId && <p className="text-yellow-500 text-xs mb-2">Start a session first.</p>}
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <div className="flex gap-2 mb-3 flex-wrap">
        {techniques.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              selected === t.id
                ? 'bg-green-600 border-green-500 text-white'
                : 'border-gray-700 text-gray-400 hover:border-green-600'
            }`}
          >
            {t.name ?? t.id}
          </button>
        ))}
      </div>

      {tech && (
        <p className="text-xs text-gray-500 mb-3">{tech.description}</p>
      )}

      {active ? (
        <div className="text-center py-4">
          <div className={`text-2xl font-bold mb-1 ${PHASE_COLORS[phase?.toLowerCase()] ?? 'text-white'}`}>
            {phase}
          </div>
          <div className="text-5xl font-mono text-white mb-4">{countdown}</div>
          <div className="flex justify-center gap-1 mb-4">
            {tech?.phases?.map((_: any, i: number) => (
              <span key={i} className={`w-2 h-2 rounded-full ${i === phaseIdx ? 'bg-green-400' : 'bg-gray-700'}`} />
            ))}
          </div>
          <button onClick={stop} className="btn-danger">Stop</button>
        </div>
      ) : (
        <button onClick={start} disabled={!sessionId || loading} className="btn-primary w-full">
          {loading ? 'Starting…' : 'Start Exercise'}
        </button>
      )}
    </div>
  );
}
