'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DEMO_MODE } from '@/lib/demo';

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
  const [submissions, setSubmissions] = useState<Submission[]>(
    DEMO_MODE
      ? [{
          id: 'demo-submission',
          original_filename: 'typing-results.csv',
          submitted_at: '2026-07-23T10:30:00Z',
          status: 'scored',
          earned: 34,
          possible: 36,
          passed: 1,
          provisional: 1,
        }]
      : [],
  );
  const [certificates, setCertificates] = useState<Certificate[]>(
    DEMO_MODE
      ? [{
          id: 'demo-certificate',
          public_code: 'demo-preview',
          issued_at: '2026-07-23T12:00:00Z',
          revoked_at: null,
          round_title: '2026 GHRU Puzzles Preview Round',
        }]
      : [],
  );

  useEffect(() => {
    if (DEMO_MODE) return;
    Promise.all([
      fetch('/api/submissions').then((response) => response.json() as Promise<{ submissions: Submission[] }>),
      fetch('/api/certificates').then((response) => response.json() as Promise<{ certificates: Certificate[] }>),
    ]).then(([submissionResult, certificateResult]) => {
      setSubmissions(submissionResult.submissions ?? []);
      setCertificates(certificateResult.certificates ?? []);
    });
  }, []);

  async function requestReview(submissionId: string) {
    if (DEMO_MODE) {
      setSubmissions((current) =>
        current.map((item) =>
          item.id === submissionId ? { ...item, status: 'flagged' } : item,
        ),
      );
      return;
    }
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
      <section className="card gx-panel gx-panel-wide">
        <h2>Your submissions</h2>
        {submissions.length ? (
          <div className="gx-table-wrap">
            <table className="gx-table">
              <thead><tr><th>File</th><th>Submitted</th><th>Score</th><th>Status</th><th /></tr></thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>{submission.original_filename}</td>
                    <td>{new Date(submission.submitted_at).toLocaleString()}</td>
                    <td>{submission.earned == null ? '—' : `${submission.earned}/${submission.possible}`}</td>
                    <td>{submission.provisional ? 'Provisional' : submission.status}</td>
                    <td>
                      {!['flagged', 'reviewed'].includes(submission.status) ? (
                        <button className="gx-button gx-button-secondary" onClick={() => requestReview(submission.id)}>
                          Request review
                        </button>
                      ) : submission.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="gx-muted">No submissions yet.</p>}
      </section>
      <section className="card gx-panel">
        <h2>Your certificates</h2>
        {certificates.length ? certificates.map((certificate) => (
          <article key={certificate.id}>
            <h3>{certificate.round_title}</h3>
            <p className="gx-muted">Issued {new Date(certificate.issued_at).toLocaleDateString()}</p>
            {certificate.revoked_at ? <span className="gx-tag">Revoked</span> : (
              <div className="gx-button-row">
                {DEMO_MODE ? null : (
                  <a className="gx-button" href={`/api/certificates/${certificate.id}/download`}>Download PDF</a>
                )}
                <Link className="gx-button gx-button-secondary" href={`/verify/${certificate.public_code}`}>Verify</Link>
              </div>
            )}
          </article>
        )) : <p className="gx-muted">No certificates issued yet.</p>}
      </section>
    </>
  );
}
