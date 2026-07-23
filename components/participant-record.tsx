'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'Europe/London',
});

interface Submission {
  id: string;
  original_filename: string;
  submitted_at: string;
  status: string;
  earned: number | null;
  possible: number | null;
  passed: number | null;
  provisional: number | null;
}

interface Certificate {
  id: string;
  public_code: string;
  issued_at: string;
  revoked_at: string | null;
  round_title: string;
}

export function ParticipantRecord() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/submissions').then((response) => response.json() as Promise<{ submissions: Submission[] }>),
      fetch('/api/certificates').then((response) => response.json() as Promise<{ certificates: Certificate[] }>),
    ]).then(([submissionResult, certificateResult]) => {
      setSubmissions(submissionResult.submissions ?? []);
      setCertificates(certificateResult.certificates ?? []);
    });
  }, []);

  async function requestReview(submissionId: string) {
    const reason = window.prompt('Briefly explain what should be reviewed:');
    if (!reason) return;
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ submissionId, reason }),
    });
    if (response.ok) {
      setSubmissions((current) =>
        current.map((item) => item.id === submissionId ? { ...item, status: 'flagged' } : item),
      );
    }
  }

  return (
    <>
      <section id="submissions" className="card md:col-span-2 scroll-mt-24">
        <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Your submissions</h2>
        {submissions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr>
                  {['File', 'Submitted', 'Score', 'Status', ''].map((label) => (
                    <th
                      key={label || 'actions'}
                      className="px-4 py-3 border-b border-[var(--gx-border)] text-left text-xs uppercase tracking-wider text-[var(--gx-text-muted)]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">{submission.original_filename}</td>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">{dateTimeFormatter.format(new Date(submission.submitted_at))}</td>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">{submission.earned == null ? '—' : `${submission.earned}/${submission.possible}`}</td>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">{submission.provisional ? 'Provisional' : submission.status}</td>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">
                      {!['flagged', 'reviewed'].includes(submission.status) ? (
                        <button className="gx-btn gx-btn-secondary" onClick={() => requestReview(submission.id)}>
                          Request review
                        </button>
                      ) : submission.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[var(--gx-text-muted)]">
            No submissions yet. Choose a <Link href="/practice">practice exercise</Link> to get started.
          </p>
        )}
      </section>
      <section className="card">
        <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Your certificates</h2>
        {certificates.length ? certificates.map((certificate) => (
          <article key={certificate.id}>
            <h3 className="text-lg font-semibold text-[var(--gx-text)]">{certificate.round_title}</h3>
            <p className="text-[var(--gx-text-muted)]">Issued {dateFormatter.format(new Date(certificate.issued_at))}</p>
            {certificate.revoked_at ? <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">Revoked</span> : (
              <div className="flex flex-wrap gap-3 mt-4">
                <a className="gx-btn gx-btn-primary" href={`/api/certificates/${certificate.id}/download`}>Download PDF</a>
                <Link className="gx-btn gx-btn-secondary" href={`/verify/${certificate.public_code}`}>Verify</Link>
              </div>
            )}
          </article>
        )) : (
          <p className="text-[var(--gx-text-muted)]">
            Official certificates will appear here after a completed challenge has been assessed.
          </p>
        )}
      </section>
    </>
  );
}
