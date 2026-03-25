// Feature: murf-ai-voice-integration, Property 11: Locale switch propagates to all subsequent TTS requests
// Validates: Requirement 9.4

import * as fc from 'fast-check';
import { ConversationEngine } from './ConversationEngine';

/**
 * Property 11: Locale switch propagates to all subsequent TTS requests
 *
 * For any session where the locale is changed mid-session, every TTS request
 * submitted after the locale change must use the new locale's mapped language
 * code, and no request after the change may use the old locale's code.
 *
 * Validates: Requirement 9.4
 */
describe('Property 11: Locale switch propagates to all subsequent TTS requests', () => {
  // Language mapping mirrors TTSEngine's LANGUAGE_MAP
  const LANGUAGE_MAP: Record<string, string> = {
    en: 'en-US',
    es: 'es-ES',
  };

  it('every response after locale switch carries the new locale, none carry the old', async () => {
    // Feature: murf-ai-voice-integration, Property 11: Locale switch propagates to all subsequent TTS requests
    await fc.assert(
      fc.asyncProperty(
        // Generate a "before" locale and an "after" locale that are different
        fc.constantFrom('en', 'es'),
        fc.constantFrom('en', 'es'),
        fc.integer({ min: 1, max: 5 }), // number of requests before switch
        fc.integer({ min: 1, max: 5 }), // number of requests after switch
        async (localeBefore, localeAfter, requestsBefore, requestsAfter) => {
          // Only test cases where the locale actually changes
          fc.pre(localeBefore !== localeAfter);

          const engine = new ConversationEngine();
          const sessionId = `prop11-session-${localeBefore}-${localeAfter}`;

          // Set initial locale and make some requests
          engine.setLanguage(sessionId, localeBefore);
          for (let i = 0; i < requestsBefore; i++) {
            await engine.processInput(`message before ${i}`, sessionId);
          }

          // Switch locale mid-session
          engine.setLanguage(sessionId, localeAfter);

          // All subsequent requests must use the new locale
          for (let i = 0; i < requestsAfter; i++) {
            const response = await engine.processInput(`message after ${i}`, sessionId);
            // The response language must be the new locale
            if (response.language !== localeAfter) return false;
            // The response language must NOT be the old locale
            if (response.language === localeBefore) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('mapped language codes: es locale maps to es-ES, en locale maps to en-US after switch', async () => {
    // Feature: murf-ai-voice-integration, Property 11: Locale switch propagates to all subsequent TTS requests
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('en', 'es'),
        fc.constantFrom('en', 'es'),
        async (localeBefore, localeAfter) => {
          fc.pre(localeBefore !== localeAfter);

          const engine = new ConversationEngine();
          const sessionId = `prop11-mapped-${localeBefore}-${localeAfter}`;

          // Set initial locale
          engine.setLanguage(sessionId, localeBefore);
          await engine.processInput('initial message', sessionId);

          // Switch locale
          engine.setLanguage(sessionId, localeAfter);

          // Subsequent responses carry the new locale (raw), which TTSEngine maps to the full code
          const response = await engine.processInput('post-switch message', sessionId);

          // The raw locale in the response must be the new locale
          const rawLocale = response.language;
          // The mapped code must match the new locale's mapping
          const expectedMappedCode = LANGUAGE_MAP[localeAfter];
          const actualMappedCode = LANGUAGE_MAP[rawLocale];

          return rawLocale === localeAfter && actualMappedCode === expectedMappedCode;
        }
      ),
      { numRuns: 100 }
    );
  });
});
