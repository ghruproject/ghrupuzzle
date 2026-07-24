import type { AdminCertificateCandidate, AdminRound } from '@/lib/admin';

export type AdminRoundPhase = 'Upcoming' | 'Open' | 'Closed';

export function adminRoundPhase(
  round: Pick<AdminRound, 'opens_at' | 'closes_at'>,
  now = new Date(),
): AdminRoundPhase {
  if (now < new Date(round.opens_at)) return 'Upcoming';
  if (now <= new Date(round.closes_at)) return 'Open';
  return 'Closed';
}

export function certificateCandidateStatus(
  candidate: Pick<
    AdminCertificateCandidate,
    'passed_exercises' | 'open_reviews' | 'active_certificate_id'
  >,
): 'Issued' | 'Ready to issue' | 'Review pending' | 'Results incomplete' {
  if (candidate.active_certificate_id) return 'Issued';
  if (Number(candidate.open_reviews) > 0) return 'Review pending';
  if (Number(candidate.passed_exercises) === 4) return 'Ready to issue';
  return 'Results incomplete';
}

export function parseInvitationList(
  value: string,
): Array<{ email: string; name?: string }> {
  const invitations = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [emailPart, ...nameParts] = line.split(',');
      const email = emailPart.trim().toLowerCase();
      const name = nameParts.join(',').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error(`Invalid email address: ${email || line}`);
      }
      return name ? { email, name } : { email };
    });

  if (!invitations.length) {
    throw new Error('Enter at least one email address.');
  }
  if (invitations.length > 1000) {
    throw new Error('Import no more than 1,000 invitations at a time.');
  }
  return invitations;
}

export function normaliseAdministratorEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 254
    ? email
    : null;
}
