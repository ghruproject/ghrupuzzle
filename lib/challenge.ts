export type ChallengePhase = 'upcoming' | 'open' | 'closed';

export interface ChallengeRoundRecord {
  id: string;
  slug: string;
  title: string;
  registration_mode: 'open' | 'invite';
  registration_opens_at: string | null;
  opens_at: string;
  closes_at: string;
  status: 'published' | 'closed';
}

export interface PublicChallengeRound {
  id: string;
  slug: string;
  title: string;
  registrationMode: 'open' | 'invite';
  registrationOpensAt: string | null;
  opensAt: string;
  closesAt: string;
  status: 'published' | 'closed';
  phase: ChallengePhase;
  dateLabel: string;
}

export interface PublicChallengeSchedule {
  featured: PublicChallengeRound | null;
  rounds: PublicChallengeRound[];
}

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  timeZone: 'Europe/London',
});

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  timeZone: 'Europe/London',
});

const yearFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  timeZone: 'Europe/London',
});

export function challengePhase(
  round: Pick<ChallengeRoundRecord, 'opens_at' | 'closes_at'>,
  now = new Date(),
): ChallengePhase {
  if (now < new Date(round.opens_at)) return 'upcoming';
  if (now <= new Date(round.closes_at)) return 'open';
  return 'closed';
}

export function challengeDateLabel(
  round: Pick<ChallengeRoundRecord, 'opens_at' | 'closes_at'>,
): string {
  const opens = new Date(round.opens_at);
  const closes = new Date(round.closes_at);
  const openDay = dayFormatter.format(opens);
  const closeDay = dayFormatter.format(closes);
  const openMonth = monthFormatter.format(opens);
  const closeMonth = monthFormatter.format(closes);
  const openYear = yearFormatter.format(opens);
  const closeYear = yearFormatter.format(closes);

  if (openYear === closeYear && openMonth === closeMonth) {
    return `${openDay}–${closeDay} ${closeMonth} ${closeYear}`;
  }
  if (openYear === closeYear) {
    return `${openDay} ${openMonth}–${closeDay} ${closeMonth} ${closeYear}`;
  }
  return `${openDay} ${openMonth} ${openYear}–${closeDay} ${closeMonth} ${closeYear}`;
}

export function toPublicChallengeRound(
  round: ChallengeRoundRecord,
  now = new Date(),
): PublicChallengeRound {
  return {
    id: round.id,
    slug: round.slug,
    title: round.title,
    registrationMode: round.registration_mode,
    registrationOpensAt: round.registration_opens_at,
    opensAt: round.opens_at,
    closesAt: round.closes_at,
    status: round.status,
    phase: challengePhase(round, now),
    dateLabel: challengeDateLabel(round),
  };
}

export function selectFeaturedChallenge(
  rounds: PublicChallengeRound[],
): PublicChallengeRound | null {
  return (
    rounds.find((round) => round.phase === 'open') ??
    rounds.find((round) => round.phase === 'upcoming') ??
    null
  );
}

export function phaseLabel(phase: ChallengePhase): string {
  if (phase === 'open') return 'Open now';
  if (phase === 'upcoming') return 'Upcoming';
  return 'Closed';
}
