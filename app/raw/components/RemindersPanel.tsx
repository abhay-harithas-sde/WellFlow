'use client';
import { useState } from 'react';
import { api } from '../lib/api';

interface Props { userId: string; }

export default function RemindersPanel({ userId }: Props) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [topic, setTopic] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setReminders(await api.getReminders(userId)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!topic || !time) return;
    setLoading(true); setError('');
    try {
      await api.createReminder(userId, topic, new Date(time).toISOString());
      setTopic(''); setTime('');
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function remove(reminderId: string) {
    try {
      await api.deleteReminder(reminderId, userId);
      setReminders((r) => r.filter((x) => x.reminderId !== reminderId));
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="card">
      <h2 className="section-title">Reminders</h2>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <form onSubmit={create} className="space-y-2 mb-3">
        <input
          className="input w-full"
          placeholder="Topic (e.g. breathing exercise)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <input
          type="datetime-local"
          className="input w-full"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <button type="submit" disabled={loading || !topic || !time} className="btn-primary w-full text-sm">
          Add Reminder
        </button>
      </form>

      <button onClick={load} disabled={loading} className="btn-ghost w-full text-xs mb-2">
        {loading ? 'Loading…' : 'Load Reminders'}
      </button>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {reminders.length === 0 && <p className="text-gray-600 text-xs">No reminders.</p>}
        {reminders.map((r: any) => (
          <div key={r.reminderId} className="flex items-center justify-between bg-gray-800 rounded px-2 py-1.5 text-xs">
            <div>
              <span className="text-white">{r.topic}</span>
              <span className="text-gray-500 ml-2">{new Date(r.scheduledTime).toLocaleString()}</span>
            </div>
            <button onClick={() => remove(r.reminderId)} className="text-red-400 hover:text-red-300 ml-2">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
