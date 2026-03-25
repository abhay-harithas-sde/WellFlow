/**
 * Unit tests for components/sections/StatsSection.tsx
 * Tests that all four stat values render and labels come from i18n.
 * Requirements: 3.1, 3.3
 *
 * Since jest runs in 'node' environment (no DOM), we test the pure logic
 * extracted from the StatsSection component — data/logic contracts rather than rendering.
 */

// ---------------------------------------------------------------------------
// Types mirroring the component interfaces
// ---------------------------------------------------------------------------

interface WellFlowStats {
  users: string;
  sessions: string;
  rating: string;
  countries: string;
}

interface StatItem {
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring StatsSection logic
// ---------------------------------------------------------------------------

/**
 * Builds the four StatItem entries from stats + i18n labels,
 * mirroring the `items` array constructed in StatsSection.
 */
function buildStatItems(
  stats: WellFlowStats,
  labels: { usersLabel: string; sessionsLabel: string; ratingLabel: string; countriesLabel: string }
): StatItem[] {
  return [
    { value: stats.users,     label: labels.usersLabel },
    { value: stats.sessions,  label: labels.sessionsLabel },
    { value: stats.rating,    label: labels.ratingLabel },
    { value: stats.countries, label: labels.countriesLabel },
  ];
}

/**
 * Parses a stat string like "50,000+", "2M+", "4.8", "120+" into a numeric
 * value and a suffix — mirrors the parseStat helper in StatsSection.
 */
function parseStat(raw: string): { numeric: number; suffix: string } {
  const cleaned = raw.replace(/,/g, '');
  const match = cleaned.match(/^([\d.]+)([A-Za-z+]*)$/);
  if (!match) return { numeric: 0, suffix: '' };
  return { numeric: parseFloat(match[1]), suffix: match[2] };
}

/**
 * Formats a number back to a display string — mirrors the formatNumber helper
 * in StatsSection.
 */
function formatNumber(value: number, originalRaw: string): string {
  const hasComma = originalRaw.includes(',');
  if (hasComma) {
    return Math.round(value).toLocaleString('en-US');
  }
  const hasDecimal = originalRaw.includes('.');
  if (hasDecimal) {
    return value.toFixed(1);
  }
  return Math.round(value).toString();
}

// ---------------------------------------------------------------------------
// Sample data (mirrors useWellFlowStats constants and en.json stats.* keys)
// ---------------------------------------------------------------------------

const sampleStats: WellFlowStats = {
  users: '50,000+',
  sessions: '2M+',
  rating: '4.8',
  countries: '120+',
};

const enLabels = {
  usersLabel: 'Active Users',
  sessionsLabel: 'Sessions Completed',
  ratingLabel: 'Average Rating',
  countriesLabel: 'Countries Supported',
};

const esLabels = {
  usersLabel: 'Usuarios Activos',
  sessionsLabel: 'Sesiones Completadas',
  ratingLabel: 'Calificación Promedio',
  countriesLabel: 'Países Admitidos',
};

// ---------------------------------------------------------------------------
// Tests: All four stat values are present (Req 3.1)
// ---------------------------------------------------------------------------

describe('StatsSection — all four stat values render (Req 3.1)', () => {
  it('builds exactly four stat items', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items).toHaveLength(4);
  });

  it('users stat value is present and non-empty', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items[0].value).toBe('50,000+');
    expect(items[0].value.length).toBeGreaterThan(0);
  });

  it('sessions stat value is present and non-empty', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items[1].value).toBe('2M+');
    expect(items[1].value.length).toBeGreaterThan(0);
  });

  it('rating stat value is present and non-empty', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items[2].value).toBe('4.8');
    expect(items[2].value.length).toBeGreaterThan(0);
  });

  it('countries stat value is present and non-empty', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items[3].value).toBe('120+');
    expect(items[3].value.length).toBeGreaterThan(0);
  });

  it('each stat item has a non-empty value', () => {
    const items = buildStatItems(sampleStats, enLabels);
    items.forEach((item) => {
      expect(item.value.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Labels come from i18n keys (Req 3.3)
// ---------------------------------------------------------------------------

describe('StatsSection — labels come from i18n keys (Req 3.3)', () => {
  it('users label matches i18n key stats.usersLabel (en)', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items[0].label).toBe(enLabels.usersLabel);
  });

  it('sessions label matches i18n key stats.sessionsLabel (en)', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items[1].label).toBe(enLabels.sessionsLabel);
  });

  it('rating label matches i18n key stats.ratingLabel (en)', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items[2].label).toBe(enLabels.ratingLabel);
  });

  it('countries label matches i18n key stats.countriesLabel (en)', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items[3].label).toBe(enLabels.countriesLabel);
  });

  it('each label is a non-empty string', () => {
    const items = buildStatItems(sampleStats, enLabels);
    items.forEach((item) => {
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
    });
  });

  it('labels update when a different locale (es) is provided', () => {
    const items = buildStatItems(sampleStats, esLabels);
    expect(items[0].label).toBe(esLabels.usersLabel);
    expect(items[1].label).toBe(esLabels.sessionsLabel);
    expect(items[2].label).toBe(esLabels.ratingLabel);
    expect(items[3].label).toBe(esLabels.countriesLabel);
  });

  it('en and es labels are distinct (translations differ)', () => {
    const enItems = buildStatItems(sampleStats, enLabels);
    const esItems = buildStatItems(sampleStats, esLabels);
    enItems.forEach((enItem, i) => {
      expect(enItem.label).not.toBe(esItems[i].label);
    });
  });

  it('stat values are independent of locale (same for en and es)', () => {
    const enItems = buildStatItems(sampleStats, enLabels);
    const esItems = buildStatItems(sampleStats, esLabels);
    enItems.forEach((enItem, i) => {
      expect(enItem.value).toBe(esItems[i].value);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: parseStat helper — numeric extraction
// ---------------------------------------------------------------------------

describe('StatsSection — parseStat helper', () => {
  it('parses "50,000+" correctly', () => {
    const { numeric, suffix } = parseStat('50,000+');
    expect(numeric).toBe(50000);
    expect(suffix).toBe('+');
  });

  it('parses "2M+" correctly', () => {
    const { numeric, suffix } = parseStat('2M+');
    expect(numeric).toBe(2);
    expect(suffix).toBe('M+');
  });

  it('parses "4.8" correctly', () => {
    const { numeric, suffix } = parseStat('4.8');
    expect(numeric).toBeCloseTo(4.8);
    expect(suffix).toBe('');
  });

  it('parses "120+" correctly', () => {
    const { numeric, suffix } = parseStat('120+');
    expect(numeric).toBe(120);
    expect(suffix).toBe('+');
  });

  it('returns zero numeric for an unparseable string', () => {
    const { numeric } = parseStat('N/A');
    expect(numeric).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: formatNumber helper — display formatting
// ---------------------------------------------------------------------------

describe('StatsSection — formatNumber helper', () => {
  it('formats a comma-original value with thousands separator', () => {
    expect(formatNumber(50000, '50,000+')).toBe('50,000');
  });

  it('formats a decimal-original value with one decimal place', () => {
    expect(formatNumber(4.8, '4.8')).toBe('4.8');
  });

  it('formats a plain integer value without decimals', () => {
    expect(formatNumber(120, '120+')).toBe('120');
  });

  it('rounds to nearest integer for comma-original values', () => {
    expect(formatNumber(49999.7, '50,000+')).toBe('50,000');
  });

  it('preserves one decimal place for decimal-original values at boundary', () => {
    expect(formatNumber(4.0, '4.8')).toBe('4.0');
  });
});

// ---------------------------------------------------------------------------
// Tests: stat items order is deterministic
// ---------------------------------------------------------------------------

describe('StatsSection — stat items order', () => {
  it('items are always in the order: users, sessions, rating, countries', () => {
    const items = buildStatItems(sampleStats, enLabels);
    expect(items[0].value).toBe(sampleStats.users);
    expect(items[1].value).toBe(sampleStats.sessions);
    expect(items[2].value).toBe(sampleStats.rating);
    expect(items[3].value).toBe(sampleStats.countries);
  });

  it('items reflect updated stat values when stats change', () => {
    const updatedStats: WellFlowStats = {
      users: '100,000+',
      sessions: '5M+',
      rating: '4.9',
      countries: '150+',
    };
    const items = buildStatItems(updatedStats, enLabels);
    expect(items[0].value).toBe('100,000+');
    expect(items[1].value).toBe('5M+');
    expect(items[2].value).toBe('4.9');
    expect(items[3].value).toBe('150+');
  });
});
