import { useState, useEffect, useCallback } from 'react';

export interface MurfVoice {
  voiceId: string;
  displayName: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  sampleUrl?: string;
}

interface UseMurfVoicesResult {
  voices: MurfVoice[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMurfVoices(): UseMurfVoicesResult {
  const [voices, setVoices] = useState<MurfVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/murf/voices');

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body?.error ?? `Failed to load voices (HTTP ${response.status})`;
        setError(message);
        setLoading(false);
        return;
      }

      const data = await response.json();
      // The Murf API may return voices in a nested structure; handle both array and wrapped shapes
      const raw: unknown[] = Array.isArray(data) ? data : (data?.voices ?? []);
      setVoices(raw as MurfVoice[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error: unable to load voices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  return { voices, loading, error, refetch: fetchVoices };
}
