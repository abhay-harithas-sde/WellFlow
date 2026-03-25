import { useState, useRef, useCallback, useEffect } from 'react';
import { BreathingGuide, BreathingPhase } from '../src/components/BreathingGuide';

export interface UseBreathingGuideResult {
  start: (techniqueId?: 'BOX' | '4-7-8' | 'DIAPHRAGMATIC') => void;
  stop: () => void;
  phase: BreathingPhase | null;
  isActive: boolean;
}

export function useBreathingGuide(): UseBreathingGuideResult {
  const [phase, setPhase] = useState<BreathingPhase | null>(null);
  const [isActive, setIsActive] = useState(false);
  const guideRef = useRef<BreathingGuide | null>(null);
  const sessionIdRef = useRef<string>('breathing-session');

  const stop = useCallback(() => {
    if (guideRef.current) {
      guideRef.current.stopExercise(sessionIdRef.current);
    }
    setIsActive(false);
    setPhase(null);
  }, []);

  const start = useCallback(
    (techniqueId: 'BOX' | '4-7-8' | 'DIAPHRAGMATIC' = 'BOX') => {
      // Stop any existing session first
      if (guideRef.current) {
        guideRef.current.stopExercise(sessionIdRef.current);
      }

      const guide = new BreathingGuide({
        onPhaseTransition: (_sessionId, newPhase) => {
          setPhase(newPhase);
        },
        onComplete: () => {
          setIsActive(false);
          setPhase(null);
        },
        onStopped: () => {
          setIsActive(false);
          setPhase(null);
        },
      });

      guideRef.current = guide;

      const techniques = guide.listTechniques();
      const technique = techniques.find((t) => t.id === techniqueId);
      if (!technique) return;

      setIsActive(true);
      guide.startExercise(technique, sessionIdRef.current);
    },
    []
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (guideRef.current) {
        guideRef.current.stopExercise(sessionIdRef.current);
      }
    };
  }, []);

  return { start, stop, phase, isActive };
}
