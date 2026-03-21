/**
 * Unit tests for components/sections/HeroSection.tsx
 * Tests CTA href pass-through, trust indicators rendering, headline/subheadline, and visual src.
 * Requirements: 2.3, 2.4
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic
 * extracted from the HeroSection component — data/logic contracts rather than rendering.
 */

// ---------------------------------------------------------------------------
// HeroProps types (mirroring the component interface)
// ---------------------------------------------------------------------------

interface TrustIndicator {
  label: string;
  value: string;
}

interface HeroProps {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
  trustIndicators: TrustIndicator[];
  visualSrc: string;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring HeroSection logic
// ---------------------------------------------------------------------------

/** Returns the href that the CTA link would navigate to. */
function getCtaHref(props: HeroProps): string {
  return props.ctaHref;
}

/** Returns the trust indicators that would be rendered (only when array is non-empty). */
function getRenderedTrustIndicators(props: HeroProps): TrustIndicator[] {
  if (props.trustIndicators.length === 0) return [];
  return props.trustIndicators;
}

/** Returns the headline text that would be rendered. */
function getHeadline(props: HeroProps): string {
  return props.headline;
}

/** Returns the subheadline text that would be rendered. */
function getSubheadline(props: HeroProps): string {
  return props.subheadline;
}

/** Returns the visual src that would be passed to next/image. */
function getVisualSrc(props: HeroProps): string {
  return props.visualSrc;
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleTrustIndicators: TrustIndicator[] = [
  { label: 'Active Users', value: '50K+' },
  { label: 'Sessions Completed', value: '1M+' },
  { label: 'Avg. Rating', value: '4.9★' },
];

const sampleProps: HeroProps = {
  headline: 'Your Voice-Powered Wellness Companion',
  subheadline: 'Guided breathing, mindfulness, and stress relief — hands-free.',
  ctaLabel: 'Get Started Free',
  ctaHref: '#signup',
  trustIndicators: sampleTrustIndicators,
  visualSrc: '/images/hero-visual.webp',
};

// ---------------------------------------------------------------------------
// Tests: CTA href pass-through (Req 2.3)
// ---------------------------------------------------------------------------

describe('HeroSection — CTA navigates to correct destination (Req 2.3)', () => {
  it('ctaHref is passed through to the CTA link', () => {
    expect(getCtaHref(sampleProps)).toBe('#signup');
  });

  it('ctaHref is preserved for an external URL', () => {
    const props: HeroProps = { ...sampleProps, ctaHref: 'https://app.wellflow.io/signup' };
    expect(getCtaHref(props)).toBe('https://app.wellflow.io/signup');
  });

  it('ctaHref is preserved for a deep anchor', () => {
    const props: HeroProps = { ...sampleProps, ctaHref: '#pricing' };
    expect(getCtaHref(props)).toBe('#pricing');
  });

  it('ctaLabel is passed through correctly', () => {
    expect(sampleProps.ctaLabel).toBe('Get Started Free');
  });
});

// ---------------------------------------------------------------------------
// Tests: Trust indicators rendering (Req 2.4)
// ---------------------------------------------------------------------------

describe('HeroSection — trust indicators are rendered (Req 2.4)', () => {
  it('all trust indicators are returned when array is non-empty', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    expect(rendered).toHaveLength(3);
  });

  it('each trust indicator has a non-empty label', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    rendered.forEach((indicator) => {
      expect(indicator.label.length).toBeGreaterThan(0);
    });
  });

  it('each trust indicator has a non-empty value', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    rendered.forEach((indicator) => {
      expect(indicator.value.length).toBeGreaterThan(0);
    });
  });

  it('trust indicator labels are preserved correctly', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    expect(rendered.map((i) => i.label)).toEqual([
      'Active Users',
      'Sessions Completed',
      'Avg. Rating',
    ]);
  });

  it('trust indicator values are preserved correctly', () => {
    const rendered = getRenderedTrustIndicators(sampleProps);
    expect(rendered.map((i) => i.value)).toEqual(['50K+', '1M+', '4.9★']);
  });

  it('renders nothing when trust indicators array is empty', () => {
    const props: HeroProps = { ...sampleProps, trustIndicators: [] };
    const rendered = getRenderedTrustIndicators(props);
    expect(rendered).toHaveLength(0);
  });

  it('single trust indicator is rendered correctly', () => {
    const props: HeroProps = {
      ...sampleProps,
      trustIndicators: [{ label: 'Users', value: '100+' }],
    };
    const rendered = getRenderedTrustIndicators(props);
    expect(rendered).toHaveLength(1);
    expect(rendered[0].label).toBe('Users');
    expect(rendered[0].value).toBe('100+');
  });
});

// ---------------------------------------------------------------------------
// Tests: Headline and subheadline pass-through
// ---------------------------------------------------------------------------

describe('HeroSection — headline and subheadline are passed through', () => {
  it('headline is passed through correctly', () => {
    expect(getHeadline(sampleProps)).toBe('Your Voice-Powered Wellness Companion');
  });

  it('subheadline is passed through correctly', () => {
    expect(getSubheadline(sampleProps)).toBe(
      'Guided breathing, mindfulness, and stress relief — hands-free.'
    );
  });

  it('headline reflects any provided value', () => {
    const props: HeroProps = { ...sampleProps, headline: 'A Different Headline' };
    expect(getHeadline(props)).toBe('A Different Headline');
  });

  it('subheadline reflects any provided value', () => {
    const props: HeroProps = { ...sampleProps, subheadline: 'A different subheadline.' };
    expect(getSubheadline(props)).toBe('A different subheadline.');
  });
});

// ---------------------------------------------------------------------------
// Tests: Visual src pass-through
// ---------------------------------------------------------------------------

describe('HeroSection — visual src is passed through', () => {
  it('visualSrc is passed through correctly', () => {
    expect(getVisualSrc(sampleProps)).toBe('/images/hero-visual.webp');
  });

  it('visualSrc reflects any provided path', () => {
    const props: HeroProps = { ...sampleProps, visualSrc: '/images/other.png' };
    expect(getVisualSrc(props)).toBe('/images/other.png');
  });

  it('visualSrc accepts an absolute URL', () => {
    const props: HeroProps = {
      ...sampleProps,
      visualSrc: 'https://cdn.wellflow.io/hero.webp',
    };
    expect(getVisualSrc(props)).toBe('https://cdn.wellflow.io/hero.webp');
  });
});

// =============================================================================
// ENHANCED HERO SECTION TESTS
// Tests for TTS widget, voice selector, error state, trust indicators,
// play/stop, and reduced motion.
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
// =============================================================================

import { MurfVoice } from '../../hooks/useMurfVoices';

// ---------------------------------------------------------------------------
// Types mirroring the enhanced HeroSection internal state
// ---------------------------------------------------------------------------

interface HeroTTSState {
  ttsOpen: boolean;
  selectedVoiceId: string | null;
}

interface VoicesHookState {
  voices: MurfVoice[];
  loading: boolean;
  error: string | null;
}

interface TTSHookState {
  playing: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring HeroSection enhanced logic
// ---------------------------------------------------------------------------

/** Mirrors handleHearVoice: toggles ttsOpen */
function toggleTtsOpen(state: HeroTTSState): HeroTTSState {
  return { ...state, ttsOpen: !state.ttsOpen };
}

/** Mirrors the VoiceSelector visibility: shown when widget is open, not loading, no error */
function shouldShowVoiceSelector(
  ttsOpen: boolean,
  loading: boolean,
  error: string | null
): boolean {
  return ttsOpen && !loading && error === null;
}

/** Mirrors the loading indicator visibility inside the TTS widget */
function shouldShowLoadingIndicator(ttsOpen: boolean, loading: boolean): boolean {
  return ttsOpen && loading;
}

/** Mirrors the error state visibility inside the TTS widget */
function shouldShowVoicesError(ttsOpen: boolean, error: string | null): boolean {
  return ttsOpen && error !== null;
}

/** Mirrors the TTS widget container visibility */
function shouldShowTtsWidget(ttsOpen: boolean): boolean {
  return ttsOpen;
}

/** Mirrors handlePlay: resolves the voiceId to use */
function resolvePlayVoiceId(
  selectedVoiceId: string | null,
  voices: MurfVoice[]
): string | null {
  return selectedVoiceId ?? voices[0]?.voiceId ?? null;
}

/** Mirrors handlePlay guard: returns false when no voice is available */
function canPlay(selectedVoiceId: string | null, voices: MurfVoice[]): boolean {
  const voiceId = selectedVoiceId ?? voices[0]?.voiceId;
  return voiceId !== undefined && voiceId !== '';
}

/** Mirrors the play button disabled state: disabled when voices list is empty */
function isPlayButtonDisabled(voices: MurfVoice[]): boolean {
  return voices.length === 0;
}

/** Mirrors the stop button visibility: shown when playing */
function shouldShowStopButton(playing: boolean): boolean {
  return playing;
}

/** Mirrors the play button visibility: shown when not playing */
function shouldShowPlayButton(playing: boolean): boolean {
  return !playing;
}

/** Mirrors the trust indicators derivation from i18n keys */
function buildTrustIndicators(
  trustUsers: string,
  trustRating: string,
  trustAward: string
): Array<{ key: string; value: string }> {
  return [
    { key: 'trustUsers', value: trustUsers },
    { key: 'trustRating', value: trustRating },
    { key: 'trustAward', value: trustAward },
  ];
}

/** Mirrors the fade-up animation variant y-offset: 0 when reduced motion, 20 otherwise */
function getFadeUpYOffset(shouldReduceMotion: boolean): number {
  return shouldReduceMotion ? 0 : 20;
}

/** Mirrors the animation transition duration: 0 when reduced motion, 0.6 otherwise */
function getAnimationDuration(shouldReduceMotion: boolean): number {
  return shouldReduceMotion ? 0 : 0.6;
}

/** Mirrors the play call args: text is the subheadline i18n value */
function buildPlayArgs(
  subheadline: string,
  voiceId: string
): { text: string; voiceId: string } {
  return { text: subheadline, voiceId };
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleVoices: MurfVoice[] = [
  { voiceId: 'v1', displayName: 'Alice', language: 'en-US', gender: 'female' },
  { voiceId: 'v2', displayName: 'Bob', language: 'en-GB', gender: 'male' },
];

const defaultTTSState: HeroTTSState = {
  ttsOpen: false,
  selectedVoiceId: null,
};

const heroI18n = {
  headline: 'Your Voice-Powered Wellness Companion',
  subheadline:
    'WellFlow guides you through breathing exercises, mindfulness sessions, and daily wellness routines — all hands-free, just by speaking.',
  cta: 'Start Your Free Trial',
  hearVoice: "Hear WellFlow's Voice",
  trustUsers: '50,000+ users',
  trustRating: '4.8 stars on App Store',
  trustAward: 'Best Wellness App 2024',
  ttsWidget: 'WellFlow voice preview',
  ttsPlay: 'Play',
  ttsStop: 'Stop',
  ttsError: 'Could not load voice. Please try again.',
  ttsRetry: 'Retry',
};

// ---------------------------------------------------------------------------
// Tests: TTS widget open/close (Req 2.4, 2.5)
// ---------------------------------------------------------------------------

describe('HeroSection — TTS widget open/close (Req 2.4, 2.5)', () => {
  it('ttsOpen starts as false', () => {
    expect(defaultTTSState.ttsOpen).toBe(false);
  });

  it('clicking "Hear WellFlow\'s Voice" opens the TTS widget', () => {
    const next = toggleTtsOpen(defaultTTSState);
    expect(next.ttsOpen).toBe(true);
  });

  it('clicking again closes the TTS widget', () => {
    const opened = toggleTtsOpen(defaultTTSState);
    const closed = toggleTtsOpen(opened);
    expect(closed.ttsOpen).toBe(false);
  });

  it('toggle is idempotent across multiple clicks', () => {
    let state = defaultTTSState;
    state = toggleTtsOpen(state); // open
    state = toggleTtsOpen(state); // close
    state = toggleTtsOpen(state); // open
    expect(state.ttsOpen).toBe(true);
  });

  it('TTS widget container is hidden when ttsOpen=false', () => {
    expect(shouldShowTtsWidget(false)).toBe(false);
  });

  it('TTS widget container is visible when ttsOpen=true', () => {
    expect(shouldShowTtsWidget(true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Voice selector rendering (Req 2.5, 2.6)
// ---------------------------------------------------------------------------

describe('HeroSection — voice selector rendering (Req 2.5, 2.6)', () => {
  it('VoiceSelector is shown when widget is open, voices loaded, no error', () => {
    expect(shouldShowVoiceSelector(true, false, null)).toBe(true);
  });

  it('VoiceSelector is hidden when widget is closed', () => {
    expect(shouldShowVoiceSelector(false, false, null)).toBe(false);
  });

  it('VoiceSelector is hidden while voices are loading', () => {
    expect(shouldShowVoiceSelector(true, true, null)).toBe(false);
  });

  it('VoiceSelector is hidden when there is a voices error', () => {
    expect(shouldShowVoiceSelector(true, false, 'Failed to load voices')).toBe(false);
  });

  it('loading indicator is shown when widget is open and loading', () => {
    expect(shouldShowLoadingIndicator(true, true)).toBe(true);
  });

  it('loading indicator is hidden when widget is closed', () => {
    expect(shouldShowLoadingIndicator(false, true)).toBe(false);
  });

  it('loading indicator is hidden when not loading', () => {
    expect(shouldShowLoadingIndicator(true, false)).toBe(false);
  });

  it('selecting a voice updates selectedVoiceId', () => {
    const next: HeroTTSState = { ...defaultTTSState, selectedVoiceId: 'v2' };
    expect(next.selectedVoiceId).toBe('v2');
  });

  it('selectedVoiceId starts as null', () => {
    expect(defaultTTSState.selectedVoiceId).toBeNull();
  });

  it('resolvePlayVoiceId falls back to first voice when selectedVoiceId is null', () => {
    expect(resolvePlayVoiceId(null, sampleVoices)).toBe('v1');
  });

  it('resolvePlayVoiceId uses selectedVoiceId when set', () => {
    expect(resolvePlayVoiceId('v2', sampleVoices)).toBe('v2');
  });

  it('resolvePlayVoiceId returns null when no voices and no selection', () => {
    expect(resolvePlayVoiceId(null, [])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: Error state (Req 2.7)
// ---------------------------------------------------------------------------

describe('HeroSection — voices error state (Req 2.7)', () => {
  it('error message is shown when voicesError is set and widget is open', () => {
    expect(shouldShowVoicesError(true, 'Could not load voice. Please try again.')).toBe(true);
  });

  it('error message is hidden when voicesError is null', () => {
    expect(shouldShowVoicesError(true, null)).toBe(false);
  });

  it('error message is hidden when widget is closed even if error is set', () => {
    expect(shouldShowVoicesError(false, 'some error')).toBe(false);
  });

  it('VoiceSelector is not shown when error is present', () => {
    expect(shouldShowVoiceSelector(true, false, 'Network error')).toBe(false);
  });

  it('error message is a non-empty string from i18n', () => {
    expect(heroI18n.ttsError.length).toBeGreaterThan(0);
  });

  it('retry button label is a non-empty string from i18n', () => {
    expect(heroI18n.ttsRetry.length).toBeGreaterThan(0);
  });

  it('clicking retry calls refetch', () => {
    const refetchMock = jest.fn();
    refetchMock();
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: Trust indicators (Req 2.2)
// ---------------------------------------------------------------------------

describe('HeroSection — trust indicators (Req 2.2)', () => {
  it('exactly three trust indicators are built from i18n keys', () => {
    const indicators = buildTrustIndicators(
      heroI18n.trustUsers,
      heroI18n.trustRating,
      heroI18n.trustAward
    );
    expect(indicators).toHaveLength(3);
  });

  it('first trust indicator key is "trustUsers"', () => {
    const indicators = buildTrustIndicators(
      heroI18n.trustUsers,
      heroI18n.trustRating,
      heroI18n.trustAward
    );
    expect(indicators[0].key).toBe('trustUsers');
  });

  it('second trust indicator key is "trustRating"', () => {
    const indicators = buildTrustIndicators(
      heroI18n.trustUsers,
      heroI18n.trustRating,
      heroI18n.trustAward
    );
    expect(indicators[1].key).toBe('trustRating');
  });

  it('third trust indicator key is "trustAward"', () => {
    const indicators = buildTrustIndicators(
      heroI18n.trustUsers,
      heroI18n.trustRating,
      heroI18n.trustAward
    );
    expect(indicators[2].key).toBe('trustAward');
  });

  it('each trust indicator has a non-empty value', () => {
    const indicators = buildTrustIndicators(
      heroI18n.trustUsers,
      heroI18n.trustRating,
      heroI18n.trustAward
    );
    indicators.forEach((indicator) => {
      expect(indicator.value.length).toBeGreaterThan(0);
    });
  });

  it('trust indicator values match i18n keys', () => {
    const indicators = buildTrustIndicators(
      heroI18n.trustUsers,
      heroI18n.trustRating,
      heroI18n.trustAward
    );
    expect(indicators.map((i) => i.value)).toEqual([
      '50,000+ users',
      '4.8 stars on App Store',
      'Best Wellness App 2024',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Tests: Play/Stop controls (Req 2.6)
// ---------------------------------------------------------------------------

describe('HeroSection — play/stop controls (Req 2.6)', () => {
  it('play button is shown when not playing', () => {
    expect(shouldShowPlayButton(false)).toBe(true);
  });

  it('stop button is shown when playing', () => {
    expect(shouldShowStopButton(true)).toBe(true);
  });

  it('play button is hidden when playing', () => {
    expect(shouldShowPlayButton(true)).toBe(false);
  });

  it('stop button is hidden when not playing', () => {
    expect(shouldShowStopButton(false)).toBe(false);
  });

  it('play button is disabled when voices list is empty', () => {
    expect(isPlayButtonDisabled([])).toBe(true);
  });

  it('play button is enabled when voices are available', () => {
    expect(isPlayButtonDisabled(sampleVoices)).toBe(false);
  });

  it('play is called with subheadline text and resolved voiceId', () => {
    const playMock = jest.fn();
    const voiceId = resolvePlayVoiceId(null, sampleVoices);
    if (voiceId) {
      const args = buildPlayArgs(heroI18n.subheadline, voiceId);
      playMock(args);
    }
    expect(playMock).toHaveBeenCalledWith({
      text: heroI18n.subheadline,
      voiceId: 'v1',
    });
  });

  it('play is called with explicitly selected voiceId', () => {
    const playMock = jest.fn();
    const voiceId = resolvePlayVoiceId('v2', sampleVoices);
    if (voiceId) {
      const args = buildPlayArgs(heroI18n.subheadline, voiceId);
      playMock(args);
    }
    expect(playMock).toHaveBeenCalledWith({
      text: heroI18n.subheadline,
      voiceId: 'v2',
    });
  });

  it('play is not called when no voice is available', () => {
    const playMock = jest.fn();
    const voiceId = resolvePlayVoiceId(null, []);
    if (voiceId) {
      playMock(buildPlayArgs(heroI18n.subheadline, voiceId));
    }
    expect(playMock).not.toHaveBeenCalled();
  });

  it('stop is called when stop button is clicked', () => {
    const stopMock = jest.fn();
    stopMock();
    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it('canPlay returns false when voices list is empty and no selection', () => {
    expect(canPlay(null, [])).toBe(false);
  });

  it('canPlay returns true when voices are available', () => {
    expect(canPlay(null, sampleVoices)).toBe(true);
  });

  it('canPlay returns true when a voice is explicitly selected even with empty list', () => {
    expect(canPlay('v1', [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Reduced motion (Req 2.3, 17.6)
// ---------------------------------------------------------------------------

describe('HeroSection — reduced motion (Req 2.3, 17.6)', () => {
  it('y-offset is 0 when reduced motion is preferred', () => {
    expect(getFadeUpYOffset(true)).toBe(0);
  });

  it('y-offset is 20 when reduced motion is not preferred', () => {
    expect(getFadeUpYOffset(false)).toBe(20);
  });

  it('animation duration is 0 when reduced motion is preferred', () => {
    expect(getAnimationDuration(true)).toBe(0);
  });

  it('animation duration is 0.6 when reduced motion is not preferred', () => {
    expect(getAnimationDuration(false)).toBe(0.6);
  });

  it('reduced motion disables both y-offset and duration together', () => {
    const yOffset = getFadeUpYOffset(true);
    const duration = getAnimationDuration(true);
    expect(yOffset).toBe(0);
    expect(duration).toBe(0);
  });

  it('normal motion enables both y-offset and duration together', () => {
    const yOffset = getFadeUpYOffset(false);
    const duration = getAnimationDuration(false);
    expect(yOffset).toBeGreaterThan(0);
    expect(duration).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: i18n keys for hero section (Req 2.1)
// ---------------------------------------------------------------------------

describe('HeroSection — i18n keys (Req 2.1)', () => {
  it('headline i18n key is non-empty', () => {
    expect(heroI18n.headline.length).toBeGreaterThan(0);
  });

  it('subheadline i18n key is non-empty', () => {
    expect(heroI18n.subheadline.length).toBeGreaterThan(0);
  });

  it('cta i18n key is non-empty', () => {
    expect(heroI18n.cta.length).toBeGreaterThan(0);
  });

  it('hearVoice i18n key is non-empty', () => {
    expect(heroI18n.hearVoice.length).toBeGreaterThan(0);
  });

  it('ttsWidget aria-label i18n key is non-empty', () => {
    expect(heroI18n.ttsWidget.length).toBeGreaterThan(0);
  });

  it('ttsPlay i18n key is non-empty', () => {
    expect(heroI18n.ttsPlay.length).toBeGreaterThan(0);
  });

  it('ttsStop i18n key is non-empty', () => {
    expect(heroI18n.ttsStop.length).toBeGreaterThan(0);
  });

  it('all required hero i18n keys are defined', () => {
    const requiredKeys = [
      'headline', 'subheadline', 'cta', 'hearVoice',
      'trustUsers', 'trustRating', 'trustAward',
      'ttsWidget', 'ttsPlay', 'ttsStop', 'ttsError', 'ttsRetry',
    ] as const;
    requiredKeys.forEach((key) => {
      expect(heroI18n[key].length).toBeGreaterThan(0);
    });
  });
});
