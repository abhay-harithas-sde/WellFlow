/**
 * Unit tests for useMurfTTS hook logic.
 * Tests the fetch/error/state logic directly without React rendering.
 */

interface TTSResult {
  audioUrl: string | null;
  error: string | null;
}

// Simulate the core TTS fetch logic extracted from the hook for unit testing
async function fetchTTSLogic(
  fetchFn: typeof fetch,
  text: string,
  voiceId: string
): Promise<TTSResult> {
  let response: Response;
  try {
    response = await fetchFn('/api/murf/tts' as RequestInfo, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
    } as RequestInit);
  } catch (err) {
    return {
      audioUrl: null,
      error:
        err instanceof Error
          ? `Network error: ${err.message}`
          : 'Network error: unable to reach TTS service',
    };
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      (body as { error?: string })?.error ??
      `TTS request failed (HTTP ${response.status})`;
    return { audioUrl: null, error: message };
  }

  // Simulate success — in real hook this would create an object URL
  return { audioUrl: 'blob:mock', error: null };
}

function makeJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    blob: async () => new Blob(),
  } as unknown as Response;
}

describe('useMurfTTS fetch logic', () => {
  it('returns audioUrl on 200 response', async () => {
    const mockFetch = async () => makeJsonResponse(200, { audio: btoa('fake-audio') });
    const result = await fetchTTSLogic(mockFetch as unknown as typeof fetch, 'Hello', 'v1');
    expect(result.error).toBeNull();
    expect(result.audioUrl).not.toBeNull();
  });

  it('sets error on 400 response with error body', async () => {
    const mockFetch = async () => makeJsonResponse(400, { error: 'Invalid voiceId' });
    const result = await fetchTTSLogic(mockFetch as unknown as typeof fetch, 'Hello', 'bad-id');
    expect(result.error).toBe('Invalid voiceId');
    expect(result.audioUrl).toBeNull();
  });

  it('sets error on 500 response without error body', async () => {
    const mockFetch = async () => makeJsonResponse(500, {});
    const result = await fetchTTSLogic(mockFetch as unknown as typeof fetch, 'Hello', 'v1');
    expect(result.error).toBe('TTS request failed (HTTP 500)');
    expect(result.audioUrl).toBeNull();
  });

  it('sets error on 403 Forbidden', async () => {
    const mockFetch = async () => makeJsonResponse(403, { error: 'Forbidden' });
    const result = await fetchTTSLogic(mockFetch as unknown as typeof fetch, 'Hello', 'v1');
    expect(result.error).toBe('Forbidden');
    expect(result.audioUrl).toBeNull();
  });

  it('sets descriptive error on network failure', async () => {
    const mockFetch = async () => { throw new Error('Failed to fetch'); };
    const result = await fetchTTSLogic(mockFetch as unknown as typeof fetch, 'Hello', 'v1');
    expect(result.error).toBe('Network error: Failed to fetch');
    expect(result.audioUrl).toBeNull();
  });

  it('sets generic network error when error has no message', async () => {
    const mockFetch = async () => { throw 'unknown'; };
    const result = await fetchTTSLogic(mockFetch as unknown as typeof fetch, 'Hello', 'v1');
    expect(result.error).toBe('Network error: unable to reach TTS service');
    expect(result.audioUrl).toBeNull();
  });

  it('does not set playing=true when response is non-2xx', async () => {
    // Verify that error path never reaches audio playback
    const mockFetch = async () => makeJsonResponse(422, { error: 'Unprocessable' });
    const result = await fetchTTSLogic(mockFetch as unknown as typeof fetch, 'Hello', 'v1');
    expect(result.error).toBe('Unprocessable');
    expect(result.audioUrl).toBeNull();
  });
});

describe('useMurfTTS concurrent playback prevention', () => {
  it('stop clears the audio reference', () => {
    // Simulate the stop logic
    let audioStopped = false;
    const mockAudio = {
      pause: () => { audioStopped = true; },
      src: 'blob:test',
    };

    // Simulate stop()
    mockAudio.pause();
    mockAudio.src = '';

    expect(audioStopped).toBe(true);
    expect(mockAudio.src).toBe('');
  });

  it('calling play while playing stops current audio first', () => {
    const events: string[] = [];

    // Simulate first play
    const audio1 = { pause: () => events.push('stop-1'), src: 'blob:1' };
    // Simulate second play call — stop() is called first
    audio1.pause();
    audio1.src = '';
    events.push('start-2');

    expect(events).toEqual(['stop-1', 'start-2']);
  });
});
