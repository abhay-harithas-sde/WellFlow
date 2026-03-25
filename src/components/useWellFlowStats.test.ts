import { useWellFlowStats } from '../../hooks/useWellFlowStats';

describe('useWellFlowStats', () => {
  it('returns the expected static stats', () => {
    const stats = useWellFlowStats();
    expect(stats.users).toBe('50,000+');
    expect(stats.sessions).toBe('2M+');
    expect(stats.rating).toBe('4.8');
    expect(stats.countries).toBe('120+');
  });

  it('returns the same reference on every call', () => {
    expect(useWellFlowStats()).toBe(useWellFlowStats());
  });

  it('returns all four required fields', () => {
    const stats = useWellFlowStats();
    expect(stats).toHaveProperty('users');
    expect(stats).toHaveProperty('sessions');
    expect(stats).toHaveProperty('rating');
    expect(stats).toHaveProperty('countries');
  });
});
