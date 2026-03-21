'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useBreathingGuide } from '@/hooks/useBreathingGuide';
import { useMindfulnessGuide } from '@/hooks/useMindfulnessGuide';
import { useMurfTTS } from '@/hooks/useMurfTTS';
import BreathingCircle from '@/components/ui/BreathingCircle';

type Tab = 'breathing' | 'mindfulness';

export default function DemoSection() {
  const t = useTranslations('demo');

  const [activeTab, setActiveTab] = useState<Tab>('breathing');
  const [completed, setCompleted] = useState(false);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [ttsUnavailable, setTtsUnavailable] = useState(false);

  const breathing = useBreathingGuide();
  const mindfulness = useMindfulnessGuide();
  const tts = useMurfTTS();

  const handleCompletion = useCallback(async () => {
    setCompleted(true);
    const completionMessage = t('complete');
    try {
      await tts.play({ text: completionMessage, voiceId: 'en-US-1' });
    } catch {
      setTtsUnavailable(true);
    }
  }, [t, tts]);

  const handleBreathingStop = useCallback(() => {
    breathing.stop();
    handleCompletion();
  }, [breathing, handleCompletion]);

  const handleMoodSelect = useCallback(
    (mood: number) => {
      setSelectedMood(mood);
      mindfulness.stop();
      handleCompletion();
    },
    [mindfulness, handleCompletion]
  );

  const handleTabChange = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return;
      // Stop any active session when switching tabs
      breathing.stop();
      mindfulness.stop();
      setActiveTab(tab);
      setCompleted(false);
      setSelectedMood(null);
      setTtsUnavailable(false);
    },
    [activeTab, breathing, mindfulness]
  );

  const handleReset = useCallback(() => {
    breathing.stop();
    mindfulness.stop();
    setCompleted(false);
    setSelectedMood(null);
    setTtsUnavailable(false);
  }, [breathing, mindfulness]);

  return (
    <section
      id="demo"
      aria-label={t('title')}
      className="py-20 bg-gray-900"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('title')}</h2>
          <p className="text-lg text-gray-400">{t('subtitle')}</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-gray-700 mb-8" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'breathing'}
            aria-controls="panel-breathing"
            id="tab-breathing"
            onClick={() => handleTabChange('breathing')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
              activeTab === 'breathing'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {t('tabBreathing')}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'mindfulness'}
            aria-controls="panel-mindfulness"
            id="tab-mindfulness"
            onClick={() => handleTabChange('mindfulness')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
              activeTab === 'mindfulness'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {t('tabMindfulness')}
          </button>
        </div>

        {/* Panel content */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 min-h-[320px] flex flex-col items-center justify-center">
          {/* Breathing Exercise Panel */}
          {activeTab === 'breathing' && (
            <div
              id="panel-breathing"
              role="tabpanel"
              aria-labelledby="tab-breathing"
              className="flex flex-col items-center gap-6 w-full"
            >
              <BreathingCircle phase={breathing.phase} className="my-4" />

              {!completed && (
                <>
                  {!breathing.isActive ? (
                    <button
                      onClick={() => breathing.start('BOX')}
                      className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    >
                      {t('breathingStart')}
                    </button>
                  ) : (
                    <button
                      onClick={handleBreathingStop}
                      className="px-6 py-3 bg-gray-700 text-gray-200 rounded-full font-semibold hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    >
                      {t('breathingStop')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Mindfulness Check-in Panel */}
          {activeTab === 'mindfulness' && (
            <div
              id="panel-mindfulness"
              role="tabpanel"
              aria-labelledby="tab-mindfulness"
              className="flex flex-col items-center gap-6 w-full text-center"
            >
              <p className="text-lg text-gray-300 max-w-md">{t('mindfulnessPrompt')}</p>

              {!completed && (
                <fieldset className="flex flex-col items-center gap-3">
                  <legend className="text-sm font-medium text-gray-400 mb-2">
                    {t('moodLabel')}
                  </legend>
                  <div className="flex gap-3" role="group" aria-label={t('moodLabel')}>
                    {[1, 2, 3, 4, 5].map((mood) => (
                      <button
                        key={mood}
                        onClick={() => handleMoodSelect(mood)}
                        aria-pressed={selectedMood === mood}
                        className={`w-12 h-12 rounded-full text-lg font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                          selectedMood === mood
                            ? 'bg-green-600 text-white scale-110'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}

          {/* Completion state */}
          {completed && (
            <div className="flex flex-col items-center gap-4 text-center mt-4 w-full">
              <p className="text-base text-gray-300 font-medium">{t('complete')}</p>

              {/* TTS error fallback */}
              {(ttsUnavailable || tts.error) && (
                <p className="text-sm text-amber-400" role="alert">
                  {t('ttsError')}
                </p>
              )}

              <a
                href="/signup"
                className="inline-block mt-2 px-8 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                {t('cta')}
              </a>

              <button
                onClick={handleReset}
                className="text-sm text-gray-500 underline hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
