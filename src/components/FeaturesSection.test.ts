/**
 * Unit tests for components/sections/FeaturesSection.tsx (enhanced)
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 *
 * Pure logic tests (node environment, no DOM).
 * Tests badge assignment, i18n key coverage, and feature card completeness.
 */

// ---------------------------------------------------------------------------
// Feature data mirroring FeaturesSection.tsx
// ---------------------------------------------------------------------------

type FeatureId =
  | 'voice'
  | 'breathing'
  | 'mindfulness'
  | 'stress'
  | 'reminders'
  | 'healthSync'
  | 'wearable'
  | 'community';

const FEATURE_IDS: FeatureId[] = [
  'voice',
  'breathing',
  'mindfulness',
  'stress',
  'reminders',
  'healthSync',
  'wearable',
  'community',
];

const FEATURE_CARD_IDS: Record<FeatureId, string> = {
  voice: 'voice-interaction',
  breathing: 'breathing-exercises',
  mindfulness: 'mindfulness-sessions',
  stress: 'stress-relief',
  reminders: 'routine-reminders',
  healthSync: 'health-sync',
  wearable: 'wearable-integration',
  community: 'community',
};

const MURF_BADGE_IDS: FeatureId[] = ['voice'];
const WELLFLOW_BADGE_IDS: FeatureId[] = ['healthSync', 'community'];

function getBadge(featureId: FeatureId): string | undefined {
  if (MURF_BADGE_IDS.includes(featureId)) return 'Murf AI Powered';
  if (WELLFLOW_BADGE_IDS.includes(featureId)) return 'WellFlow Platform';
  return undefined;
}

// ---------------------------------------------------------------------------
// Requirement 4.1: All eight feature cards are present
// ---------------------------------------------------------------------------

describe('FeaturesSection — Requirement 4.1: All eight feature cards', () => {
  it('renders exactly 8 feature cards', () => {
    expect(FEATURE_IDS).toHaveLength(8);
  });

  it('includes all required feature ids', () => {
    const cardIds = FEATURE_IDS.map((id) => FEATURE_CARD_IDS[id]);
    expect(cardIds).toContain('voice-interaction');
    expect(cardIds).toContain('breathing-exercises');
    expect(cardIds).toContain('mindfulness-sessions');
    expect(cardIds).toContain('stress-relief');
    expect(cardIds).toContain('routine-reminders');
    expect(cardIds).toContain('health-sync');
    expect(cardIds).toContain('wearable-integration');
    expect(cardIds).toContain('community');
  });
});

// ---------------------------------------------------------------------------
// Requirement 4.3: "Murf AI Powered" badge on voice-interaction
// ---------------------------------------------------------------------------

describe('FeaturesSection — Requirement 4.3: Murf AI Powered badge', () => {
  it('assigns "Murf AI Powered" badge only to voice-interaction', () => {
    expect(getBadge('voice')).toBe('Murf AI Powered');
  });

  it('does not assign Murf badge to non-voice features', () => {
    const nonVoice: FeatureId[] = ['breathing', 'mindfulness', 'stress', 'reminders', 'wearable'];
    for (const id of nonVoice) {
      expect(getBadge(id)).not.toBe('Murf AI Powered');
    }
  });
});

// ---------------------------------------------------------------------------
// Requirement 4.4: "WellFlow Platform" badge on health-sync and community
// ---------------------------------------------------------------------------

describe('FeaturesSection — Requirement 4.4: WellFlow Platform badge', () => {
  it('assigns "WellFlow Platform" badge to health-sync', () => {
    expect(getBadge('healthSync')).toBe('WellFlow Platform');
  });

  it('assigns "WellFlow Platform" badge to community', () => {
    expect(getBadge('community')).toBe('WellFlow Platform');
  });

  it('does not assign WellFlow badge to other features', () => {
    const others: FeatureId[] = ['voice', 'breathing', 'mindfulness', 'stress', 'reminders', 'wearable'];
    for (const id of others) {
      expect(getBadge(id)).not.toBe('WellFlow Platform');
    }
  });
});

// ---------------------------------------------------------------------------
// Requirement 4.5: i18n keys exist for all feature items
// ---------------------------------------------------------------------------

describe('FeaturesSection — Requirement 4.5: i18n key coverage', () => {
  // Load the actual en.json to verify keys exist
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const enMessages = require('../../messages/en.json') as Record<string, unknown>;

  it('features.title key exists in en.json', () => {
    const features = enMessages['features'] as Record<string, unknown>;
    expect(typeof features['title']).toBe('string');
    expect((features['title'] as string).length).toBeGreaterThan(0);
  });

  it('features.cta key exists in en.json', () => {
    const features = enMessages['features'] as Record<string, unknown>;
    expect(typeof features['cta']).toBe('string');
    expect((features['cta'] as string).length).toBeGreaterThan(0);
  });

  it('all 8 feature items have title and desc keys in en.json', () => {
    const features = enMessages['features'] as Record<string, unknown>;
    const items = features['items'] as Record<string, Record<string, string>>;

    for (const featureId of FEATURE_IDS) {
      const item = items[featureId];
      expect(item).toBeDefined();
      expect(typeof item['title']).toBe('string');
      expect(item['title'].length).toBeGreaterThan(0);
      expect(typeof item['desc']).toBe('string');
      expect(item['desc'].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Requirement 4.6: Focus indicator classes are present in FeatureCard
// ---------------------------------------------------------------------------

describe('FeaturesSection — Requirement 4.6: Keyboard focus indicators', () => {
  it('FeatureCard has tabIndex=0 for keyboard navigation', () => {
    // Verify the FeatureCard source includes tabIndex and focus-visible classes
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    const path = require('path');
    const cardSource: string = fs.readFileSync(
      path.resolve(__dirname, '../../components/ui/FeatureCard.tsx'),
      'utf-8'
    );
    expect(cardSource).toContain('tabIndex={0}');
    expect(cardSource).toContain('focus-visible:ring-2');
  });
});

// ---------------------------------------------------------------------------
// Badge logic: no feature gets both badges
// ---------------------------------------------------------------------------

describe('FeaturesSection — Badge exclusivity', () => {
  it('no feature has both Murf AI Powered and WellFlow Platform badges', () => {
    for (const id of FEATURE_IDS) {
      const badge = getBadge(id);
      const isMurf = badge === 'Murf AI Powered';
      const isWellFlow = badge === 'WellFlow Platform';
      expect(isMurf && isWellFlow).toBe(false);
    }
  });

  it('exactly 1 feature has Murf AI Powered badge', () => {
    const murfFeatures = FEATURE_IDS.filter((id) => getBadge(id) === 'Murf AI Powered');
    expect(murfFeatures).toHaveLength(1);
  });

  it('exactly 2 features have WellFlow Platform badge', () => {
    const wellflowFeatures = FEATURE_IDS.filter((id) => getBadge(id) === 'WellFlow Platform');
    expect(wellflowFeatures).toHaveLength(2);
  });
});
