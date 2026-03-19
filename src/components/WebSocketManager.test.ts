// Feature: wellflow-voice-wellness-assistant
// Tests for WebSocketManager (Requirements 4.1–4.6)

import * as fc from 'fast-check';
import { WebSocketManager, TTSRequest } from './WebSocketManager';
import { WebSocketError, CloseReason } from '../types';

// ------------------------------------------------------------------
// Mock WebSocket factory
// ------------------------------------------------------------------

type WsEventHandler = (event: any) => void;

interface MockWebSocket {
  binaryType: string;
  readyState: number;
  onopen: WsEventHandler | null;
  onmessage: WsEventHandler | null;
  onerror: WsEventHandler | null;
  onclose: WsEventHandler | null;
  send: jest.Mock;
  close: jest.Mock;
  /** Test helper: simulate the connection opening */
  simulateOpen(): void;
  /** Test helper: simulate receiving a binary message */
  simulateMessage(data: ArrayBuffer): void;
  /** Test helper: simulate an error event */
  simulateError(): void;
  /** Test helper: simulate the connection closing */
  simulateClose(wasClean?: boolean, code?: number, reason?: string): void;
}

function createMockWebSocket(): MockWebSocket {
  const ws: MockWebSocket = {
    binaryType: 'arraybuffer',
    readyState: 0, // CONNECTING
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: jest.fn(),
    close: jest.fn(),
    simulateOpen() {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen({});
    },
    simulateMessage(data: ArrayBuffer) {
      if (this.onmessage) this.onmessage({ data });
    },
    simulateError() {
      this.readyState = 3; // CLOSED
      if (this.onerror) this.onerror({});
    },
    simulateClose(wasClean = false, code = 1006, reason = '') {
      this.readyState = 3; // CLOSED
      if (this.onclose) this.onclose({ wasClean, code, reason });
    },
  };
  return ws;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function buildManager(mocks: MockWebSocket[]): {
  manager: WebSocketManager;
  factory: jest.Mock;
} {
  let callIndex = 0;
  const factory = jest.fn((_url: string) => {
    const ws = mocks[callIndex] ?? mocks[mocks.length - 1];
    callIndex++;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ws as any;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const manager = new WebSocketManager('wss://test.example', factory as any);
  return { manager, factory };
}

// ------------------------------------------------------------------
// Unit tests
// ------------------------------------------------------------------

describe('WebSocketManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ----------------------------------------------------------------
  // connect / isConnected
  // ----------------------------------------------------------------

  describe('connect', () => {
    it('marks session as connected after WebSocket opens', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const connectPromise = manager.connect('session-1');
      ws.simulateOpen();
      await connectPromise;

      expect(manager.isConnected('session-1')).toBe(true);
    });

    it('resolves the promise when the socket opens', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const connectPromise = manager.connect('session-1');
      ws.simulateOpen();
      await expect(connectPromise).resolves.toBeUndefined();
    });

    it('rejects the promise when the socket errors before opening', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const connectPromise = manager.connect('session-1');
      ws.simulateError();
      await expect(connectPromise).rejects.toThrow();
    });

    it('is a no-op if the session is already connected', async () => {
      const ws = createMockWebSocket();
      const { manager, factory } = buildManager([ws]);

      const p1 = manager.connect('session-1');
      ws.simulateOpen();
      await p1;

      await manager.connect('session-1'); // second call
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  // disconnect
  // ----------------------------------------------------------------

  describe('disconnect', () => {
    it('marks session as disconnected', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const p = manager.connect('session-1');
      ws.simulateOpen();
      await p;

      manager.disconnect('session-1');
      expect(manager.isConnected('session-1')).toBe(false);
    });

    it('fires onClose with USER_INITIATED', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const p = manager.connect('session-1');
      ws.simulateOpen();
      await p;

      const reasons: CloseReason[] = [];
      manager.onClose = (r) => reasons.push(r);

      manager.disconnect('session-1');
      expect(reasons).toEqual(['USER_INITIATED']);
    });

    it('does not trigger reconnect after user-initiated disconnect', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const { manager, factory } = buildManager([ws1, ws2]);

      const p = manager.connect('session-1');
      ws1.simulateOpen();
      await p;

      manager.disconnect('session-1');

      // Advance past reconnect delay — no reconnect should happen
      jest.advanceTimersByTime(3_000);
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  // send
  // ----------------------------------------------------------------

  describe('send', () => {
    it('sends JSON payload over the WebSocket', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const p = manager.connect('session-1');
      ws.simulateOpen();
      await p;

      const payload: TTSRequest = { sessionId: 'session-1', text: 'Hello' };
      manager.send(payload);

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(payload));
    });

    it('does nothing when the session is not connected', () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const payload: TTSRequest = { sessionId: 'session-1', text: 'Hello' };
      manager.send(payload); // no connect called

      expect(ws.send).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // onAudioChunk callback
  // ----------------------------------------------------------------

  describe('onAudioChunk', () => {
    it('invokes the callback when a binary message is received', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const chunks: ArrayBuffer[] = [];
      manager.onAudioChunk = (c) => chunks.push(c);

      const p = manager.connect('session-1');
      ws.simulateOpen();
      await p;

      const buf = new ArrayBuffer(8);
      ws.simulateMessage(buf);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(buf);
    });
  });

  // ----------------------------------------------------------------
  // Inactivity timeout (Property 10)
  // ----------------------------------------------------------------

  describe('inactivity timeout', () => {
    // Feature: wellflow-voice-wellness-assistant, Property 10: Inactivity timeout
    it('closes the connection after 3 minutes of inactivity', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const reasons: CloseReason[] = [];
      manager.onClose = (r) => reasons.push(r);

      const p = manager.connect('session-1');
      ws.simulateOpen();
      await p;

      // Advance exactly 3 minutes
      jest.advanceTimersByTime(3 * 60 * 1000);

      expect(manager.isConnected('session-1')).toBe(false);
      expect(reasons).toContain('INACTIVITY_TIMEOUT');
    });

    it('resets the inactivity timer on each send', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const reasons: CloseReason[] = [];
      manager.onClose = (r) => reasons.push(r);

      const p = manager.connect('session-1');
      ws.simulateOpen();
      await p;

      // Advance 2 minutes, then send — should reset the 3-minute timer
      jest.advanceTimersByTime(2 * 60 * 1000);
      manager.send({ sessionId: 'session-1', text: 'ping' });

      // Advance 2 more minutes (only 2 of 3 since last send) — should still be connected
      jest.advanceTimersByTime(2 * 60 * 1000);
      expect(manager.isConnected('session-1')).toBe(true);

      // Advance 1 more minute (3 min since last send) — should now be disconnected
      jest.advanceTimersByTime(1 * 60 * 1000);
      expect(manager.isConnected('session-1')).toBe(false);
      expect(reasons).toContain('INACTIVITY_TIMEOUT');
    });

    it('does NOT close before 3 minutes of inactivity', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const reasons: CloseReason[] = [];
      manager.onClose = (r) => reasons.push(r);

      const p = manager.connect('session-1');
      ws.simulateOpen();
      await p;

      // Advance just under 3 minutes
      jest.advanceTimersByTime(3 * 60 * 1000 - 1);

      expect(manager.isConnected('session-1')).toBe(true);
      expect(reasons).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // Property 10: Inactivity timeout (fast-check)
  // ----------------------------------------------------------------

  describe('Property 10: Inactivity timeout (fast-check)', () => {
    // Feature: wellflow-voice-wellness-assistant, Property 10: Inactivity timeout
    it('keeps connection open before 180000ms and closes it at/after 180000ms', async () => {
      // Validates: Requirements 4.4
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 64 }),
          fc.integer({ min: 1, max: 179_999 }),
          async (sessionId, durationBeforeTimeout) => {
            jest.useFakeTimers();
            try {
              const ws = createMockWebSocket();
              const { manager } = buildManager([ws]);

              const reasons: CloseReason[] = [];
              manager.onClose = (r) => reasons.push(r);

              const connectPromise = manager.connect(sessionId);
              ws.simulateOpen();
              await connectPromise;

              // Before the 180000ms threshold — must still be connected
              jest.advanceTimersByTime(durationBeforeTimeout);
              expect(manager.isConnected(sessionId)).toBe(true);
              expect(reasons.includes('INACTIVITY_TIMEOUT')).toBe(false);

              // Advance to exactly 180000ms total — must now be closed
              jest.advanceTimersByTime(180_000 - durationBeforeTimeout);
              expect(manager.isConnected(sessionId)).toBe(false);
              expect(reasons.includes('INACTIVITY_TIMEOUT')).toBe(true);
            } finally {
              jest.useRealTimers();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ----------------------------------------------------------------
  // Reconnection logic (Property 9)
  // ----------------------------------------------------------------

  describe('reconnection on unexpected closure', () => {
    // Feature: wellflow-voice-wellness-assistant, Property 9: WebSocket reconnection timing
    it('schedules a reconnect within 2 seconds of unexpected closure', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const { manager, factory } = buildManager([ws1, ws2]);

      const p = manager.connect('session-1');
      ws1.simulateOpen();
      await p;

      // Simulate unexpected closure
      ws1.simulateClose(false);

      // Before 2 seconds — no reconnect yet
      jest.advanceTimersByTime(1_999);
      expect(factory).toHaveBeenCalledTimes(1);

      // At 2 seconds — reconnect attempt fires
      jest.advanceTimersByTime(1);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('fires onClose with UNEXPECTED on unexpected closure', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const { manager } = buildManager([ws1, ws2]);

      const reasons: CloseReason[] = [];
      manager.onClose = (r) => reasons.push(r);

      const p = manager.connect('session-1');
      ws1.simulateOpen();
      await p;

      ws1.simulateClose(false);

      expect(reasons).toContain('UNEXPECTED');
    });

    it('reconnects successfully after unexpected closure', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const { manager } = buildManager([ws1, ws2]);

      const p = manager.connect('session-1');
      ws1.simulateOpen();
      await p;

      ws1.simulateClose(false);

      // Advance to trigger reconnect
      jest.advanceTimersByTime(2_000);
      ws2.simulateOpen();

      // Allow microtask queue to flush
      await Promise.resolve();

      expect(manager.isConnected('session-1')).toBe(true);
    });

    it('increments retryCount on each reconnect attempt', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const { manager } = buildManager([ws1, ws2]);

      const p = manager.connect('session-1');
      ws1.simulateOpen();
      await p;

      expect(manager.retryCount).toBe(0);

      ws1.simulateClose(false);
      jest.advanceTimersByTime(2_000);
      // ws2 connect attempt fires; retryCount incremented before open
      expect(manager.retryCount).toBe(1);
    });

    it('resets retryCount to 0 after a successful reconnect', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const { manager } = buildManager([ws1, ws2]);

      const p = manager.connect('session-1');
      ws1.simulateOpen();
      await p;

      ws1.simulateClose(false);
      jest.advanceTimersByTime(2_000);
      ws2.simulateOpen();
      await Promise.resolve();

      expect(manager.retryCount).toBe(0);
    });
  });

  // ----------------------------------------------------------------
  // Max retries exceeded (Requirement 4.6)
  // ----------------------------------------------------------------

  describe('max retries exceeded', () => {
    it('calls onMaxRetriesExceeded after 3 failed reconnect attempts', async () => {
      // Create 4 sockets: 1 initial + 3 reconnect attempts (all fail)
      const sockets = Array.from({ length: 4 }, () => createMockWebSocket());
      const { manager } = buildManager(sockets);

      const exceeded: string[] = [];
      manager.onMaxRetriesExceeded = (sid) => exceeded.push(sid);

      const p = manager.connect('session-1');
      sockets[0].simulateOpen();
      await p;

      // First unexpected close → retry 1
      sockets[0].simulateClose(false);
      jest.advanceTimersByTime(2_000);
      sockets[1].simulateError(); // retry 1 fails

      // retry 2
      jest.advanceTimersByTime(2_000);
      sockets[2].simulateError(); // retry 2 fails

      // retry 3
      jest.advanceTimersByTime(2_000);
      sockets[3].simulateError(); // retry 3 fails

      // After 3 failures, onMaxRetriesExceeded should fire
      jest.advanceTimersByTime(2_000);

      expect(exceeded).toContain('session-1');
    });

    it('does not attempt a 4th reconnect after max retries', async () => {
      const sockets = Array.from({ length: 5 }, () => createMockWebSocket());
      const { manager, factory } = buildManager(sockets);

      manager.onMaxRetriesExceeded = jest.fn();

      const p = manager.connect('session-1');
      sockets[0].simulateOpen();
      await p;

      sockets[0].simulateClose(false);
      jest.advanceTimersByTime(2_000);
      sockets[1].simulateError();

      jest.advanceTimersByTime(2_000);
      sockets[2].simulateError();

      jest.advanceTimersByTime(2_000);
      sockets[3].simulateError();

      jest.advanceTimersByTime(2_000);

      // factory called: 1 initial + 3 retries = 4 total; no 5th call
      expect(factory).toHaveBeenCalledTimes(4);
    });
  });

  // ----------------------------------------------------------------
  // onError callback
  // ----------------------------------------------------------------

  describe('onError callback', () => {
    it('invokes onError when the WebSocket emits an error', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const errors: WebSocketError[] = [];
      manager.onError = (e) => errors.push(e);

      // Start connecting but trigger error before open
      const connectPromise = manager.connect('session-1');
      ws.simulateError();
      await connectPromise.catch(() => {});

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ wasClean: false });
    });
  });

  // ----------------------------------------------------------------
  // Inactivity timer cleared on disconnect
  // ----------------------------------------------------------------

  describe('inactivity timer cleanup', () => {
    it('does not fire inactivity timeout after explicit disconnect', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const reasons: CloseReason[] = [];
      manager.onClose = (r) => reasons.push(r);

      const p = manager.connect('session-1');
      ws.simulateOpen();
      await p;

      manager.disconnect('session-1');
      reasons.length = 0; // clear USER_INITIATED

      // Advance past inactivity timeout
      jest.advanceTimersByTime(4 * 60 * 1000);

      expect(reasons).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // WebSocket error flows (unit tests) — Requirements 4.3, 4.6
  // ----------------------------------------------------------------

  describe('WebSocket error flows (unit tests)', () => {
    it('unexpected closure triggers onClose with UNEXPECTED', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const { manager } = buildManager([ws1, ws2]);

      const reasons: CloseReason[] = [];
      manager.onClose = (r) => reasons.push(r);

      const p = manager.connect('session-err-1');
      ws1.simulateOpen();
      await p;

      ws1.simulateClose(false, 1006, 'Connection dropped');

      expect(reasons).toContain('UNEXPECTED');
    });

    it('calls onMaxRetriesExceeded with the sessionId after 3 failed reconnect attempts', async () => {
      const sockets = Array.from({ length: 4 }, () => createMockWebSocket());
      const { manager } = buildManager(sockets);

      const exceeded: string[] = [];
      manager.onMaxRetriesExceeded = (sid) => exceeded.push(sid);

      const p = manager.connect('session-err-2');
      sockets[0].simulateOpen();
      await p;

      // Trigger first unexpected close → schedules retry 1
      sockets[0].simulateClose(false);

      // Retry 1 fires and fails
      jest.advanceTimersByTime(2_000);
      sockets[1].simulateError();

      // Retry 2 fires and fails
      jest.advanceTimersByTime(2_000);
      sockets[2].simulateError();

      // Retry 3 fires and fails → max retries reached
      jest.advanceTimersByTime(2_000);
      sockets[3].simulateError();

      // Allow any pending timers/microtasks to settle
      jest.advanceTimersByTime(2_000);
      await Promise.resolve();

      expect(exceeded).toContain('session-err-2');
    });

    it('does not make a 4th reconnect attempt after max retries', async () => {
      const sockets = Array.from({ length: 5 }, () => createMockWebSocket());
      const { manager, factory } = buildManager(sockets);

      manager.onMaxRetriesExceeded = jest.fn();

      const p = manager.connect('session-err-3');
      sockets[0].simulateOpen();
      await p;

      sockets[0].simulateClose(false);

      jest.advanceTimersByTime(2_000);
      sockets[1].simulateError();

      jest.advanceTimersByTime(2_000);
      sockets[2].simulateError();

      jest.advanceTimersByTime(2_000);
      sockets[3].simulateError();

      // Advance well past any potential 4th retry window
      jest.advanceTimersByTime(10_000);

      // 1 initial + 3 retries = 4 total; no 5th call
      expect(factory).toHaveBeenCalledTimes(4);
    });

    it('calls onError when the WebSocket emits an error event', async () => {
      const ws = createMockWebSocket();
      const { manager } = buildManager([ws]);

      const errors: WebSocketError[] = [];
      manager.onError = (e) => errors.push(e);

      const connectPromise = manager.connect('session-err-4');
      ws.simulateError();
      await connectPromise.catch(() => {});

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ wasClean: false });
    });
  });

  // ----------------------------------------------------------------
  // Property 9: WebSocket reconnection timing (fast-check)
  // ----------------------------------------------------------------

  describe('Property 9: WebSocket reconnection timing', () => {
    // Feature: wellflow-voice-wellness-assistant, Property 9: WebSocket reconnection timing
    it('schedules a reconnect within 2000ms for any session ID after unexpected closure', async () => {
      // Validates: Requirements 4.3
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 64 }),
          async (sessionId) => {
            jest.useFakeTimers();
            try {
              const ws1 = createMockWebSocket();
              const ws2 = createMockWebSocket();
              const { manager, factory } = buildManager([ws1, ws2]);

              // Establish initial connection
              const connectPromise = manager.connect(sessionId);
              ws1.simulateOpen();
              await connectPromise;

              expect(factory).toHaveBeenCalledTimes(1);

              // Simulate unexpected (unclean) closure
              ws1.simulateClose(false, 1006, 'Connection dropped');

              // Just before 2000ms — reconnect must NOT have fired yet
              jest.advanceTimersByTime(1_999);
              expect(factory).toHaveBeenCalledTimes(1);

              // At exactly 2000ms — reconnect attempt must have been scheduled
              jest.advanceTimersByTime(1);
              expect(factory).toHaveBeenCalledTimes(2);
            } finally {
              jest.useRealTimers();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
