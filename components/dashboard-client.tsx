'use client';

import { useEffect, useState } from 'react';
import { CertificatePanel } from '@/components/certificate-panel';
import { CourseProgress } from '@/components/course-progress';
import { DashboardHeader } from '@/components/dashboard-header';
import { ParticipantRecord } from '@/components/participant-record';
import { RoundList } from '@/components/round-list';
import type {
  DashboardCertificate,
  DashboardRound,
  DashboardSubmission,
} from '@/lib/dashboard';

export function DashboardClient({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [submissions, setSubmissions] = useState<DashboardSubmission[]>([]);
  const [rounds, setRounds] = useState<DashboardRound[]>([]);
  const [certificates, setCertificates] = useState<DashboardCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/submissions').then(async (response) => {
        if (!response.ok) throw new Error('Submission history could not be loaded.');
        return response.json() as Promise<{
          submissions: DashboardSubmission[];
        }>;
      }),
      fetch('/api/rounds').then(async (response) => {
        if (!response.ok) throw new Error('Challenge status could not be loaded.');
        return response.json() as Promise<{ rounds: DashboardRound[] }>;
      }),
      fetch('/api/certificates').then(async (response) => {
        if (!response.ok) throw new Error('Certificates could not be loaded.');
        return response.json() as Promise<{
          certificates: DashboardCertificate[];
        }>;
      }),
    ])
      .then(([submissionResult, roundResult, certificateResult]) => {
        setSubmissions(submissionResult.submissions ?? []);
        setRounds(roundResult.rounds ?? []);
        setCertificates(certificateResult.certificates ?? []);
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Some dashboard information could not be loaded.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function updateRound(updatedRound: DashboardRound) {
    setRounds((current) =>
      current.map((round) =>
        round.id === updatedRound.id ? updatedRound : round,
      ),
    );
  }

  function updateSubmission(updatedSubmission: DashboardSubmission) {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === updatedSubmission.id
          ? updatedSubmission
          : submission,
      ),
    );
  }

  return (
    <>
      <DashboardHeader
        displayName={displayName}
        email={email}
        onNameChange={setDisplayName}
      />
      {message ? (
        <p
          className="mb-6 rounded-xl border border-[var(--gx-border)] bg-[var(--gx-surface)] px-4 py-3 text-sm text-[var(--gx-error)]"
          role="alert"
        >
          {message}
        </p>
      ) : null}
      <CourseProgress submissions={submissions} rounds={rounds} loading={loading} />
      <RoundList
        rounds={rounds}
        certificateCount={certificates.length}
        loading={loading}
        onRoundChange={updateRound}
      />
      <ParticipantRecord
        submissions={submissions}
        loading={loading}
        onSubmissionChange={updateSubmission}
      />
      <CertificatePanel certificates={certificates} />
    </>
  );
}
