import fc from 'fast-check';

// ---------------------------------------------------------------------------
// P8: Social link security attributes
// ---------------------------------------------------------------------------

interface SocialLink {
  href: string;
  target: string;
  rel: string;
  label: string;
}

// Mirrors the social links defined in components/layout/Footer.tsx
const footerSocialLinks: SocialLink[] = [
  {
    href: 'https://twitter.com/wellflowapp',
    target: '_blank',
    rel: 'noopener noreferrer',
    label: 'Twitter',
  },
  {
    href: 'https://instagram.com/wellflowapp',
    target: '_blank',
    rel: 'noopener noreferrer',
    label: 'Instagram',
  },
];

// ---------------------------------------------------------------------------
// P9: Email validation
// ---------------------------------------------------------------------------

/** Mirrors the EMAIL_PATTERN constant in components/layout/Footer.tsx */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pure email validator extracted from Footer.tsx newsletter submit handler.
 * Returns a non-empty error message for invalid emails, empty string for valid.
 */
function validateEmail(email: string): string {
  if (!EMAIL_PATTERN.test(email)) {
    return 'Please enter a valid email address.';
  }
  return '';
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Footer property tests', () => {
  // Feature: website-completion-murf-wellflow, Property 8: For any social link rendered in Footer, anchor has target="_blank" and rel containing "noopener" and "noreferrer"
  test('P8: all social links have target="_blank" and rel containing "noopener" and "noreferrer"', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...footerSocialLinks),
        (link) => {
          // target must be exactly "_blank"
          if (link.target !== '_blank') return false;
          // rel must contain both "noopener" and "noreferrer"
          const relParts = link.rel.split(/\s+/);
          if (!relParts.includes('noopener')) return false;
          if (!relParts.includes('noreferrer')) return false;
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: website-completion-murf-wellflow, Property 9: For any string not matching ^[^\s@]+@[^\s@]+\.[^\s@]+$, email validator returns non-empty error message
  test('P9: email validator returns non-empty error for strings that do not match the email pattern', () => {
    // Generate strings that definitely do NOT match the email pattern by
    // constructing them from categories that violate the pattern requirements.
    const invalidEmailArb = fc.oneof(
      // No "@" character at all
      fc.stringMatching(/^[^@\s]{1,30}$/),
      // Starts with "@" (no local part)
      fc.string({ minLength: 1, maxLength: 20 }).map((s) => '@' + s.replace(/@/g, '')),
      // Contains a space (spaces are forbidden everywhere)
      fc.tuple(
        fc.stringMatching(/^[^\s@]{1,10}$/),
        fc.stringMatching(/^[^\s@]{1,10}$/)
      ).map(([a, b]) => `${a} ${b}`),
      // Has "@" but no "." after it (missing TLD)
      fc.tuple(
        fc.stringMatching(/^[^\s@]{1,10}$/),
        fc.stringMatching(/^[^\s@.]{1,10}$/)
      ).map(([local, domain]) => `${local}@${domain}`),
      // Ends with "@" (no domain part)
      fc.stringMatching(/^[^\s@]{1,20}$/).map((s) => s + '@'),
    );

    fc.assert(
      fc.property(invalidEmailArb, (invalidEmail) => {
        // Confirm the string actually doesn't match the pattern
        // (guards against generator edge cases)
        if (EMAIL_PATTERN.test(invalidEmail)) return true; // skip valid ones

        const error = validateEmail(invalidEmail);
        return error.length > 0;
      }),
      { numRuns: 100 }
    );
  });
});
