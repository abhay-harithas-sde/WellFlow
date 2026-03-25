'use client';
import { useState } from 'react';
import { api } from '../lib/api';

interface Props { userId: string; }

const PLATFORM_GROUPS = {
  Health: ['APPLE_HEALTH', 'GOOGLE_FIT', 'FITBIT', 'GARMIN', 'OURA'],
  Calendar: ['GOOGLE_CALENDAR', 'APPLE_CALENDAR', 'OUTLOOK'],
  Wearable: ['APPLE_WATCH', 'WEAR_OS'],
  Messaging: ['SLACK', 'WHATSAPP', 'TELEGRAM'],
};

const STATUS_COLORS: Record<string, string> = {
  CONNECTED: 'text-green-400',
  DISCONNECTED: 'text-gray-500',
  UNAUTHORIZED: 'text-red-400',
};

export default function IntegrationsPanel({ userId }: Props) {
  const [status, setStatus] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);

  async function load() {
    setLoading(true); setError('');
    try { setStatus(await api.getIntegrationStatus(userId)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function syncHealth() {
    setSyncing(true); setError('');
    try { setHealthData(await api.syncHealth(userId)); }
    catch (e: any) { setError(e.message); }
    finally { setSyncing(false); }
  }

  return (
    <div className="card">
      <h2 className="section-title">Integrations</h2>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <div className="flex gap-2 mb-3">
        <button onClick={load} disabled={loading} className="btn-ghost flex-1 text-xs">
          {loading ? 'Loading…' : 'Check Status'}
        </button>
        <button onClick={syncHealth} disabled={syncing} className="btn-ghost flex-1 text-xs">
          {syncing ? 'Syncing…' : 'Sync Health'}
        </button>
      </div>

      {healthData && (
        <div className="bg-gray-800 rounded p-2 text-xs mb-3 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-white font-bold">{healthData.heartRateBpm ?? '—'}</div>
            <div className="text-gray-500">BPM</div>
          </div>
          <div className="text-center">
            <div className="text-white font-bold">{healthData.sleepScore ?? '—'}</div>
            <div className="text-gray-500">Sleep</div>
          </div>
          <div className="text-center">
            <div className="text-white font-bold">{healthData.stepCount ?? '—'}</div>
            <div className="text-gray-500">Steps</div>
          </div>
        </div>
      )}

      {status && (
        <div className="space-y-3">
          {Object.entries(PLATFORM_GROUPS).map(([group, platforms]) => (
            <div key={group}>
              <p className="text-xs text-gray-500 mb-1">{group}</p>
              <div className="grid grid-cols-2 gap-1">
                {platforms.map((p) => (
                  <div key={p} className="flex items-center justify-between bg-gray-800 rounded px-2 py-1 text-xs">
                    <span className="text-gray-300">{p.replace('_', ' ')}</span>
                    <span className={STATUS_COLORS[status[p]] ?? 'text-gray-500'}>
                      {status[p] === 'CONNECTED' ? '●' : status[p] === 'UNAUTHORIZED' ? '!' : '○'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
