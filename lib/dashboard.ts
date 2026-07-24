import {
  challengeDateLabel,
  challengePhase,
  type ChallengePhase,
} from './challenge';
import type {
  CourseExercise,
  CourseSubmission,
  SubmissionMode,
} from './course-progress';

export interface DashboardSubmission extends CourseSubmission {
  id: string;
  release_id: string;
  attempt_number: number;
  original_filename: string;
  status: string;
  provisional: number | null;
}

export interface DashboardRound {
  id: string;
  slug: string;
  title: string;
  registration_mode: 'open' | 'invite';
  registration_opens_at: string | null;
  opens_at: string;
  closes_at: string;
  status: string;
  enrolment_status: string | null;
}

export interface DashboardCertificate {
  id: string;
  public_code: string;
  issued_at: string;
  revoked_at: string | null;
  round_title: string;
}

export interface SubmissionHistory {
  latest: DashboardSubmission[];
  earlier: DashboardSubmission[];
}

export const EXERCISE_LABELS: Record<CourseExercise, string> = {
  assembly: 'Short-read assembly',
  hybrid: 'Hybrid assembly',
  typing: 'Genotyping',
  outbreak: 'Outbreak analysis',
};

export function dashboardRoundPhase(
  round: DashboardRound,
  now = new Date(),
): ChallengePhase {
  return challengePhase(round, now);
}

export function dashboardRoundDate(round: DashboardRound): string {
  return challengeDateLabel(round);
}

export function selectDashboardRound(
  rounds: DashboardRound[],
  now = new Date(),
): DashboardRound | null {
  const ordered = [...rounds].sort(
    (left, right) =>
      new Date(left.opens_at).getTime() - new Date(right.opens_at).getTime(),
  );
  return (
    ordered.find((round) => dashboardRoundPhase(round, now) === 'open') ??
    ordered.find((round) => dashboardRoundPhase(round, now) === 'upcoming') ??
    [...ordered].reverse().find(
      (round) => dashboardRoundPhase(round, now) === 'closed',
    ) ??
    null
  );
}

export function activeEnrolledChallenge(
  rounds: DashboardRound[],
  now = new Date(),
): DashboardRound | null {
  return (
    rounds.find(
      (round) =>
        dashboardRoundPhase(round, now) === 'open' &&
        round.enrolment_status === 'active',
    ) ?? null
  );
}

export function partitionSubmissionHistory(
  submissions: DashboardSubmission[],
): SubmissionHistory {
  const ordered = [...submissions].sort(
    (left, right) =>
      new Date(right.submitted_at).getTime() -
      new Date(left.submitted_at).getTime(),
  );
  const seen = new Set<string>();
  const latest: DashboardSubmission[] = [];
  const earlier: DashboardSubmission[] = [];

  for (const submission of ordered) {
    const key = `${submission.mode}:${submission.exercise}`;
    if (seen.has(key)) {
      earlier.push(submission);
    } else {
      seen.add(key);
      latest.push(submission);
    }
  }
  return { latest, earlier };
}

export function submissionStatusLabel(
  submission: Pick<
    DashboardSubmission,
    'status' | 'passed' | 'provisional'
  >,
): 'Passed' | 'Submitted' | 'Under review' | 'Reviewed' {
  if (submission.status === 'reviewed') return 'Reviewed';
  if (submission.status === 'flagged') return 'Under review';
  if (submission.passed === 1 && !submission.provisional) return 'Passed';
  return 'Submitted';
}

export function submissionModeLabel(mode: SubmissionMode): string {
  return mode === 'practice' ? 'Practice' : 'Challenge';
}
