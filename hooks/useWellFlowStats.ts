export interface WellFlowStats {
  users: string;
  sessions: string;
  rating: string;
  countries: string;
}

const STATS: WellFlowStats = {
  users: '50,000+',
  sessions: '2M+',
  rating: '4.8',
  countries: '120+',
};

export function useWellFlowStats(): WellFlowStats {
  return STATS;
}
