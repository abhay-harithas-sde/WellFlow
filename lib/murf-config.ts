export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export function getMurfApiKey(): string {
  const key = process.env.MURF_API_KEY;
  if (!key || key.trim() === '') {
    throw new ConfigurationError(
      'MURF_API_KEY environment variable is absent or empty. Set it in .env.local before starting the server.'
    );
  }
  return key;
}
