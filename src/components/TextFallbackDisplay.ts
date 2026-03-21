// Feature: murf-ai-voice-integration
// TextFallbackDisplay: renders fallback text when TTS audio is unavailable.
// Requirements: 11.1, 11.2, 11.3

/**
 * Abstraction over a DOM element (or test double) that TextFallbackDisplay writes to.
 * Accepting this interface instead of a raw HTMLElement makes the component fully testable
 * without a browser environment.
 */
export interface FallbackDisplayAdapter {
  /** Set the text content to display */
  setText(text: string): void;
  /** Show or hide the element */
  setVisible(visible: boolean): void;
}

/**
 * TextFallbackDisplay renders the TTS response text on screen when audio synthesis is
 * unavailable, and removes it once audio resumes.
 *
 * - `show(text)` is synchronous and completes well within the 200 ms budget (Req 11.1).
 * - `hide()` clears the text and hides the element (Req 11.3).
 */
export class TextFallbackDisplay {
  private currentText: string = '';
  private visible: boolean = false;

  constructor(private readonly adapter: FallbackDisplayAdapter) {}

  /**
   * Renders `text` visibly in the UI.
   * Synchronous — completes in O(1) time, satisfying the ≤ 200 ms requirement (Req 11.1).
   */
  show(text: string): void {
    this.currentText = text;
    this.visible = true;
    this.adapter.setText(text);
    this.adapter.setVisible(true);
  }

  /**
   * Removes the fallback text when audio becomes available again (Req 11.3).
   */
  hide(): void {
    this.currentText = '';
    this.visible = false;
    this.adapter.setText('');
    this.adapter.setVisible(false);
  }

  /** Returns the currently displayed text (useful for testing). */
  getText(): string {
    return this.currentText;
  }

  /** Returns whether the fallback is currently visible (useful for testing). */
  isVisible(): boolean {
    return this.visible;
  }
}
