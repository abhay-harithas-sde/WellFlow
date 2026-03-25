import { getMurfApiKey, ConfigurationError } from '../../lib/murf-config';

describe('getMurfApiKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
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

  it('returns the API key when MURF_API_KEY is present', () => {
    process.env.MURF_API_KEY = 'test-api-key-123';
    expect(getMurfApiKey()).toBe('test-api-key-123');
  });

  it('ConfigurationError has the correct name', () => {
    delete process.env.MURF_API_KEY;
    expect(() => getMurfApiKey()).toThrow(expect.objectContaining({ name: 'ConfigurationError' }));
  });
});
