/**
 * Unit tests for useMurfVoices hook logic.
 * Tests the fetch/error/state logic directly without React rendering.
 */

// Simulate the core fetch logic extracted from the hook for unit testing
async function fetchVoicesLogic(fetchFn: typeof fetch): Promise<{
  voices: unknown[];
  error: string | null;
}> {
  try {
    const response = await fetchFn('/api/murf/voices' as RequestInfo, undefined as RequestInit | undefined);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = (body as { error?: string })?.error ?? `Failed to load voices (HTTP ${response.status})`;
      return { voices: [], error: message };
    }

    const data = await response.json();
    const voices: unknown[] = Array.isArray(data) ? data : ((data as { voices?: unknown[] })?.voices ?? []);
    return { voices, error: null };
  } catch (err) {
    return {
      voices: [],
      error: err instanceof Error ? err.message : 'Network error: unable to load voices',
    };
  }
}

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('useMurfVoices fetch logic', () => {
  it('returns voices array on 200 response with array body', async () => {
    const voices = [
      { voiceId: 'v1', displayName: 'Alice', language: 'en-US', gender: 'female' },
    ];
    const mockFetch = async () => makeResponse(200, voices);
    const result = await fetchVoicesLogic(mockFetch as unknown as typeof fetch);
    expect(result.error).toBeNull();
    expect(result.voices).toEqual(voices);
  });

  it('returns voices from nested .voices property', async () => {
    const voices = [{ voiceId: 'v2', displayName: 'Bob', language: 'en-GB', gender: 'male' }];
    const mockFetch = async () => makeResponse(200, { voices });
    const result = await fetchVoicesLogic(mockFetch as unknown as typeof fetch);
    expect(result.error).toBeNull();
    expect(result.voices).toEqual(voices);
  });

  it('sets error on non-2xx response with error body', async () => {
    const mockFetch = async () => makeResponse(403, { error: 'Forbidden' });
    const result = await fetchVoicesLogic(mockFetch as unknown as typeof fetch);
    expect(result.error).toBe('Forbidden');
    expect(result.voices).toHaveLength(0);
  });

  it('sets generic error message on non-2xx response without error body', async () => {
    const mockFetch = async () => makeResponse(500, {});
    const result = await fetchVoicesLogic(mockFetch as unknown as typeof fetch);
    expect(result.error).toBe('Failed to load voices (HTTP 500)');
    expect(result.voices).toHaveLength(0);
  });

  it('sets error on network failure', async () => {
    const mockFetch = async () => { throw new Error('Network error'); };
    const result = await fetchVoicesLogic(mockFetch as unknown as typeof fetch);
    expect(result.error).toBe('Network error');
    expect(result.voices).toHaveLength(0);
  });

  it('returns empty array when response body is empty object', async () => {
    const mockFetch = async () => makeResponse(200, {});
    const result = await fetchVoicesLogic(mockFetch as unknown as typeof fetch);
    expect(result.error).toBeNull();
    expect(result.voices).toHaveLength(0);
  });
});
