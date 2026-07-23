import { getEnv } from '@/lib/cloudflare';
import { DEMO_MODE } from '@/lib/demo';

export const dynamic = 'force-dynamic';

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (DEMO_MODE && code === 'demo-preview') {
    return (
      <div className="gx-page">
        <section className="card gx-auth-card">
          <div className="gx-kicker">Credential verification · preview</div>
          <h1>Valid demonstration certificate</h1>
          <dl>
            <dt>Participant</dt><dd>Demo Participant</dd>
            <dt>Assessment</dt><dd>2026 GHRU Puzzles Preview Round</dd>
            <dt>Issued</dt><dd>23 July 2026</dd>
            <dt>Credential</dt><dd>demo-preview</dd>
          </dl>
          <p className="gx-muted">Preview only — this is not a real credential.</p>
        </section>
      </div>
    );
  }
  const env = await getEnv();
  const certificate = await env.DB.prepare(
    `SELECT c.public_code, c.issued_at, c.revoked_at, c.revocation_reason,
            u.name, r.title
       FROM certificate c
       JOIN user u ON u.id = c.user_id
       JOIN assessment_round r ON r.id = c.round_id
      WHERE c.public_code = ?`,
  )
    .bind(code)
    .first<Record<string, unknown>>();
  const valid = certificate && !certificate.revoked_at;
  return (
    <div className="gx-page">
      <section className="card gx-auth-card">
        <div className="gx-kicker">Credential verification</div>
        {!certificate ? (
          <>
            <h1>Certificate not found</h1>
            <p className="gx-muted">This credential code is not recognised.</p>
          </>
        ) : (
          <>
            <h1>{valid ? 'Valid certificate' : 'Revoked certificate'}</h1>
            <dl>
              <dt>Participant</dt><dd>{String(certificate.name)}</dd>
              <dt>Assessment</dt><dd>{String(certificate.title)}</dd>
              <dt>Issued</dt><dd>{new Date(String(certificate.issued_at)).toLocaleDateString('en-GB')}</dd>
              <dt>Credential</dt><dd>{String(certificate.public_code)}</dd>
            </dl>
            {!valid ? (
              <p className="gx-message-error">
                Revoked: {String(certificate.revocation_reason ?? 'No reason supplied')}
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
