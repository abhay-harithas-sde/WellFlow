'use client';
import { useState } from 'react';
import { api } from '../lib/api';

interface Props { userId: string; }

export default function CommunityPanel({ userId }: Props) {
  const [feed, setFeed] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [createdGroup, setCreatedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'feed' | 'groups'>('feed');

  async function loadFeed() {
    setLoading(true); setError('');
    try { setFeed(await api.getFeed()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName) return;
    setLoading(true); setError('');
    try {
      const g = await api.createGroup(userId, groupName);
      setCreatedGroup(g); setGroupName('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function joinGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!groupCode) return;
    setLoading(true); setError('');
    try {
      const g = await api.joinGroup(userId, groupCode);
      setCreatedGroup(g); setGroupCode('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const activityIcon: Record<string, string> = {
    BREATHING: '🫁', MINDFULNESS: '🧘', STRESS_RELIEF: '💆', REMINDER: '🔔',
  };

  return (
    <div className="card">
      <h2 className="section-title">Community</h2>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <div className="flex gap-1 mb-3">
        {(['feed', 'groups'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 text-xs py-1 rounded ${tab === t ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t === 'feed' ? 'Activity Feed' : 'Groups'}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <>
          <button onClick={loadFeed} disabled={loading} className="btn-ghost w-full text-xs mb-2">
            {loading ? 'Loading…' : 'Refresh Feed'}
          </button>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {feed.length === 0 && <p className="text-gray-600 text-xs">No activity yet.</p>}
            {feed.map((e: any) => (
              <div key={e.eventId} className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5 text-xs">
                <span>{activityIcon[e.activityType] ?? '✨'}</span>
                <span className="text-gray-300">{e.anonymizedName}</span>
                <span className="text-gray-500">completed {e.activityType.toLowerCase().replace('_', ' ')}</span>
                <span className="ml-auto text-gray-600">{new Date(e.occurredAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'groups' && (
        <div className="space-y-3">
          {createdGroup && (
            <div className="bg-green-900/30 border border-green-700 rounded p-2 text-xs">
              <p className="text-green-300 font-medium">{createdGroup.name}</p>
              <p className="text-gray-400">Code: <span className="font-mono text-white">{createdGroup.groupCode}</span></p>
              <p className="text-gray-400">Members: {createdGroup.memberIds?.length ?? 0}</p>
            </div>
          )}
          <form onSubmit={createGroup} className="flex gap-2">
            <input className="input flex-1 text-xs" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            <button type="submit" disabled={loading || !groupName} className="btn-primary text-xs px-3">Create</button>
          </form>
          <form onSubmit={joinGroup} className="flex gap-2">
            <input className="input flex-1 text-xs font-mono" placeholder="Group code" value={groupCode} onChange={(e) => setGroupCode(e.target.value)} />
            <button type="submit" disabled={loading || !groupCode} className="btn-primary text-xs px-3">Join</button>
          </form>
        </div>
      )}
    </div>
  );
}
