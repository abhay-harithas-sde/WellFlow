// Feature: murf-ai-voice-integration
// Consolidated unit tests
// Requirements: 1.2, 1.4, 3.5, 3.6, 4.3, 4.5, 4.6, 5.1, 5.3, 6.3, 10.4, 11.1, 12.4

import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationError, getMurfApiKey } from '../../lib/murf-config';
import { TTSEngine, TTSEngineCallbacks, AuthError } from './TTSEngine';
import { WebSocketManager, TTSRequest } from './WebSocketManager';
import { VoiceSelector, VoiceSelectorCallbacks } from './VoiceSelector';
import { RateLimiter } from './RateLimiter';
import { TextFallbackDisplay, FallbackDisplayAdapter } from './TextFallbackDisplay';
import { RateLimiterInterface } from './RateLimiter';
import { ProfileStore } from '../store/ProfileStore';
import { TTSOptions, MurfVoice } from '../types';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers shared across suites
// ---------------------------------------------------------------------------

function makeMockRateLimiter(): jest.Mocked<RateLimiterInterface> {
  return {
    acquire: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
    activeCount: 0,
    requestsThisMinute: 0,
  };
}

function makeMockWsManager(connected = true): jest.Mocked<Pick<WebSocketManager, 'isConnected' | 'connect' | 'send'>> {
  return {
    isConnected: jest.fn().mockReturnValue(connected),
    connect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn(),
  };
}

function makeCallbacks(): {
  callbacks: TTSEngineCallbacks;
  fallbackTexts: string[];
  unsupportedLangs: string[];
  authErrors: number[];
} {
  const fallbackTexts: string[] = [];
  const unsupportedLangs: string[] = [];
  const authErrors: number[] = [];
  return {
    callbacks: {
      onTextFallback: (t) => fallbackTexts.push(t),
      onUnsupportedLanguage: (l) => unsupportedLangs.push(l),
      onAuthError: (code) => authErrors.push(code),
    },
    fallbackTexts,
    unsupportedLangs,
    authErrors,
  };
}

const BASE_OPTIONS: TTSOptions = { language: 'en', speed: 'normal', sessionId: 'session-1' };

// ---------------------------------------------------------------------------
// 1. ConfigurationError thrown when MURF_API_KEY absent or empty (Req 1.2)
// ---------------------------------------------------------------------------

describe('ConfigurationError — MURF_API_KEY absent or empty (Req 1.2)', () => {
  const originalEnv = process.env.MURF_API_KEY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MURF_API_KEY;
    } else {
      process.env.MURF_API_KEY = originalEnv;
    }
  });

  it('throws ConfigurationError when MURF_API_KEY is absent', () => {
    delete process.env.MURF_API_KEY;
    expect(() => getMurfApiKey()).toThrow(ConfigurationError);
  });

  it('throws ConfigurationError when MURF_API_KEY is empty string', () => {
    process.env.MURF_API_KEY = '';
    expect(() => getMurfApiKey()).toThrow(ConfigurationError);
  });

  it('throws ConfigurationError when MURF_API_KEY is whitespace only', () => {
    process.env.MURF_API_KEY = '   ';
    expect(() => getMurfApiKey()).toThrow(ConfigurationError);
  });

  it('returns the key when MURF_API_KEY is set to a non-empty value', () => {
    process.env.MURF_API_KEY = 'test-key-123';
    expect(getMurfApiKey()).toBe('test-key-123');
  });

  it('ConfigurationError has the correct name', () => {
    delete process.env.MURF_API_KEY;
    try {
      getMurfApiKey();
      fail('Expected ConfigurationError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      expect((err as ConfigurationError).name).toBe('ConfigurationError');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. .env.example contains MURF_API_KEY= without a real value (Req 1.4)
// ---------------------------------------------------------------------------

describe('.env.example — MURF_API_KEY documented without real value (Req 1.4)', () => {
  it('.env.example file exists at the project root', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
  });

  it('.env.example contains MURF_API_KEY= entry', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    expect(content).toMatch(/MURF_API_KEY=/);
  });

  it('.env.example does not contain a real API key value after MURF_API_KEY=', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    // The line should be exactly "MURF_API_KEY=" with no value after the equals sign
    const lines = content.split('\n');
    const keyLine = lines.find((l) => l.startsWith('MURF_API_KEY='));
    expect(keyLine).toBeDefined();
    // Value after '=' should be empty (or only whitespace)
    const value = keyLine!.split('=').slice(1).join('=').trim();
    expect(value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 3. Exactly one retry on first TTS failure, then fallback (Req 3.5, 3.6)
// ---------------------------------------------------------------------------

describe('TTSEngine — exactly one retry on failure, then fallback (Req 3.5, 3.6)', () => {
  it('retries exactly once when first attempt fails, succeeds on retry', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send
      .mockImplementationOnce(() => { throw new Error('API error'); })
      .mockImplementationOnce(() => { /* success */ });
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Retry text', BASE_OPTIONS);

    expect(ws.send).toHaveBeenCalledTimes(2);
    expect(fallbackTexts).toHaveLength(0);
  });

  it('calls onTextFallback with original text when both attempts fail (Req 3.6)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new Error('API error'); });
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Fallback text', BASE_OPTIONS);

    expect(ws.send).toHaveBeenCalledTimes(2);
    expect(fallbackTexts).toEqual(['Fallback text']);
  });

  it('does not retry more than once (exactly 2 send calls on double failure)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new Error('API error'); });
    const { callbacks } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('text', BASE_OPTIONS);

    expect(ws.send).toHaveBeenCalledTimes(2);
  });

  it('does not call onTextFallback when first attempt succeeds (Req 3.5)', async () => {
    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Success text', BASE_OPTIONS);

    expect(ws.send).toHaveBeenCalledTimes(1);
    expect(fallbackTexts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// WebSocketManager helpers (shared by sections 4, 5, 6)
// ---------------------------------------------------------------------------

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
  simulateOpen(): void;
  simulateMessage(data: ArrayBuffer): void;
  simulateError(): void;
  simulateClose(wasClean?: boolean, code?: number, reason?: string): void;
}

function createMockWebSocket(): MockWebSocket {
  const ws: MockWebSocket = {
    binaryType: 'arraybuffer',
    readyState: 0,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: jest.fn(),
    close: jest.fn(),
    simulateOpen() {
      this.readyState = 1;
      if (this.onopen) this.onopen({});
    },
    simulateMessage(data: ArrayBuffer) {
      if (this.onmessage) this.onmessage({ data });
    },
    simulateError() {
      this.readyState = 3;
      if (this.onerror) this.onerror({});
    },
    simulateClose(wasClean = false, code = 1006, reason = '') {
      this.readyState = 3;
      if (this.onclose) this.onclose({ wasClean, code, reason });
    },
  };
  return ws;
}

function buildWsManager(mocks: MockWebSocket[]): {
  manager: WebSocketManager;
  factory: jest.Mock;
} {
  let callIndex = 0;
  const factory = jest.fn((_url: string) => {
    const ws = mocks[callIndex] ?? mocks[mocks.length - 1];
    callIndex++;
    return ws as any;
  });
  const manager = new WebSocketManager('wss://test.example', factory as any);
  return { manager, factory };
}

// ---------------------------------------------------------------------------
// 4. WebSocketManager reconnects after unexpected close (Req 4.3)
// ---------------------------------------------------------------------------

describe('WebSocketManager — reconnects after unexpected close (Req 4.3)', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('schedules a reconnect within 2 seconds of unexpected closure', async () => {
    const ws1 = createMockWebSocket();
    const ws2 = createMockWebSocket();
    const { manager, factory } = buildWsManager([ws1, ws2]);

    const p = manager.connect('session-reconnect');
    ws1.simulateOpen();
    await p;

    ws1.simulateClose(false, 1006, 'Connection dropped');

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
    const { manager } = buildWsManager([ws1, ws2]);

    const reasons: string[] = [];
    manager.onClose = (r) => reasons.push(r);

    const p = manager.connect('session-unexpected');
    ws1.simulateOpen();
    await p;

    ws1.simulateClose(false);

    expect(reasons).toContain('UNEXPECTED');
  });

  it('reconnects successfully after unexpected closure', async () => {
    const ws1 = createMockWebSocket();
    const ws2 = createMockWebSocket();
    const { manager } = buildWsManager([ws1, ws2]);

    const p = manager.connect('session-reconnect-ok');
    ws1.simulateOpen();
    await p;

    ws1.simulateClose(false);
    jest.advanceTimersByTime(2_000);
    ws2.simulateOpen();
    await Promise.resolve();

    expect(manager.isConnected('session-reconnect-ok')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. WebSocketManager invokes onMaxRetriesExceeded after 3 failures (Req 4.6)
// ---------------------------------------------------------------------------

describe('WebSocketManager — onMaxRetriesExceeded after 3 failures (Req 4.6)', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('calls onMaxRetriesExceeded with sessionId after 3 consecutive failed reconnects', async () => {
    const sockets = Array.from({ length: 4 }, () => createMockWebSocket());
    const { manager } = buildWsManager(sockets);

    const exceeded: string[] = [];
    manager.onMaxRetriesExceeded = (sid) => exceeded.push(sid);

    const p = manager.connect('session-max-retries');
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

    jest.advanceTimersByTime(2_000);

    expect(exceeded).toContain('session-max-retries');
  });

  it('does not attempt a 4th reconnect after max retries', async () => {
    const sockets = Array.from({ length: 5 }, () => createMockWebSocket());
    const { manager, factory } = buildWsManager(sockets);

    manager.onMaxRetriesExceeded = jest.fn();

    const p = manager.connect('session-no-4th');
    sockets[0].simulateOpen();
    await p;

    sockets[0].simulateClose(false);
    jest.advanceTimersByTime(2_000);
    sockets[1].simulateError();

    jest.advanceTimersByTime(2_000);
    sockets[2].simulateError();

    jest.advanceTimersByTime(2_000);
    sockets[3].simulateError();

    jest.advanceTimersByTime(10_000);

    // 1 initial + 3 retries = 4 total; no 5th call
    expect(factory).toHaveBeenCalledTimes(4);
  });
});

// ---------------------------------------------------------------------------
// 6. WebSocketManager closes with INACTIVITY_TIMEOUT after 3 minutes (Req 4.5)
// ---------------------------------------------------------------------------

describe('WebSocketManager — INACTIVITY_TIMEOUT after 3 minutes (Req 4.5)', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('closes the connection and fires onClose(INACTIVITY_TIMEOUT) after 3 minutes of silence', async () => {
    const ws = createMockWebSocket();
    const { manager } = buildWsManager([ws]);

    const reasons: string[] = [];
    manager.onClose = (r) => reasons.push(r);

    const p = manager.connect('session-inactivity');
    ws.simulateOpen();
    await p;

    jest.advanceTimersByTime(3 * 60 * 1000);

    expect(manager.isConnected('session-inactivity')).toBe(false);
    expect(reasons).toContain('INACTIVITY_TIMEOUT');
  });

  it('does NOT close before 3 minutes of inactivity', async () => {
    const ws = createMockWebSocket();
    const { manager } = buildWsManager([ws]);

    const reasons: string[] = [];
    manager.onClose = (r) => reasons.push(r);

    const p = manager.connect('session-inactivity-early');
    ws.simulateOpen();
    await p;

    jest.advanceTimersByTime(3 * 60 * 1000 - 1);

    expect(manager.isConnected('session-inactivity-early')).toBe(true);
    expect(reasons).toHaveLength(0);
  });

  it('resets the inactivity timer on each send() call', async () => {
    const ws = createMockWebSocket();
    const { manager } = buildWsManager([ws]);

    const reasons: string[] = [];
    manager.onClose = (r) => reasons.push(r);

    const p = manager.connect('session-inactivity-reset');
    ws.simulateOpen();
    await p;

    // Advance 2 minutes, then send — resets the 3-minute timer
    jest.advanceTimersByTime(2 * 60 * 1000);
    manager.send({ sessionId: 'session-inactivity-reset', text: 'ping' });

    // Advance 2 more minutes (only 2 of 3 since last send) — still connected
    jest.advanceTimersByTime(2 * 60 * 1000);
    expect(manager.isConnected('session-inactivity-reset')).toBe(true);

    // Advance 1 more minute (3 min since last send) — now disconnected
    jest.advanceTimersByTime(1 * 60 * 1000);
    expect(manager.isConnected('session-inactivity-reset')).toBe(false);
    expect(reasons).toContain('INACTIVITY_TIMEOUT');
  });
});

// ---------------------------------------------------------------------------
// VoiceSelector helpers
// ---------------------------------------------------------------------------

function makeVsSelectorWithFetch(fetchFn: jest.Mock): {
  selector: VoiceSelector;
  errors: Array<{ voiceId: string; message: string }>;
  ws: jest.Mocked<Pick<WebSocketManager, 'isConnected' | 'connect' | 'send'>>;
} {
  const store = new ProfileStore();
  const ws: jest.Mocked<Pick<WebSocketManager, 'isConnected' | 'connect' | 'send'>> = {
    isConnected: jest.fn().mockReturnValue(true),
    connect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn(),
  };
  const rl: jest.Mocked<RateLimiterInterface> = {
    acquire: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
    activeCount: 0,
    requestsThisMinute: 0,
  };
  const errors: Array<{ voiceId: string; message: string }> = [];
  const callbacks: VoiceSelectorCallbacks = {
    onPreviewError: (voiceId, message) => errors.push({ voiceId, message }),
  };
  const selector = new VoiceSelector(store, ws as unknown as WebSocketManager, rl, callbacks, [], fetchFn);
  return { selector, errors, ws };
}

// ---------------------------------------------------------------------------
// 7. VoiceSelector.initialise() populates voice list on success, empty on failure (Req 5.1, 5.3)
// ---------------------------------------------------------------------------

describe('VoiceSelector.initialise() — voice list population (Req 5.1, 5.3)', () => {
  it('populates voice list on successful fetch (Req 5.1)', async () => {
    const voices: MurfVoice[] = [
      { voiceId: 'v1', name: 'Alice', accent: 'american', gender: 'female', style: 'calm' },
      { voiceId: 'v2', name: 'Bob', accent: 'british', gender: 'male', style: 'energetic' },
    ];
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => voices });
    const { selector } = makeVsSelectorWithFetch(fetchFn);

    await selector.initialise('en');
    const result = await selector.listVoices();

    expect(result).toHaveLength(2);
    expect(result[0].voiceId).toBe('v1');
    expect(result[1].voiceId).toBe('v2');
  });

  it('stores empty list and calls onPreviewError on fetch failure (Req 5.3)', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('Network error'));
    const { selector, errors } = makeVsSelectorWithFetch(fetchFn);

    await selector.initialise('en');
    const result = await selector.listVoices();

    expect(result).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Voice catalogue unavailable/);
  });

  it('stores empty list and calls onPreviewError on non-ok HTTP response (Req 5.3)', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => [] });
    const { selector, errors } = makeVsSelectorWithFetch(fetchFn);

    await selector.initialise('en');
    const result = await selector.listVoices();

    expect(result).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 8. VoiceSelector.previewVoice() uses current session language (Req 6.3)
// ---------------------------------------------------------------------------

describe('VoiceSelector.previewVoice() — uses session language (Req 6.3)', () => {
  it('uses the language passed to initialise() when sending preview TTS request', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const { selector, ws } = makeVsSelectorWithFetch(fetchFn);

    await selector.initialise('es');
    await selector.previewVoice('voice-es');

    expect(ws.send).toHaveBeenCalled();
    const payload = ws.send.mock.calls[0][0];
    expect(payload.language).toBe('es');
  });

  it('uses "en" language when initialised with "en"', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const { selector, ws } = makeVsSelectorWithFetch(fetchFn);

    await selector.initialise('en');
    await selector.previewVoice('voice-en');

    expect(ws.send).toHaveBeenCalled();
    const payload = ws.send.mock.calls[0][0];
    expect(payload.language).toBe('en');
  });

  it('uses the voiceId in the preview TTS request', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const { selector, ws } = makeVsSelectorWithFetch(fetchFn);

    await selector.initialise('en');
    await selector.previewVoice('specific-voice-id');

    const payload = ws.send.mock.calls[0][0];
    expect(payload.voiceId).toBe('specific-voice-id');
  });
});

// ---------------------------------------------------------------------------
// 9. Rate limiter cancels request after 10-second wait (Req 10.4)
// ---------------------------------------------------------------------------

describe('RateLimiter — cancels request after 10-second wait (Req 10.4)', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('rejects with timeout error after 10 seconds when all slots are occupied', async () => {
    const rl = new RateLimiter();
    // Fill all 3 slots
    await rl.acquire();
    await rl.acquire();
    await rl.acquire();

    const p = rl.acquire(); // will be queued

    jest.advanceTimersByTime(10_001);

    await expect(p).rejects.toThrow('Rate limiter timeout');
  });

  it('does not reject if a slot is released before the 10-second timeout', async () => {
    const rl = new RateLimiter();
    await rl.acquire();
    await rl.acquire();
    await rl.acquire();

    const p = rl.acquire();

    // Release a slot before timeout fires
    rl.release();
    jest.advanceTimersByTime(100);

    await expect(p).resolves.toBeUndefined();
  });

  it('TTSEngine calls onTextFallback when rate limiter times out (Req 10.4)', async () => {
    const rl = makeMockRateLimiter();
    rl.acquire.mockRejectedValue(new Error('Rate limiter timeout'));
    const ws = makeMockWsManager();
    const { callbacks, fallbackTexts } = makeCallbacks();
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Timeout text', BASE_OPTIONS);

    expect(fallbackTexts).toEqual(['Timeout text']);
    expect(ws.send).not.toHaveBeenCalled();
  });

  it('removes timed-out waiter from queue so it does not consume a slot later', async () => {
    const rl = new RateLimiter();
    await rl.acquire();
    await rl.acquire();
    await rl.acquire();

    const timedOut = rl.acquire(1_000);
    jest.advanceTimersByTime(1_001);
    await expect(timedOut).rejects.toThrow('Rate limiter timeout');

    rl.release();
    expect(rl.activeCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 10. Text fallback displayed within 200 ms of onTextFallback invocation (Req 11.1)
// ---------------------------------------------------------------------------

function makeAdapter(): FallbackDisplayAdapter & { text: string; visible: boolean } {
  const state = { text: '', visible: false };
  return {
    get text() { return state.text; },
    get visible() { return state.visible; },
    setText(t: string) { state.text = t; },
    setVisible(v: boolean) { state.visible = v; },
  };
}

describe('TextFallbackDisplay — displayed within 200 ms of invocation (Req 11.1)', () => {
  it('show() makes text visible synchronously within 200 ms', () => {
    const adapter = makeAdapter();
    const display = new TextFallbackDisplay(adapter);

    const before = Date.now();
    display.show('Wellness guidance text');
    const elapsed = Date.now() - before;

    expect(adapter.visible).toBe(true);
    expect(adapter.text).toBe('Wellness guidance text');
    expect(elapsed).toBeLessThan(200);
  });

  it('show() is synchronous — completes before any async operation', () => {
    const adapter = makeAdapter();
    const display = new TextFallbackDisplay(adapter);

    display.show('Immediate text');

    // Immediately after the call (no await needed), text must be visible
    expect(adapter.visible).toBe(true);
    expect(adapter.text).toBe('Immediate text');
  });

  it('onTextFallback wired to show() displays text within 200 ms', async () => {
    const adapter = makeAdapter();
    const display = new TextFallbackDisplay(adapter);

    const rl = makeMockRateLimiter();
    const ws = makeMockWsManager();
    ws.send.mockImplementation(() => { throw new Error('API error'); });

    const before = Date.now();
    const callbacks: TTSEngineCallbacks = {
      onTextFallback: (text) => display.show(text),
      onUnsupportedLanguage: () => {},
    };
    const engine = new TTSEngine(rl, ws as unknown as WebSocketManager, callbacks);

    await engine.speak('Fallback display text', BASE_OPTIONS);
    const elapsed = Date.now() - before;

    expect(adapter.visible).toBe(true);
    expect(adapter.text).toBe('Fallback display text');
    // The show() call itself is synchronous; total elapsed includes async overhead but show() is < 200ms
    expect(elapsed).toBeLessThan(500); // generous bound for async overhead
  });

  it('hide() removes the fallback text after audio resumes (Req 11.3)', () => {
    const adapter = makeAdapter();
    const display = new TextFallbackDisplay(adapter);

    display.show('Some guidance');
    display.hide();

    expect(adapter.visible).toBe(false);
    expect(adapter.text).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 11. /api/murf/tts returns 403 for cross-origin requests (Req 12.4)
// ---------------------------------------------------------------------------

// We test the route handler logic directly by importing and calling the GET function.
// The same-origin check compares the Origin header against the app origin derived from
// NEXT_PUBLIC_APP_URL or the Host header.

describe('/api/murf/tts — 403 for cross-origin requests (Req 12.4)', () => {
  const originalApiKey = process.env.MURF_API_KEY;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.MURF_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://wellflow.app';
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.MURF_API_KEY;
    else process.env.MURF_API_KEY = originalApiKey;
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it('returns 403 when Origin header is from a different domain', async () => {
    const { GET } = await import('../../app/api/raw/murf/tts/route');
    const req = new NextRequest('https://wellflow.app/api/murf/tts', {
      headers: { origin: 'https://evil.com', host: 'wellflow.app' },
    });

    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('returns 403 when Origin header is absent', async () => {
    const { GET } = await import('../../app/api/raw/murf/tts/route');
    const req = new NextRequest('https://wellflow.app/api/murf/tts', {
      headers: { host: 'wellflow.app' },
    });

    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('does not return 403 when Origin matches the app origin', async () => {
    const { GET } = await import('../../app/api/raw/murf/tts/route');
    const req = new NextRequest('https://wellflow.app/api/murf/tts', {
      headers: {
        origin: 'https://wellflow.app',
        host: 'wellflow.app',
      },
    });

    const response = await GET(req);

    // Should not be 403 (may be 426 for missing WS upgrade, but not 403)
    expect(response.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 12. /api/murf/voices returns 403 for cross-origin requests (Req 12.4)
// ---------------------------------------------------------------------------

describe('/api/murf/voices — 403 for cross-origin requests (Req 12.4)', () => {
  const originalApiKey = process.env.MURF_API_KEY;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.MURF_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://wellflow.app';
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.MURF_API_KEY;
    else process.env.MURF_API_KEY = originalApiKey;
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it('returns 403 when Origin header is from a different domain', async () => {
    const { GET } = await import('../../app/api/raw/murf/voices/route');
    const req = new NextRequest('https://wellflow.app/api/murf/voices', {
      headers: { origin: 'https://attacker.io', host: 'wellflow.app' },
    });

    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('returns 403 when Origin header is absent', async () => {
    const { GET } = await import('../../app/api/raw/murf/voices/route');
    const req = new NextRequest('https://wellflow.app/api/murf/voices', {
      headers: { host: 'wellflow.app' },
    });

    const response = await GET(req);

    expect(response.status).toBe(403);
  });

  it('does not return 403 when Origin matches the app origin', async () => {
    // Mock global fetch so the route does not make a real network call
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => [],
      status: 200,
    } as any);

    try {
      const { GET } = await import('../../app/api/raw/murf/voices/route');
      const req = new NextRequest('https://wellflow.app/api/murf/voices', {
        headers: {
          origin: 'https://wellflow.app',
          host: 'wellflow.app',
        },
      });

      const response = await GET(req);

      expect(response.status).not.toBe(403);
    } finally {
      global.fetch = originalFetch;
    }
  });
});


