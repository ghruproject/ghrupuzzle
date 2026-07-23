export const NEXT_CHALLENGE = {
  slug: 'ghru-challenge-2026',
  title: 'GHRU Challenge 2026',
  opensAt: '2026-08-17T00:00:00+01:00',
  closesAt: '2026-08-31T23:59:59+01:00',
  dateLabel: '17–31 August 2026',
} as const;

export function challengePhase(now = new Date()): 'upcoming' | 'open' | 'closed' {
  if (now < new Date(NEXT_CHALLENGE.opensAt)) return 'upcoming';
  if (now <= new Date(NEXT_CHALLENGE.closesAt)) return 'open';
  return 'closed';
}
