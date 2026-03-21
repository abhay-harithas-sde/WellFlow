'use client';

import React from 'react';
import { MurfVoice } from '@/hooks/useMurfVoices';

interface VoiceSelectorProps {
  voices: MurfVoice[];
  selectedVoiceId: string | null;
  onSelect: (voiceId: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({
  voices,
  selectedVoiceId,
  onSelect,
  disabled = false,
}: VoiceSelectorProps) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onSelect(e.target.value);
  }

  return (
    <select
      aria-label="Select a voice"
      value={selectedVoiceId ?? ''}
      onChange={handleChange}
      disabled={disabled}
      className={
        'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ' +
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ' +
        'disabled:opacity-50 disabled:cursor-not-allowed'
      }
    >
      {voices.map((voice) => (
        <option key={voice.voiceId} value={voice.voiceId}>
          {voice.displayName} ({voice.language}, {voice.gender})
        </option>
      ))}
    </select>
  );
}

export default VoiceSelector;
