'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMurfVoices } from '@/hooks/useMurfVoices';
import { useMurfTTS } from '@/hooks/useMurfTTS';
import { VoiceSelector } from '@/components/ui/VoiceSelector';
import WaveformAnimation from '@/components/ui/WaveformAnimation';

type ScriptKey = 'breathing' | 'mindfulness' | 'stress';

export default function VoiceDemoSection() {
  const t = useTranslations('voiceDemo');
  const { voices, loading, error: voicesError, refetch } = useMurfVoices();
  const { play, stop, playing, error: ttsError } = useMurfTTS();

  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<ScriptKey>('breathing');

  const scriptKeys: ScriptKey[] = ['breathing', 'mindfulness', 'stress'];

  function handlePlay() {
    const voiceId = selectedVoiceId ?? voices[0]?.voiceId;
    if (!voiceId) return;
    play({ text: t(`scripts.${selectedScript}`), voiceId });
  }

  const activeVoiceId = selectedVoiceId ?? voices[0]?.voiceId ?? null;

  return (
    <section
      id="voice-demo"
      aria-label={t('title')}
      className="py-16 bg-gray-900"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">{t('title')}</h2>
        <p className="text-lg text-gray-400 mb-10">{t('subtitle')}</p>

        {/* Skeleton loader */}
        {loading && (
          <div aria-label={t('loading')} className="space-y-4 animate-pulse">
            <div className="h-10 bg-gray-700 rounded-md w-full" />
            <div className="flex gap-3 justify-center">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 bg-gray-700 rounded-full w-36" />
              ))}
            </div>
            <div className="h-10 bg-gray-700 rounded-md w-32 mx-auto" />
          </div>
        )}

        {/* Error state */}
        {!loading && voicesError && (
          <div role="alert" className="text-red-400 space-y-3">
            <p>{t('error')}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* Main UI */}
        {!loading && !voicesError && (
          <div className="space-y-6">
            {/* Voice selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                {t('selectVoice')}
              </label>
              <VoiceSelector
                voices={voices}
                selectedVoiceId={activeVoiceId}
                onSelect={setSelectedVoiceId}
                disabled={playing}
              />
            </div>

            {/* Script preset buttons */}
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">{t('selectScript')}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {scriptKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedScript(key)}
                    disabled={playing}
                    aria-pressed={selectedScript === key}
                    className={
                      'px-4 py-2 rounded-full text-sm font-medium border transition-colors ' +
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ' +
                      'disabled:opacity-50 disabled:cursor-not-allowed ' +
                      (selectedScript === key
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-green-500 hover:text-white')
                    }
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Waveform + Play/Stop */}
            <div className="flex flex-col items-center gap-4">
              {playing && (
                <WaveformAnimation playing={playing} barCount={20} className="my-2" />
              )}

              {playing ? (
                <button
                  onClick={stop}
                  aria-label={t('stop')}
                  className="px-6 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                  {t('stop')}
                </button>
              ) : (
                <button
                  onClick={handlePlay}
                  disabled={voices.length === 0}
                  aria-label={t('play')}
                  className="px-6 py-2 rounded-md bg-green-600 text-white font-medium hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('play')}
                </button>
              )}
            </div>

            {/* TTS error */}
            {ttsError && (
              <p role="alert" className="text-sm text-red-400">
                {ttsError}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
