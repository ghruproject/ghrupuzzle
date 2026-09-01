export const CHALLENGE_EXERCISES = ['typing', 'assembly', 'hybrid', 'outbreak'] as const;

export type ChallengeExercise = (typeof CHALLENGE_EXERCISES)[number];

export type AdminExerciseProgress = {
  exercise: ChallengeExercise;
  releaseId: string | null;
  attempts: number;
  latestSubmittedAt: string | null;
  validSubmission: boolean;
  scored: boolean;
  provisional: boolean;
  passedFinal: boolean;
  openReviews: number;
  status:
    | 'Not submitted'
    | 'Submitted'
    | 'Awaiting finalisation'
    | 'Review pending'
    | 'Passed'
    | 'Not passed';
};

export type AdminRoundParticipant = {
  userId: string;
  name: string;
  email: string;
  enrolledAt: string;
  isAdministrator: boolean;
  exercises: AdminExerciseProgress[];
  attempts: number;
  completedExercises: number;
  passedExercises: number;
  provisionalScores: number;
  openReviews: number;
  activeCertificateId: string | null;
  certificateCode: string | null;
  overallStatus:
    | 'Not started'
    | 'In progress'
    | 'Awaiting finalisation'
    | 'Review pending'
    | 'Eligible'
    | 'Not eligible'
    | 'Issued';
  eligible: boolean;
};

export type AdminRoundCompletion = {
  round: {
    id: string;
    slug: string;
    title: string;
    opensAt: string;
    closesAt: string;
    status: string;
    closed: boolean;
  };
  releases: Array<{
    id: string;
    releaseId: string;
    exercise: ChallengeExercise;
  }>;
  participants: AdminRoundParticipant[];
  summary: {
    enrolledParticipants: number;
    administratorEnrolments: number;
    completed: number;
    incomplete: number;
    notStarted: number;
    reviewPending: number;
    awaitingFinalisation: number;
    eligible: number;
    issued: number;
    provisionalScores: number;
  };
};

type RawRound = {
  id: string;
  slug: string;
  title: string;
  opens_at: string;
  closes_at: string;
  status: string;
};

type RawRelease = {
  id: string;
  release_id: string;
  exercise: ChallengeExercise;
};

type RawEnrollee = {
  user_id: string;
  name: string;
  email: string;
  enrolled_at: string;
  is_administrator: number;
  active_certificate_id: string | null;
  certificate_code: string | null;
};

type RawSubmission = {
  id: string;
  user_id: string;
  exercise: ChallengeExercise;
  release_id: string;
  submitted_at: string;
  status: string;
  score_id: string | null;
  passed: number | null;
  provisional: number | null;
  open_reviews: number;
};

function exerciseProgress(
  exercise: ChallengeExercise,
  releaseId: string | null,
  submissions: RawSubmission[],
): AdminExerciseProgress {
  const valid = submissions.filter((submission) => submission.status !== 'invalid');
  const latest = valid[0] ?? submissions[0] ?? null;
  const openReviews = submissions.reduce(
    (total, submission) => total + Number(submission.open_reviews || 0),
    0,
  );
  const passedFinal = submissions.some(
    (submission) => submission.passed === 1 && submission.provisional === 0,
  );
  const provisional = submissions.some((submission) => submission.provisional === 1);
  const scored = submissions.some((submission) => Boolean(submission.score_id));
  const hasFinalScore = submissions.some((submission) => submission.provisional === 0);

  let status: AdminExerciseProgress['status'];
  if (!valid.length) status = 'Not submitted';
  else if (openReviews > 0) status = 'Review pending';
  else if (passedFinal) status = 'Passed';
  else if (provisional) status = 'Awaiting finalisation';
  else if (hasFinalScore) status = 'Not passed';
  else status = 'Submitted';

  return {
    exercise,
    releaseId,
    attempts: submissions.length,
    latestSubmittedAt: latest?.submitted_at ?? null,
    validSubmission: valid.length > 0,
    scored,
    provisional,
    passedFinal,
    openReviews,
    status,
  };
}

export function buildRoundParticipant(
  enrollee: RawEnrollee,
  releases: RawRelease[],
  submissions: RawSubmission[],
  closed: boolean,
): AdminRoundParticipant {
  const exercises = CHALLENGE_EXERCISES.map((exercise) => {
    const release = releases.find((candidate) => candidate.exercise === exercise);
    return exerciseProgress(
      exercise,
      release?.release_id ?? null,
      submissions.filter((submission) => submission.exercise === exercise),
    );
  });
  const completedExercises = exercises.filter((exercise) => exercise.validSubmission).length;
  const passedExercises = exercises.filter((exercise) => exercise.passedFinal).length;
  const openReviews = exercises.reduce((total, exercise) => total + exercise.openReviews, 0);
  const provisionalScores = submissions.filter((submission) => submission.provisional === 1).length;
  const allReleasesRegistered = CHALLENGE_EXERCISES.every((exercise) =>
    releases.some((release) => release.exercise === exercise),
  );
  const eligible = Boolean(
    closed
      && allReleasesRegistered
      && passedExercises === CHALLENGE_EXERCISES.length
      && openReviews === 0
      && !enrollee.active_certificate_id,
  );

  let overallStatus: AdminRoundParticipant['overallStatus'];
  if (enrollee.active_certificate_id) overallStatus = 'Issued';
  else if (openReviews > 0) overallStatus = 'Review pending';
  else if (eligible) overallStatus = 'Eligible';
  else if (completedExercises === 0) overallStatus = 'Not started';
  else if (completedExercises < CHALLENGE_EXERCISES.length) overallStatus = 'In progress';
  else if (provisionalScores > 0 || !closed) overallStatus = 'Awaiting finalisation';
  else overallStatus = 'Not eligible';

  return {
    userId: enrollee.user_id,
    name: enrollee.name,
    email: enrollee.email,
    enrolledAt: enrollee.enrolled_at,
    isAdministrator: Boolean(enrollee.is_administrator),
    exercises,
    attempts: submissions.length,
    completedExercises,
    passedExercises,
    provisionalScores,
    openReviews,
    activeCertificateId: enrollee.active_certificate_id,
    certificateCode: enrollee.certificate_code,
    overallStatus,
    eligible,
  };
}

export async function getAdminRoundCompletion(
  db: D1Database,
  roundId: string,
): Promise<AdminRoundCompletion | null> {
  const round = await db.prepare(
    `SELECT id, slug, title, opens_at, closes_at, status
       FROM assessment_round WHERE id = ?`,
  ).bind(roundId).first<RawRound>();
  if (!round) return null;

  const [releaseRows, enrolleeRows, submissionRows] = await Promise.all([
    db.prepare(
      `SELECT id, release_id, exercise
         FROM dataset_release
        WHERE round_id = ? AND mode = 'challenge'
        ORDER BY CASE exercise
          WHEN 'typing' THEN 1 WHEN 'assembly' THEN 2
          WHEN 'hybrid' THEN 3 WHEN 'outbreak' THEN 4 ELSE 5 END`,
    ).bind(roundId).all<RawRelease>(),
    db.prepare(
      `SELECT u.id AS user_id, u.name, u.email, e.enrolled_at,
              MAX(CASE WHEN ae.email IS NOT NULL THEN 1 ELSE 0 END) AS is_administrator,
              MAX(CASE WHEN c.revoked_at IS NULL THEN c.id END) AS active_certificate_id,
              MAX(CASE WHEN c.revoked_at IS NULL THEN c.public_code END) AS certificate_code
         FROM enrolment e
         JOIN user u ON u.id = e.user_id
         LEFT JOIN administrator_email ae ON ae.email = u.email COLLATE NOCASE
         LEFT JOIN certificate c ON c.user_id = u.id AND c.round_id = e.round_id
        WHERE e.round_id = ? AND e.status = 'active'
        GROUP BY u.id, e.enrolled_at
        ORDER BY u.name COLLATE NOCASE, u.email COLLATE NOCASE`,
    ).bind(roundId).all<RawEnrollee>(),
    db.prepare(
      `SELECT s.id, s.user_id, d.exercise, d.release_id, s.submitted_at,
              s.status, sc.id AS score_id, sc.passed, sc.provisional,
              COUNT(DISTINCT CASE
                WHEN rv.status IN ('requested', 'in_review') THEN rv.id
              END) AS open_reviews
         FROM submission s
         JOIN dataset_release d ON d.id = s.release_id
         LEFT JOIN score sc ON sc.submission_id = s.id
         LEFT JOIN review rv ON rv.submission_id = s.id
        WHERE d.round_id = ? AND d.mode = 'challenge'
        GROUP BY s.id
        ORDER BY datetime(s.submitted_at) DESC, s.attempt_number DESC`,
    ).bind(roundId).all<RawSubmission>(),
  ]);

  const closed = new Date() > new Date(round.closes_at);
  const participants = enrolleeRows.results.map((enrollee) =>
    buildRoundParticipant(
      enrollee,
      releaseRows.results,
      submissionRows.results.filter((submission) => submission.user_id === enrollee.user_id),
      closed,
    ),
  );
  const realParticipants = participants.filter((participant) => !participant.isAdministrator);

  return {
    round: {
      id: round.id,
      slug: round.slug,
      title: round.title,
      opensAt: round.opens_at,
      closesAt: round.closes_at,
      status: round.status,
      closed,
    },
    releases: releaseRows.results.map((release) => ({
      id: release.id,
      releaseId: release.release_id,
      exercise: release.exercise,
    })),
    participants,
    summary: {
      enrolledParticipants: realParticipants.length,
      administratorEnrolments: participants.length - realParticipants.length,
      completed: realParticipants.filter(
        (participant) => participant.completedExercises === CHALLENGE_EXERCISES.length,
      ).length,
      incomplete: realParticipants.filter(
        (participant) => participant.completedExercises < CHALLENGE_EXERCISES.length,
      ).length,
      notStarted: realParticipants.filter((participant) => participant.completedExercises === 0).length,
      reviewPending: realParticipants.filter((participant) => participant.openReviews > 0).length,
      awaitingFinalisation: realParticipants.filter(
        (participant) => participant.overallStatus === 'Awaiting finalisation',
      ).length,
      eligible: realParticipants.filter((participant) => participant.eligible).length,
      issued: realParticipants.filter((participant) => Boolean(participant.activeCertificateId)).length,
      provisionalScores: realParticipants.reduce(
        (total, participant) => total + participant.provisionalScores,
        0,
      ),
    },
  };
}
