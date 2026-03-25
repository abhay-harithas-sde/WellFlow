import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseMurfTTSOptions {
  text: string;
  voiceId: string;
}

export interface UseMurfTTSResult {
  play: (opts: UseMurfTTSOptions) => Promise<void>;
  stop: () => void;
  playing: boolean;
  error: string | null;
}

export function useMurfTTS(): UseMurfTTSResult {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  const play = useCallback(
    async (opts: UseMurfTTSOptions): Promise<void> => {
      // Stop any current playback before starting new one
      stop();
      setError(null);

      let response: Response;
      try {
        response = await fetch('/api/murf/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: opts.text, voiceId: opts.voiceId }),
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? `Network error: ${err.message}`
            : 'Network error: unable to reach TTS service'
        );
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message =
          (body as { error?: string })?.error ??
          `TTS request failed (HTTP ${response.status})`;
        setError(message);
        return;
      }

      let audioUrl: string;
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        // API returned base64-encoded audio in JSON
        const data = await response.json();
        const base64 = (data as { audio?: string; audioData?: string })?.audio ??
          (data as { audio?: string; audioData?: string })?.audioData;
        if (!base64) {
          setError('TTS response missing audio data');
          return;
        }
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(blob);
      } else {
        // API returned raw audio binary
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setPlaying(false);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setPlaying(false);
        setError('Audio playback failed');
      });

      setPlaying(true);
      audio.play().catch((err: unknown) => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setPlaying(false);
        setError(
          err instanceof Error ? `Playback error: ${err.message}` : 'Audio playback failed'
        );
      });
    },
    [stop]
  );

  // Clean up audio element on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  return { play, stop, playing, error };
}
