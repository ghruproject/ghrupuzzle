import Link from 'next/link';
import type { DashboardCertificate } from '@/lib/dashboard';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'Europe/London',
});

export function CertificatePanel({
  certificates,
}: {
  certificates: DashboardCertificate[];
}) {
  if (!certificates.length) return null;

  return (
    <section className="card" aria-labelledby="certificate-title">
      <div className="mb-5">
        <div className="mb-2 inline-flex text-xs font-extrabold uppercase tracking-widest text-[var(--gx-accent)]">
          Achievement
        </div>
        <h2
          id="certificate-title"
          className="m-0 text-2xl font-bold text-[var(--gx-text)]"
        >
          Certificates
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {certificates.map((certificate) => (
          <article
            key={certificate.id}
            className="rounded-xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-lg font-bold text-[var(--gx-text)]">
                  {certificate.round_title}
                </h3>
                <p className="mb-0 mt-1 text-sm text-[var(--gx-text-muted)]">
                  Issued {dateFormatter.format(new Date(certificate.issued_at))}
                </p>
              </div>
              {certificate.revoked_at ? (
                <span className="inline-flex rounded-full bg-[var(--gx-accent-dim)] px-2.5 py-1 text-xs font-bold text-[var(--gx-text-bright)]">
                  Revoked
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--gx-success)_10%,transparent)] px-2.5 py-1 text-xs font-bold text-[var(--gx-success)]">
                  ✓ Issued
                </span>
              )}
            </div>
            {!certificate.revoked_at ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  className="gx-btn gx-btn-primary"
                  href={`/api/certificates/${certificate.id}/download`}
                >
                  Download PDF
                </a>
                <Link
                  className="gx-btn gx-btn-secondary"
                  href={`/verify/${certificate.public_code}`}
                >
                  Verify certificate
                </Link>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
