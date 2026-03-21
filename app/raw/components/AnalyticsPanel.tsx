'use client';
import { useState } from 'react';
import { api } from '../lib/api';

interface Props { userId: string; }

export default function AnalyticsPanel({ userId }: Props) {
  const [days, setDays] = useState<7 | 30>(7);
  const [streak, setStreak] = useState<any>(null);
  const [mood, setMood] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [s, m, a, ins] = await Promise.all([
        api.getStreak(userId),
        api.getMoodTrend(userId, days),
        api.getActivityFrequency(userId, days),
        api.getInsights(userId),
      ]);
      setStreak(s); setMood(m); setActivity(a); setInsights(ins);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const activityColors: Record<string, string> = {
    BREATHING: 'bg-blue-500',
    MINDFULNESS: 'bg-purple-500',
    STRESS_RELIEF: 'bg-green-500',
    REMINDER: 'bg-yellow-500',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title mb-0">Analytics</h2>
        <div className="flex gap-1">
          {([7, 30] as const).map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`text-xs px-2 py-0.5 rounded ${days === d ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <button onClick={load} disabled={loading} className="btn-primary w-full mb-4 text-sm">
        {loading ? 'Loading…' : 'Load Analytics'}
      </button>

      {streak && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="stat-box">
            <div className="text-2xl font-bold text-orange-400">{streak.currentStreak}</div>
            <div className="text-xs text-gray-400">Current Streak</div>
          </div>
          <div className="stat-box">
            <div className="text-2xl font-bold text-yellow-400">{streak.longestStreak}</div>
            <div className="text-xs text-gray-400">Longest Streak</div>
          </div>
        </div>
      )}

      {activity?.counts && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Activity ({days}d)</p>
          <div className="space-y-1">
            {Object.entries(activity.counts).map(([type, count]: [string, any]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-28">{type}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div className={`${activityColors[type] ?? 'bg-gray-500'} h-2 rounded-full`}
                    style={{ width: `${Math.min(count * 10, 100)}%` }} />
                </div>
                <span className="text-xs text-white w-4">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mood?.dataPoints?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Mood Trend</p>
          <div className="flex items-end gap-1 h-16">
            {mood.dataPoints.slice(-14).map((dp: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full bg-green-600 rounded-sm"
                  style={{ height: `${(dp.averageStressRating / 10) * 48}px` }}
                  title={`${new Date(dp.date).toLocaleDateString()}: ${dp.averageStressRating.toFixed(1)}`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">stress over time (higher = more stressed)</p>
        </div>
      )}

      {insights.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Insights</p>
          <div className="space-y-2">
            {insights.map((ins: any) => (
              <div key={ins.insightId} className="bg-gray-800 rounded p-2 text-xs">
                <span className="text-green-400 font-medium">{ins.activityType}</span>
                <p className="text-gray-300 mt-0.5">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
