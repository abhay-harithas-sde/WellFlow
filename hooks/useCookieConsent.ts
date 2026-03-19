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

const STORAGE_KEY = 'wf_cookie_consent';

function readFromStorage(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function writeToStorage(record: ConsentRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable (private browsing, quota exceeded) — in-memory state is used
  }
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
    const record = readFromStorage();
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
    writeToStorage(record);
    setState({ decided: true, accepted: true });
  };

  const decline = () => {
    const record: ConsentRecord = {
      version: 1,
      accepted: false,
      timestamp: Date.now(),
    };
    writeToStorage(record);
    setState({ decided: true, accepted: false });
  };

  return { ...state, accept, decline };
}
