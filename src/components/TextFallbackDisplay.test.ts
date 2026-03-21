// Feature: murf-ai-voice-integration
// Unit tests for TextFallbackDisplay
// Requirements: 11.1, 11.3

import { TextFallbackDisplay, FallbackDisplayAdapter } from './TextFallbackDisplay';

/** In-memory test double for FallbackDisplayAdapter */
function makeAdapter(): FallbackDisplayAdapter & { text: string; visible: boolean } {
  const state = { text: '', visible: false };
  return {
    get text() { return state.text; },
    get visible() { return state.visible; },
    setText(t: string) { state.text = t; },
    setVisible(v: boolean) { state.visible = v; },
  };
}

describe('TextFallbackDisplay', () => {
  describe('show()', () => {
    it('makes text visible synchronously (within 200 ms budget)', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      const before = Date.now();
      display.show('Please breathe slowly.');
      const elapsed = Date.now() - before;

      expect(adapter.visible).toBe(true);
      expect(adapter.text).toBe('Please breathe slowly.');
      expect(elapsed).toBeLessThan(200);
    });

    it('updates the adapter text to the provided string', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('Take a deep breath.');

      expect(adapter.text).toBe('Take a deep breath.');
    });

    it('reports isVisible() as true after show()', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('Hello');

      expect(display.isVisible()).toBe(true);
    });

    it('stores the displayed text accessible via getText()', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('Mindfulness moment');

      expect(display.getText()).toBe('Mindfulness moment');
    });

    it('overwrites previous text when called again', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('First message');
      display.show('Second message');

      expect(adapter.text).toBe('Second message');
      expect(display.getText()).toBe('Second message');
    });
  });

  describe('hide()', () => {
    it('removes the fallback text from the adapter', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('Some guidance text');
      display.hide();

      expect(adapter.text).toBe('');
    });

    it('sets the adapter to not visible', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('Some guidance text');
      display.hide();

      expect(adapter.visible).toBe(false);
    });

    it('reports isVisible() as false after hide()', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('Hello');
      display.hide();

      expect(display.isVisible()).toBe(false);
    });

    it('is safe to call when already hidden (no-op)', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      expect(() => display.hide()).not.toThrow();
      expect(adapter.visible).toBe(false);
      expect(adapter.text).toBe('');
    });
  });

  describe('show() followed by hide()', () => {
    it('leaves no residual text in the adapter', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('Residual text check');
      display.hide();

      expect(adapter.text).toBe('');
      expect(adapter.visible).toBe(false);
    });

    it('leaves getText() empty after hide()', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('Some text');
      display.hide();

      expect(display.getText()).toBe('');
    });

    it('can show again after hide without issues', () => {
      const adapter = makeAdapter();
      const display = new TextFallbackDisplay(adapter);

      display.show('First');
      display.hide();
      display.show('Second');

      expect(adapter.text).toBe('Second');
      expect(adapter.visible).toBe(true);
    });
  });
});
