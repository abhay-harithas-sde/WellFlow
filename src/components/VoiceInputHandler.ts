// Feature: wellflow-voice-wellness-assistant
// VoiceInputHandler: captures microphone audio, performs VAD, forwards transcript (Requirements 1.1–1.5)

import { MicrophoneError } from '../types';

export interface VoiceInputHandlerCallbacks {
  onSpeechStart: () => void;
  onSpeechEnd: (transcript: string) => void;
  onError: (error: MicrophoneError) => void;
}

// Minimal Web Speech API types (avoids DOM lib dependency)
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}
interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionFactory = () => ISpeechRecognition;

export class VoiceInputHandler {
  private recognition: ISpeechRecognition | null = null;
  private _active = false;
  private _textFallbackMode = false;

  constructor(
    private readonly callbacks: VoiceInputHandlerCallbacks,
    private readonly recognitionFactory?: SpeechRecognitionFactory,
  ) {}

  get isActive(): boolean { return this._active; }
  get textFallbackMode(): boolean { return this._textFallbackMode; }

  /**
   * Requests mic permission and begins voice activity detection.
   * Requirement 1.1: capture audio from the user's microphone.
   * Requirement 1.2: start capturing within 200ms of voice activity detection.
   */
  async start(): Promise<void> {
    if (this._active) return;

    const factory = this.recognitionFactory ?? this._defaultFactory();
    if (!factory) {
      this._handleError('DEVICE_UNAVAILABLE');
      return;
    }

    try {
      const recognition = factory();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        this._active = true;
        // Req 1.2: fire onSpeechStart within 200ms of voice activity
        this.callbacks.onSpeechStart();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            // Req 1.3: forward transcript within 500ms of silence detection
            this.callbacks.onSpeechEnd(transcript);
          }
        }
      };

      recognition.onerror = (event: { error: string }) => {
        const err = this._mapError(event.error);
        this._handleError(err);
      };

      recognition.onend = () => {
        this._active = false;
      };

      this.recognition = recognition;
      recognition.start();
    } catch {
      this._handleError('CAPTURE_FAILED');
    }
  }

  /**
   * Stops audio capture.
   */
  stop(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this._active = false;
  }

  /**
   * Accepts typed text input when text fallback mode is active.
   * Requirement 11.1, 11.2: text-based fallback interface.
   */
  submitTextInput(text: string): void {
    if (this._textFallbackMode && text.trim()) {
      this.callbacks.onSpeechEnd(text.trim());
    }
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _handleError(error: MicrophoneError): void {
    this._active = false;
    this._textFallbackMode = true;
    this.callbacks.onError(error);
  }

  private _mapError(error: string): MicrophoneError {
    if (error === 'not-allowed') return 'PERMISSION_DENIED';
    if (error === 'no-speech' || error === 'audio-capture') return 'DEVICE_UNAVAILABLE';
    return 'CAPTURE_FAILED';
  }

  private _defaultFactory(): SpeechRecognitionFactory | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    const Ctor = g.SpeechRecognition ?? g.webkitSpeechRecognition;
    if (!Ctor) return null;
    return () => new Ctor() as ISpeechRecognition;
  }
}
