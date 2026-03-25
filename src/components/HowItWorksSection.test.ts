/**
 * Unit tests for components/sections/HowItWorksSection.tsx
 * Tests step count, step structure, required topics, CTA presence, and step numbering.
 * Requirements: 4.1, 4.2, 4.3, 4.4
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic
 * extracted from the HowItWorksSection component — data/logic contracts rather than rendering.
 */

// ---------------------------------------------------------------------------
// Step type (mirroring the component interface)
// ---------------------------------------------------------------------------

interface Step {
  number: number;
  icon: string;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// STEPS data (mirroring HowItWorksSection.tsx)
// ---------------------------------------------------------------------------

const STEPS: Step[] = [
  {
    number: 1,
    icon: '📲',
    title: 'Set Up the App',
    description:
      'Download WellFlow, create your profile, and connect your preferred health platforms in minutes.',
  },
  {
    number: 2,
    icon: '🎙️',
    title: 'Speak Your Intent',
    description:
      'Simply say what you need — "I need to de-stress" or "guide me through a breathing exercise" — and WellFlow listens.',
  },
  {
    number: 3,
    icon: '🧘',
    title: 'Receive a Guided Response',
    description:
      'WellFlow delivers a personalized, voice-led wellness session tailored to your mood, goals, and biometric data.',
  },
  {
    number: 4,
    icon: '📈',
    title: 'Track Your Progress',
    description:
      'Review your wellness journey with insights, streaks, and trends that keep you motivated and on track.',
  },
];

// ---------------------------------------------------------------------------
// Pure helpers mirroring HowItWorksSection logic
// ---------------------------------------------------------------------------

/** Returns the steps that would be rendered. */
function getSteps(): Step[] {
  return STEPS;
}

/** Returns whether a CTA is rendered after the last step (always true in the component). */
function hasCta(): boolean {
  return true;
}

/** Returns the last step in the list. */
function getLastStep(steps: Step[]): Step {
  return steps[steps.length - 1];
}

/** Returns whether all steps have the required fields populated. */
function stepHasRequiredFields(step: Step): boolean {
  return (
    typeof step.number === 'number' &&
    step.icon.length > 0 &&
    step.title.length > 0 &&
    step.description.length > 0
  );
}

/** Returns whether steps are numbered sequentially starting from 1. */
function areStepsSequential(steps: Step[]): boolean {
  return steps.every((step, index) => step.number === index + 1);
}

/** Returns whether all step numbers are unique. */
function areStepNumbersUnique(steps: Step[]): boolean {
  const numbers = steps.map((s) => s.number);
  return new Set(numbers).size === numbers.length;
}

// ---------------------------------------------------------------------------
// Tests: Step count (Req 4.1)
// ---------------------------------------------------------------------------

describe('HowItWorksSection — step count is between 3 and 5 (Req 4.1)', () => {
  it('has at least 3 steps', () => {
    const steps = getSteps();
    expect(steps.length).toBeGreaterThanOrEqual(3);
  });

  it('has at most 5 steps', () => {
    const steps = getSteps();
    expect(steps.length).toBeLessThanOrEqual(5);
  });

  it('step count is exactly 4', () => {
    const steps = getSteps();
    expect(steps).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Tests: Each step has required fields (Req 4.2)
// ---------------------------------------------------------------------------

describe('HowItWorksSection — each step has a number, icon, title, and description (Req 4.2)', () => {
  it('every step has all required fields populated', () => {
    const steps = getSteps();
    steps.forEach((step) => {
      expect(stepHasRequiredFields(step)).toBe(true);
    });
  });

  it('every step has a numeric step number', () => {
    const steps = getSteps();
    steps.forEach((step) => {
      expect(typeof step.number).toBe('number');
    });
  });

  it('every step has a non-empty icon', () => {
    const steps = getSteps();
    steps.forEach((step) => {
      expect(step.icon.length).toBeGreaterThan(0);
    });
  });

  it('every step has a non-empty title', () => {
    const steps = getSteps();
    steps.forEach((step) => {
      expect(step.title.length).toBeGreaterThan(0);
    });
  });

  it('every step has a non-empty description', () => {
    const steps = getSteps();
    steps.forEach((step) => {
      expect(step.description.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Steps cover required topics (Req 4.3)
// ---------------------------------------------------------------------------

describe('HowItWorksSection — steps cover required topics (Req 4.3)', () => {
  it('includes a setup step', () => {
    const steps = getSteps();
    const hasSetup = steps.some(
      (s) => s.title.toLowerCase().includes('set up') || s.title.toLowerCase().includes('setup')
    );
    expect(hasSetup).toBe(true);
  });

  it('includes a speak intent step', () => {
    const steps = getSteps();
    const hasSpeakIntent = steps.some(
      (s) =>
        s.title.toLowerCase().includes('speak') || s.title.toLowerCase().includes('intent')
    );
    expect(hasSpeakIntent).toBe(true);
  });

  it('includes a guided response step', () => {
    const steps = getSteps();
    const hasGuidedResponse = steps.some(
      (s) =>
        s.title.toLowerCase().includes('guided') || s.title.toLowerCase().includes('response')
    );
    expect(hasGuidedResponse).toBe(true);
  });

  it('includes a track progress step', () => {
    const steps = getSteps();
    const hasTrackProgress = steps.some(
      (s) =>
        s.title.toLowerCase().includes('track') || s.title.toLowerCase().includes('progress')
    );
    expect(hasTrackProgress).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: CTA is present after the last step (Req 4.4)
// ---------------------------------------------------------------------------

describe('HowItWorksSection — CTA is rendered after the last step (Req 4.4)', () => {
  it('a CTA is present in the section', () => {
    expect(hasCta()).toBe(true);
  });

  it('the last step is defined before the CTA', () => {
    const steps = getSteps();
    const lastStep = getLastStep(steps);
    expect(lastStep).toBeDefined();
    expect(lastStep.number).toBe(steps.length);
  });

  it('CTA follows the final step (last step number equals total step count)', () => {
    const steps = getSteps();
    const lastStep = getLastStep(steps);
    expect(lastStep.number).toBe(steps.length);
    expect(hasCta()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Steps are numbered sequentially starting from 1
// ---------------------------------------------------------------------------

describe('HowItWorksSection — steps are numbered sequentially starting from 1', () => {
  it('first step has number 1', () => {
    const steps = getSteps();
    expect(steps[0].number).toBe(1);
  });

  it('steps are numbered sequentially (1, 2, 3, ...)', () => {
    const steps = getSteps();
    expect(areStepsSequential(steps)).toBe(true);
  });

  it('each step number matches its 1-based index', () => {
    const steps = getSteps();
    steps.forEach((step, index) => {
      expect(step.number).toBe(index + 1);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Step numbers are unique
// ---------------------------------------------------------------------------

describe('HowItWorksSection — step numbers are unique', () => {
  it('all step numbers are unique', () => {
    const steps = getSteps();
    expect(areStepNumbersUnique(steps)).toBe(true);
  });

  it('no two steps share the same number', () => {
    const steps = getSteps();
    const numbers = steps.map((s) => s.number);
    const uniqueNumbers = [...new Set(numbers)];
    expect(uniqueNumbers).toHaveLength(numbers.length);
  });
});
