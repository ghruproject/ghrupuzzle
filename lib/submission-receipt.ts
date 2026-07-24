import type { ScoreResult } from './scoring';

interface SubmissionReceipt {
  submissionId: string;
  attemptNumber: number;
  submittedAt: string;
  status: 'scored';
  provisional: boolean;
}

export function buildSubmissionReceipt(
  mode: 'practice' | 'challenge',
  submissionId: string,
  attemptNumber: number,
  submittedAt: string,
  score: ScoreResult,
): SubmissionReceipt | (SubmissionReceipt & {
  earned: number;
  possible: number;
  passed: boolean;
  details: ScoreResult;
}) {
  const receipt: SubmissionReceipt = {
    submissionId,
    attemptNumber,
    submittedAt,
    status: 'scored',
    provisional: mode === 'challenge',
  };
  if (mode === 'challenge') {
    return receipt;
  }
  return {
    ...receipt,
    earned: score.earned,
    possible: score.possible,
    passed: score.passed,
    details: score,
  };
}
