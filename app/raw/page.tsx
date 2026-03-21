'use client';
import { useState } from 'react';
import StatusBar from './components/StatusBar';
import SessionPanel from './components/SessionPanel';
import ConversationPanel from './components/ConversationPanel';
import BreathingPanel from './components/BreathingPanel';
import MindfulnessPanel from './components/MindfulnessPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import RemindersPanel from './components/RemindersPanel';
import CommunityPanel from './components/CommunityPanel';
import IntegrationsPanel from './components/IntegrationsPanel';
import CrisisPanel from './components/CrisisPanel';

type Tab = 'session' | 'breathing' | 'mindfulness' | 'analytics' | 'reminders' | 'community' | 'integrations' | 'crisis';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'session', label: 'Session', emoji: '▶' },
  { id: 'breathing', label: 'Breathing', emoji: '🫁' },
  { id: 'mindfulness', label: 'Mindfulness', emoji: '🧘' },
  { id: 'analytics', label: 'Analytics', emoji: '📊' },
  { id: 'reminders', label: 'Reminders', emoji: '🔔' },
  { id: 'community', label: 'Community', emoji: '👥' },
  { id: 'integrations', label: 'Integrations', emoji: '🔗' },
  { id: 'crisis', label: 'Crisis', emoji: '🆘' },
];

export default function BJPDashboard() {
  const [userId, setUserId] = useState('user-001');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('session');

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <StatusBar userId={userId} sessionId={sessionId} onUserChange={setUserId} />

      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-gray-800 bg-gray-900 px-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-green-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {tab === 'session' && (
          <div className="space-y-4">
            <SessionPanel userId={userId} sessionId={sessionId} onSessionChange={setSessionId} />
            <ConversationPanel userId={userId} sessionId={sessionId} />
          </div>
        )}
        {tab === 'breathing' && <BreathingPanel sessionId={sessionId} />}
        {tab === 'mindfulness' && <MindfulnessPanel sessionId={sessionId} />}
        {tab === 'analytics' && <AnalyticsPanel userId={userId} />}
        {tab === 'reminders' && <RemindersPanel userId={userId} />}
        {tab === 'community' && <CommunityPanel userId={userId} />}
        {tab === 'integrations' && <IntegrationsPanel userId={userId} />}
        {tab === 'crisis' && <CrisisPanel sessionId={sessionId} />}
      </div>
    </div>
  );
}
