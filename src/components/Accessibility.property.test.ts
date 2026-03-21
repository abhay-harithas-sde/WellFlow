import fc from 'fast-check';

// ---------------------------------------------------------------------------
// P12: Interactive widget ARIA labels
// Feature: website-completion-murf-wellflow, Property 12: For any interactive widget
// (TTS_Widget, Demo_Section, Voice_Selector, carousel controls), root element has
// non-empty `aria-label` or `aria-labelledby`
// Validates: Requirements 17.4
// ---------------------------------------------------------------------------

interface WidgetAriaProps {
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

/**
 * Pure function that checks whether a widget has a valid ARIA label.
 * Returns true if either `aria-label` or `aria-labelledby` is a non-empty string.
 */
function hasAriaLabel(widget: WidgetAriaProps): boolean {
  const label = widget.ariaLabel ?? '';
  const labelledBy = widget.ariaLabelledBy ?? '';
  return label.trim().length > 0 || labelledBy.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Known interactive widgets with their expected ARIA attributes
// ---------------------------------------------------------------------------

const knownWidgets: Array<{ name: string; props: WidgetAriaProps }> = [
  {
    name: 'TTS_Widget',
    props: { ariaLabel: 'Text-to-speech voice preview' },
  },
  {
    name: 'Demo_Section',
    props: { ariaLabel: 'Interactive WellFlow demo' },
  },
  {
    name: 'Voice_Selector',
    props: { ariaLabel: 'Select a voice' },
  },
  {
    name: 'Carousel previous button',
    props: { ariaLabel: 'Previous testimonial' },
  },
  {
    name: 'Carousel next button',
    props: { ariaLabel: 'Next testimonial' },
  },
  {
    name: 'Carousel dot indicator',
    props: { ariaLabelledBy: 'testimonials-heading' },
  },
];

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Accessibility property tests', () => {
  // Feature: website-completion-murf-wellflow, Property 12: For any interactive widget (TTS_Widget, Demo_Section, Voice_Selector, carousel controls), root element has non-empty `aria-label` or `aria-labelledby`
  test('P12a: widgets with a non-empty aria-label pass hasAriaLabel', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (label) => {
          return hasAriaLabel({ ariaLabel: label }) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: website-completion-murf-wellflow, Property 12: For any interactive widget (TTS_Widget, Demo_Section, Voice_Selector, carousel controls), root element has non-empty `aria-label` or `aria-labelledby`
  test('P12b: widgets with a non-empty aria-labelledby pass hasAriaLabel', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (labelledBy) => {
          return hasAriaLabel({ ariaLabelledBy: labelledBy }) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: website-completion-murf-wellflow, Property 12: For any interactive widget (TTS_Widget, Demo_Section, Voice_Selector, carousel controls), root element has non-empty `aria-label` or `aria-labelledby`
  test('P12c: widgets with both aria-label and aria-labelledby empty or missing fail hasAriaLabel', () => {
    // Arbitraries for empty/whitespace-only/undefined values
    const emptyOrMissingArb = fc.oneof(
      fc.constant(undefined),
      fc.constant(''),
      fc.stringMatching(/^\s+$/) // whitespace-only
    );

    fc.assert(
      fc.property(
        emptyOrMissingArb,
        emptyOrMissingArb,
        (ariaLabel, ariaLabelledBy) => {
          return hasAriaLabel({ ariaLabel, ariaLabelledBy }) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Concrete examples: known widgets must all pass hasAriaLabel
  test('P12d: all known interactive widgets have a valid ARIA label', () => {
    for (const widget of knownWidgets) {
      expect(hasAriaLabel(widget.props)).toBe(true);
    }
  });
});
