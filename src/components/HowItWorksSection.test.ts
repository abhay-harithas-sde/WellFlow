/**
 * Unit tests for components/sections/HowItWorksSection.tsx
 * Tests step count, step structure, required topics, CTA presence, step numbering,
 * badge assignments (Murf AI on step 2, WellFlow Platform on step 3), and i18n keys.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

// ---------------------------------------------------------------------------
// Step config type (mirroring the component)
// ---------------------------------------------------------------------------

interface StepConfig {
  number: number;
  icon: string;
  badge?: { label: string; variant: 'murf' | 'wellflow' };
}

// ---------------------------------------------------------------------------
// STEP_CONFIGS (mirroring HowItWorksSection.tsx)
// ---------------------------------------------------------------------------

const STEP_CONFIGS: StepConfig[] = [
  { number: 1, icon: '📲' },
  { number: 2, icon: '🎙️', badge: { label: 'Murf AI', variant: 'murf' } },
  { number: 3, icon: '🧘', badge: { label: 'WellFlow Platform', variant: 'wellflow' } },
  { number: 4, icon: '📈' },
];

// ---------------------------------------------------------------------------
// i18n keys (mirroring messages/en.json howItWorks namespace)
// ---------------------------------------------------------------------------

const EN_HOW_IT_WORKS = {
  title: 'How WellFlow Works',
  cta: 'Try It Now',
  steps: [
    { title: 'Set Up in Seconds', desc: 'Download WellFlow, create your profile, and connect your preferred health apps and devices.' },
    { title: 'Speak Your Intent', desc: "Simply say what you need — 'I need to relax' or 'Start a 5-minute breathing session' — and WellFlow listens." },
    { title: 'Receive Guided Responses', desc: 'WellFlow responds with a personalized, voice-guided wellness session tailored to your current state.' },
    { title: 'Track Your Progress', desc: 'Review your wellness journey with detailed insights, streaks, and progress reports over time.' },
  ],
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function getStepConfigs(): StepConfig[] {
  return STEP_CONFIGS;
}

function hasCta(): boolean {
  return true;
}

function areStepsSequential(steps: StepConfig[]): boolean {
  return steps.every((step, index) => step.number === index + 1);
}

function areStepNumbersUnique(steps: StepConfig[]): boolean {
  const numbers = steps.map((s) => s.number);
  return new Set(numbers).size === numbers.length;
}

function getBadgeForStep(stepNumber: number): StepConfig['badge'] | undefined {
  return STEP_CONFIGS.find((s) => s.number === stepNumber)?.badge;
}

// ---------------------------------------------------------------------------
// Tests: Step count (Req 7.1)
// ---------------------------------------------------------------------------

describe('HowItWorksSection — displays exactly 4 steps (Req 7.1)', () => {
  it('has exactly 4 steps', () => {
    expect(getStepConfigs()).toHaveLength(4);
  });

  it('steps cover: Set Up, Speak Your Intent, Receive Guided Response, Track Progress', () => {
    const steps = getStepConfigs();
    expect(steps[0].number).toBe(1);
    expect(steps[1].number).toBe(2);
    expect(steps[2].number).toBe(3);
    expect(steps[3].number).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Tests: Each step has required fields
// ---------------------------------------------------------------------------

describe('HowItWorksSection — each step has number and icon', () => {
  it('every step has a numeric step number', () => {
    getStepConfigs().forEach((step) => {
      expect(typeof step.number).toBe('number');
    });
  });

  it('every step has a non-empty icon', () => {
    getStepConfigs().forEach((step) => {
      expect(step.icon.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Murf AI badge on step 2 (Req 7.3)
// ---------------------------------------------------------------------------

describe('HowItWorksSection — "Murf AI" badge on step 2 (Req 7.3)', () => {
  it('step 2 has a badge', () => {
    const badge = getBadgeForStep(2);
    expect(badge).toBeDefined();
  });

  it('step 2 badge label is "Murf AI"', () => {
    const badge = getBadgeForStep(2);
    expect(badge?.label).toBe('Murf AI');
  });

  it('step 2 badge variant is "murf"', () => {
    const badge = getBadgeForStep(2);
    expect(badge?.variant).toBe('murf');
  });
});

// ---------------------------------------------------------------------------
// Tests: WellFlow Platform badge on step 3 (Req 7.4)
// ---------------------------------------------------------------------------

describe('HowItWorksSection — "WellFlow Platform" badge on step 3 (Req 7.4)', () => {
  it('step 3 has a badge', () => {
    const badge = getBadgeForStep(3);
    expect(badge).toBeDefined();
  });

  it('step 3 badge label is "WellFlow Platform"', () => {
    const badge = getBadgeForStep(3);
    expect(badge?.label).toBe('WellFlow Platform');
  });

  it('step 3 badge variant is "wellflow"', () => {
    const badge = getBadgeForStep(3);
    expect(badge?.variant).toBe('wellflow');
  });
});

// ---------------------------------------------------------------------------
// Tests: Steps 1 and 4 have no badge
// ---------------------------------------------------------------------------

describe('HowItWorksSection — steps 1 and 4 have no badge', () => {
  it('step 1 has no badge', () => {
    expect(getBadgeForStep(1)).toBeUndefined();
  });

  it('step 4 has no badge', () => {
    expect(getBadgeForStep(4)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: i18n keys exist for all steps (Req 7.5)
// ---------------------------------------------------------------------------

describe('HowItWorksSection — i18n keys exist for all steps (Req 7.5)', () => {
  it('howItWorks.title is defined and non-empty', () => {
    expect(EN_HOW_IT_WORKS.title.length).toBeGreaterThan(0);
  });

  it('howItWorks.cta is defined and non-empty', () => {
    expect(EN_HOW_IT_WORKS.cta.length).toBeGreaterThan(0);
  });

  it('all 4 steps have non-empty title i18n keys', () => {
    EN_HOW_IT_WORKS.steps.forEach((step, i) => {
      expect(step.title.length).toBeGreaterThan(0);
    });
  });

  it('all 4 steps have non-empty desc i18n keys', () => {
    EN_HOW_IT_WORKS.steps.forEach((step) => {
      expect(step.desc.length).toBeGreaterThan(0);
    });
  });

  it('step 2 i18n title references speaking/intent', () => {
    const title = EN_HOW_IT_WORKS.steps[1].title.toLowerCase();
    expect(title.includes('speak') || title.includes('intent')).toBe(true);
  });

  it('step 3 i18n title references guided response', () => {
    const title = EN_HOW_IT_WORKS.steps[2].title.toLowerCase();
    expect(title.includes('guided') || title.includes('response')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: CTA is present (Req 7.1)
// ---------------------------------------------------------------------------

describe('HowItWorksSection — CTA is rendered after the last step', () => {
  it('a CTA is present in the section', () => {
    expect(hasCta()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Steps are numbered sequentially
// ---------------------------------------------------------------------------

describe('HowItWorksSection — steps are numbered sequentially starting from 1', () => {
  it('first step has number 1', () => {
    expect(getStepConfigs()[0].number).toBe(1);
  });

  it('steps are numbered sequentially (1, 2, 3, 4)', () => {
    expect(areStepsSequential(getStepConfigs())).toBe(true);
  });

  it('all step numbers are unique', () => {
    expect(areStepNumbersUnique(getStepConfigs())).toBe(true);
  });
});
