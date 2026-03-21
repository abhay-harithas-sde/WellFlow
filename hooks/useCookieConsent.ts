import { useState, useEffect } from 'react';

export type ConsentRecord = {
  version: 1;
  accepted: boolean;
  timestamp: number;
};

export interface ConsentState {
  decided: boolean;
  accepted: boolean;
}

export const COOKIE_NAME = 'wellflow_cookie_consent';
const COOKIE_EXPIRY_DAYS = 365;

function setCookie(name: string, value: string, days: number): void {
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  } catch {
    // Cookie write unavailable — in-memory state is used
  }
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`));
    if (!match) return null;
    return decodeURIComponent(match.split('=').slice(1).join('='));
  } catch {
    return null;
  }
}

function readConsentCookie(): ConsentRecord | null {
  try {
    const raw = getCookie(COOKIE_NAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version === 1 && typeof parsed.accepted === 'boolean') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeConsentCookie(record: ConsentRecord): void {
  setCookie(COOKIE_NAME, JSON.stringify(record), COOKIE_EXPIRY_DAYS);
}

export function useCookieConsent(): ConsentState & {
  accept: () => void;
  decline: () => void;
} {
  const [state, setState] = useState<ConsentState>({
    decided: false,
    accepted: false,
  });

  useEffect(() => {
    const record = readConsentCookie();
    if (record) {
      setState({ decided: true, accepted: record.accepted });
    }
  }, []);

  const accept = () => {
    const record: ConsentRecord = {
      version: 1,
      accepted: true,
      timestamp: Date.now(),
    };
    writeConsentCookie(record);
    setState({ decided: true, accepted: true });
  };

  const decline = () => {
    const record: ConsentRecord = {
      version: 1,
      accepted: false,
      timestamp: Date.now(),
    };
    writeConsentCookie(record);
    setState({ decided: true, accepted: false });
  };

  return { ...state, accept, decline };
}
