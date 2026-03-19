// Feature: wellflow-voice-wellness-assistant
// Tests for Stress Relief feature in ConversationEngine — Requirements 7.1–7.5

import { ConversationEngine } from './ConversationEngine';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Property 17: Stress relief technique options (Task 14.2)
// Feature: wellflow-voice-wellness-assistant, Property 17: Stress relief technique options
// Validates: Requirements 7.1
// ---------------------------------------------------------------------------

describe('ConversationEngine — Property 17: Stress relief technique options', () => {
  it('STRESS_RELIEF response mentions at least 3 techniques', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('I feel stressed', 'help me relax', 'I am anxious', 'anxiety relief'),
        async (input) => {
          const engine = new ConversationEngine();
          const response = await engine.processInput(input, 'session-1');

          expect(response.intent.type).toBe('STRESS_RELIEF');
          const text = response.responseText.toLowerCase();
          // Must mention at least 3 techniques
          const techniques = [
            'progressive muscle relaxation',
            'grounding',
            'affirmation',
          ];
          const mentioned = techniques.filter((t) => text.includes(t));
          expect(mentioned.length).toBeGreaterThanOrEqual(3);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 18: Stress rating personalization (Task 14.3)
// Feature: wellflow-voice-wellness-assistant, Property 18: Stress rating personalization
// Validates: Requirements 7.5
// ---------------------------------------------------------------------------

describe('ConversationEngine — Property 18: Stress rating personalization', () => {
  it('stress ratings added via addStressRating are stored in context', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
        (ratings) => {
          const engine = new ConversationEngine();
          const sessionId = 'session-stress';

          for (const r of ratings) {
            engine.addStressRating(sessionId, r);
          }

          const context = engine.getContext(sessionId);
          expect(context.stressRatings).toEqual(ratings);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests for stress relief
// ---------------------------------------------------------------------------

describe('ConversationEngine — stress relief unit tests', () => {
  it('classifies "I feel stressed" as STRESS_RELIEF', async () => {
    const engine = new ConversationEngine();
    const response = await engine.processInput('I feel stressed', 'sid');
    expect(response.intent.type).toBe('STRESS_RELIEF');
  });

  it('response text includes progressive muscle relaxation', async () => {
    const engine = new ConversationEngine();
    const response = await engine.processInput('help me relax', 'sid');
    expect(response.responseText.toLowerCase()).toContain('progressive muscle relaxation');
  });

  it('response text includes grounding exercises', async () => {
    const engine = new ConversationEngine();
    const response = await engine.processInput('I am anxious', 'sid');
    expect(response.responseText.toLowerCase()).toContain('grounding');
  });

  it('response text includes positive affirmations', async () => {
    const engine = new ConversationEngine();
    const response = await engine.processInput('I feel stressed', 'sid');
    expect(response.responseText.toLowerCase()).toContain('affirmation');
  });
});
