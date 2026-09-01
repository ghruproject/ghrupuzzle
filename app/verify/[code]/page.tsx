import Link from 'next/link';
import { getEnv } from '@/lib/cloudflare';
import { privatePageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = privatePageMetadata('Certificate verification');

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/London',
});

function VerificationMark({ valid }: { valid: boolean }) {
  return (
    <span
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 ${
        valid
          ? 'border-emerald-200 bg-emerald-500 text-white dark:border-emerald-900'
          : 'border-red-200 bg-red-500 text-white dark:border-red-900'
      }`}
      aria-hidden="true"
    >
      {valid ? (
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 8v5m0 3h.01" strokeLinecap="round" />
          <path d="M10.3 4.2 2.8 17.1A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.9L13.7 4.2a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const env = await getEnv();
  const certificate = await env.DB.prepare(
    `SELECT c.public_code, c.issued_at, c.revoked_at, c.revocation_reason,
            COALESCE(NULLIF(u.name, ''), u.email) AS name, r.title
       FROM certificate c
       JOIN user u ON u.id = c.user_id
       JOIN assessment_round r ON r.id = c.round_id
      WHERE c.public_code = ?`,
  )
    .bind(code)
    .first<Record<string, unknown>>();

  if (!certificate) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <section className="overflow-hidden rounded-3xl border border-red-400/30 bg-[var(--gx-surface)] shadow-xl shadow-slate-950/5">
          <div className="border-b border-red-400/20 bg-red-500/10 px-6 py-8 sm:px-10">
            <VerificationMark valid={false} />
            <p className="mb-2 mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-red-600 dark:text-red-300">Credential verification</p>
            <h1 className="m-0 text-3xl font-bold leading-tight text-[var(--gx-text)] sm:text-4xl">Certificate not found</h1>
            <p className="mb-0 mt-3 max-w-xl text-base leading-7 text-[var(--gx-text-muted)]">
              This credential code is not recognised. Check that the full QR-code address was opened and try again.
            </p>
          </div>
          <div className="px-6 py-6 sm:px-10">
            <Link className="gx-btn gx-btn-secondary" href="/about">About GHRUPUZZLES</Link>
          </div>
        </section>
      </main>
    );
  }

  const valid = !certificate.revoked_at;
  const participantName = String(certificate.name);
  const roundTitle = String(certificate.title);
  const publicCode = String(certificate.public_code);
  const issuedDate = DATE_FORMAT.format(new Date(String(certificate.issued_at)));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-14">
      <section className={`overflow-hidden rounded-3xl border bg-[var(--gx-surface)] shadow-xl shadow-slate-950/5 ${valid ? 'border-emerald-400/30' : 'border-red-400/30'}`}>
        <div className={`border-b px-6 py-8 sm:px-10 sm:py-10 ${valid ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-red-400/20 bg-red-500/10'}`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <VerificationMark valid={valid} />
            <div>
              <p className={`mb-2 mt-0 text-xs font-extrabold uppercase tracking-[0.18em] ${valid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                {valid ? 'Authentic GHRUPUZZLES credential' : 'Credential no longer valid'}
              </p>
              <h1 className="m-0 text-3xl font-bold leading-tight text-[var(--gx-text)] sm:text-4xl">
                {valid ? 'Certificate verified' : 'Certificate revoked'}
              </h1>
              <p className="mb-0 mt-3 max-w-xl text-base leading-7 text-[var(--gx-text-muted)]">
                {valid
                  ? 'This public record confirms that the certificate is authentic and remains valid.'
                  : 'This certificate was previously issued but is no longer valid.'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <p className="m-0 text-sm font-semibold text-[var(--gx-text-muted)]">Awarded to</p>
          <h2 className="mb-0 mt-2 text-3xl font-bold leading-tight text-[var(--gx-text)] sm:text-4xl">
            {participantName}
          </h2>
          <p className="mb-0 mt-4 max-w-2xl text-base leading-7 text-[var(--gx-text-muted)]">
            Successfully passed all required assessments for <strong className="text-[var(--gx-text)]">{roundTitle}</strong>.
          </p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-bg-alt)] p-4">
              <dt className="text-xs font-bold uppercase tracking-wider text-[var(--gx-text-muted)]">Assessment</dt>
              <dd className="mb-0 ml-0 mt-2 text-lg font-bold text-[var(--gx-text)]">{roundTitle}</dd>
            </div>
            <div className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-bg-alt)] p-4">
              <dt className="text-xs font-bold uppercase tracking-wider text-[var(--gx-text-muted)]">Issued</dt>
              <dd className="mb-0 ml-0 mt-2 text-lg font-bold text-[var(--gx-text)]">{issuedDate}</dd>
            </div>
          </dl>

          {!valid ? (
            <div className="mt-5 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm leading-6 text-red-700 dark:text-red-300" role="alert">
              <strong className="block">Revocation notice</strong>
              {String(certificate.revocation_reason ?? 'No reason was supplied.')}
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-[var(--gx-border)] p-4">
            <p className="m-0 text-xs font-bold uppercase tracking-wider text-[var(--gx-text-muted)]">Credential ID</p>
            <p className="mb-0 mt-2 break-all font-mono text-sm font-semibold tracking-wide text-[var(--gx-text)]">{publicCode}</p>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-[var(--gx-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong className="block text-sm text-[var(--gx-text)]">Verified by GHRUPUZZLES</strong>
              <span className="mt-1 block text-sm text-[var(--gx-text-muted)]">Microbial genome benchmarking exercises</span>
            </div>
            <Link className="gx-btn gx-btn-secondary justify-center" href="/about">About GHRUPUZZLES</Link>
          </div>
        </div>
      </section>
      <p className="mx-auto mb-0 mt-5 max-w-xl text-center text-xs leading-5 text-[var(--gx-text-muted)]">
        This verification page is public so that certificate recipients, employers and training organisations can confirm a credential without signing in.
      </p>
    </main>
  );
}
