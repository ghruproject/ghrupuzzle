import type { ScoreResult } from './scoring';

interface SubmissionReceipt {
  submissionId: string;
  status: 'scored';
  provisional: true;
}

export function buildSubmissionReceipt(
  mode: 'practice' | 'challenge',
  submissionId: string,
  score: ScoreResult,
): SubmissionReceipt | (SubmissionReceipt & {
  earned: number;
  possible: number;
  passed: boolean;
  details: ScoreResult;
}) {
  const receipt: SubmissionReceipt = {
    submissionId,
    status: 'scored',
    provisional: true,
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
