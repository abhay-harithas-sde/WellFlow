// Feature: murf-ai-voice-integration
// WebSocketManager: manages WebSocket connections for real-time voice streaming (Requirements 4.1–4.6)

import { WebSocketError, CloseReason } from '../types';

// ------------------------------------------------------------------
// Logger interface (compatible with MurfLogger / TTSLogger)
// ------------------------------------------------------------------

export interface WsLogger {
  logWsError(code: number, reason: string, sessionId: string): void;
}

// ------------------------------------------------------------------
// Minimal DOM-type stubs (lib does not include DOM)
// ------------------------------------------------------------------

interface CloseEvent {
  wasClean: boolean;
  code: number;
  reason: string;
}

interface MessageEvent {
  data: unknown;
}

// Minimal WebSocket interface (avoids DOM lib dependency)
interface IWebSocket {
  binaryType: string;
  readyState: number;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send(data: string): void;
  close(): void;
}

const WS_OPEN = 1; // WebSocket.OPEN

// ------------------------------------------------------------------
// TTSRequest type
// ------------------------------------------------------------------

export interface TTSRequest {
  sessionId: string;
  text: string;
  voiceId?: string;
  language?: string;
  speed?: 'slow' | 'normal' | 'fast';
}

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const RECONNECT_DELAY_MS = 2_000;             // 2 seconds
const MAX_RETRIES = 3;

// ------------------------------------------------------------------
// WebSocketManager
// ------------------------------------------------------------------

/**
 * Manages a persistent WebSocket connection to the Murf Falcon TTS API.
 *
 * Design decisions for testability:
 * - Accepts an optional `wsFactory` so tests can inject a mock WebSocket.
 * - All timer IDs are stored so they can be cleared deterministically.
 */
export class WebSocketManager {
  // Callbacks set by the consumer
  public onAudioChunk: ((chunk: ArrayBuffer) => void) | null = null;
  public onError: ((error: WebSocketError) => void) | null = null;
  public onClose: ((reason: CloseReason) => void) | null = null;
  public onMaxRetriesExceeded: ((sessionId: string) => void) | null = null;

  // Per-session state
  private connections: Map<string, IWebSocket> = new Map();
  private connectedSessions: Set<string> = new Set();
  private inactivityTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Reconnection state (one active reconnect attempt at a time per session)
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  /** Whether we are currently in a reconnect cycle for a session */
  private reconnecting: Set<string> = new Set();
  public retryCount: number = 0;

  // The URL used when opening connections (can be overridden in tests)
  private readonly wsUrl: string;

  // Factory for creating WebSocket instances (injectable for tests)
  private readonly wsFactory: (url: string) => IWebSocket;

  // Optional logger for observability (Requirement 13.2)
  private readonly logger: WsLogger | null;

  constructor(
    wsUrl: string = '/api/murf/tts',
    wsFactory?: (url: string) => IWebSocket,
    logger?: WsLogger,
  ) {
    this.wsUrl = wsUrl;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.wsFactory = wsFactory ?? ((url: string) => new (globalThis as any).WebSocket(url) as IWebSocket);
    this.logger = logger ?? null;
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Establishes a WebSocket connection for the given session.
   * Requirement 4.1: establish connection before first TTS request of a session.
   */
  connect(sessionId: string): Promise<void> {
    if (this.connectedSessions.has(sessionId)) {
      return Promise.resolve();
    }
    return this._openSocket(sessionId, /* isReconnect */ false);
  }

  // ------------------------------------------------------------------
  // Internal socket open (shared by connect and reconnect)
  // ------------------------------------------------------------------

  private _openSocket(sessionId: string, isReconnect: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let ws: IWebSocket;
      try {
        ws = this.wsFactory(this.wsUrl);
      } catch (err) {
        if (isReconnect) {
          this._onReconnectAttemptFailed(sessionId);
        }
        reject(err);
        return;
      }

      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        this.connections.set(sessionId, ws);
        this.connectedSessions.add(sessionId);
        this.retryCount = 0;
        this.reconnecting.delete(sessionId);
        this._resetInactivityTimer(sessionId);
        resolve();
      };

      ws.onmessage = (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer && this.onAudioChunk) {
          this.onAudioChunk(event.data);
        }
      };

      ws.onerror = (_event: unknown) => {
        const wsError: WebSocketError = {
          code: 0,
          reason: 'WebSocket error',
          wasClean: false,
        };
        if (this.onError) {
          this.onError(wsError);
        }
        if (isReconnect) {
          // Schedule next retry directly from the error handler
          this._onReconnectAttemptFailed(sessionId);
          reject(new Error('WebSocket reconnect error'));
        } else {
          reject(new Error('WebSocket connection error'));
        }
      };

      ws.onclose = (event: CloseEvent) => {
        if (isReconnect && !this.connectedSessions.has(sessionId)) {
          // Closed before open during a reconnect attempt — handled by onerror
          return;
        }
        this._handleClose(sessionId, event);
      };
    });
  }

  /**
   * Closes the WebSocket connection for the given session.
   * Fires onClose with 'USER_INITIATED' and clears the inactivity timer.
   * Requirement 4.2: maintain and monitor the connection while session is active.
   */
  disconnect(sessionId: string): void {
    this._clearInactivityTimer(sessionId);
    this._clearReconnectTimer(sessionId);

    const ws = this.connections.get(sessionId);
    if (ws) {
      // Remove from connected set before closing to prevent reconnect logic
      this.connectedSessions.delete(sessionId);
      this.connections.delete(sessionId);
      ws.onclose = null; // prevent _handleClose from firing
      ws.close();
    } else {
      this.connectedSessions.delete(sessionId);
    }

    if (this.onClose) {
      this.onClose('USER_INITIATED');
    }
  }

  /**
   * Sends a TTS request payload over the WebSocket.
   * Resets the inactivity timer on each call.
   * Requirement 4.4: close after 3 minutes of inactivity (reset on send).
   */
  send(payload: TTSRequest): void {
    const ws = this.connections.get(payload.sessionId);
    if (ws && ws.readyState === WS_OPEN) {
      ws.send(JSON.stringify(payload));
      this._resetInactivityTimer(payload.sessionId);
    }
  }

  /**
   * Returns whether the given session currently has an open connection.
   */
  isConnected(sessionId: string): boolean {
    return this.connectedSessions.has(sessionId);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _handleClose(sessionId: string, event: CloseEvent): void {
    const wasConnected = this.connectedSessions.has(sessionId);
    this.connectedSessions.delete(sessionId);
    this.connections.delete(sessionId);
    this._clearInactivityTimer(sessionId);

    if (!wasConnected) {
      // Already disconnected intentionally — do nothing
      return;
    }

    // Requirement 13.2: log unexpected close with error code, reason, and session ID
    if (this.logger) {
      this.logger.logWsError(event.code, event.reason || 'Unexpected close', sessionId);
    }

    if (this.onClose) {
      this.onClose('UNEXPECTED');
    }

    // Requirement 4.3: attempt reconnect within 2 seconds
    this._scheduleReconnect(sessionId);
  }

  private _scheduleReconnect(sessionId: string): void {
    if (this.retryCount >= MAX_RETRIES) {
      // Requirement 4.6: notify user after 3 failed retries
      this.reconnecting.delete(sessionId);
      if (this.logger) {
        this.logger.logWsError(0, 'Max retries exceeded', sessionId);
      }
      if (this.onMaxRetriesExceeded) {
        this.onMaxRetriesExceeded(sessionId);
      }
      return;
    }

    this.reconnecting.add(sessionId);
    this._clearReconnectTimer(sessionId);

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(sessionId);
      this.retryCount += 1;
      if (this.logger) {
        this.logger.logWsError(0, `Reconnect attempt ${this.retryCount}`, sessionId);
      }
      // Use _openSocket in reconnect mode so errors are handled inline
      this._openSocket(sessionId, /* isReconnect */ true).catch(() => {
        // Error already handled inside _openSocket (isReconnect=true)
      });
    }, RECONNECT_DELAY_MS);

    this.reconnectTimers.set(sessionId, timer);
  }

  /** Called when a reconnect attempt socket fails (error before open). */
  private _onReconnectAttemptFailed(sessionId: string): void {
    if (this.retryCount >= MAX_RETRIES) {
      this.reconnecting.delete(sessionId);
      if (this.logger) {
        this.logger.logWsError(0, 'Max retries exceeded', sessionId);
      }
      if (this.onMaxRetriesExceeded) {
        this.onMaxRetriesExceeded(sessionId);
      }
      return;
    }
    // Schedule the next retry
    this._scheduleReconnect(sessionId);
  }

  private _resetInactivityTimer(sessionId: string): void {
    this._clearInactivityTimer(sessionId);

    const timer = setTimeout(() => {
      this.inactivityTimers.delete(sessionId);
      // Requirement 4.4: close after 3 minutes of inactivity
      this._closeForInactivity(sessionId);
    }, INACTIVITY_TIMEOUT_MS);

    this.inactivityTimers.set(sessionId, timer);
  }

  private _closeForInactivity(sessionId: string): void {
    this._clearReconnectTimer(sessionId);

    const ws = this.connections.get(sessionId);
    if (ws) {
      this.connectedSessions.delete(sessionId);
      this.connections.delete(sessionId);
      ws.onclose = null;
      ws.close();
    } else {
      this.connectedSessions.delete(sessionId);
    }

    if (this.onClose) {
      this.onClose('INACTIVITY_TIMEOUT');
    }
  }

  private _clearInactivityTimer(sessionId: string): void {
    const timer = this.inactivityTimers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.inactivityTimers.delete(sessionId);
    }
  }

  private _clearReconnectTimer(sessionId: string): void {
    const timer = this.reconnectTimers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }
  }
}
