import { useState, useRef, useCallback, useEffect } from 'react';
import { MindfulnessGuide } from '../src/components/MindfulnessGuide';

export interface UseMindfulnessGuideResult {
  start: (durationMinutes: 5 | 10 | 15) => void;
  stop: () => void;
  currentSegment: string | null;
  isActive: boolean;
}

export function useMindfulnessGuide(): UseMindfulnessGuideResult {
  const [currentSegment, setCurrentSegment] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const guideRef = useRef<MindfulnessGuide | null>(null);
  const sessionIdRef = useRef<string>('mindfulness-session');

  const stop = useCallback(() => {
    if (guideRef.current) {
      // Pause the session to stop segment delivery
      guideRef.current.pause(sessionIdRef.current);
      guideRef.current = null;
    }
    setIsActive(false);
    setCurrentSegment(null);
  }, []);

  const start = useCallback((durationMinutes: 5 | 10 | 15) => {
    // Stop any existing session first
    if (guideRef.current) {
      guideRef.current.pause(sessionIdRef.current);
      guideRef.current = null;
    }

    const guide = new MindfulnessGuide({
      onSegment: (_sessionId, text) => {
        setCurrentSegment(text);
      },
      onComplete: () => {
        setIsActive(false);
        setCurrentSegment(null);
      },
    });

    guideRef.current = guide;
    setIsActive(true);
    guide.startSession(durationMinutes, sessionIdRef.current);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (guideRef.current) {
        guideRef.current.pause(sessionIdRef.current);
        guideRef.current = null;
      }
    };
  }, []);

  return { start, stop, currentSegment, isActive };
}
