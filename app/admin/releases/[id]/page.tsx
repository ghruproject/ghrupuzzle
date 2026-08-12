import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminAnswerReveal } from '@/components/admin-answer-reveal';
import { createAuth } from '@/lib/auth';
import { getEnv } from '@/lib/cloudflare';
import { hasAdministratorAccess } from '@/lib/assessment';
import {
  getAdminReleaseDetails,
  listAdminPrivateFiles,
} from '@/lib/admin-release-details';
import type { ScoringPolicy } from '@/lib/release-contract';
import { privatePageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = privatePageMetadata('Private release details');

function fileKind(path: string): string {
  if (path === 'answer_key.json') return 'Answer key';
  if (path === 'scoring_policy.json') return 'Scoring policy';
  if (path === 'validation_report.json') return 'Validation report';
  if (path === 'provenance.json') return 'Provenance';
  if (path === 'implant_manifest.json') return 'Implant manifest';
  return 'Tool output';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminReleaseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const returnTo = `/admin/releases/${encodeURIComponent(id)}`;
  const session = await (await createAuth()).api.getSession({ headers: await headers() });
  if (!session) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);

  const env = await getEnv();
  if (!(await hasAdministratorAccess(env.DB, session.user.email))) redirect('/dashboard');
  const release = await getAdminReleaseDetails(env.DB, id);
  if (!release) notFound();

  const policyKey = `${release.privatePrefix}scoring_policy.json`;
  const [privateFiles, policyObject] = await Promise.all([
    listAdminPrivateFiles(env.PRIVATE_ASSETS, release),
    env.PRIVATE_ASSETS.get(policyKey),
  ]);
  if (!policyObject) throw new Error('Registered scoring policy is unavailable');
  const scoringPolicy = (await policyObject.json()) as ScoringPolicy;
  if (
    scoringPolicy.release_id !== release.releaseId
    || scoringPolicy.schema_version !== release.schemaVersion
  ) {
    throw new Error('Registered scoring policy does not match this release');
  }

  await env.DB.prepare(
    `INSERT INTO audit_event
       (id, actor_user_id, action, target_type, target_id, after_json)
     VALUES (?, ?, 'release.details_viewed', 'dataset_release', ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      session.user.id,
      release.id,
      JSON.stringify({ releaseId: release.releaseId }),
    )
    .run();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link className="text-sm font-semibold" href="/admin">← Back to administration</Link>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gx-accent)]">
            Private release details
          </p>
          <h1 className="mb-2 mt-2 break-all text-3xl font-bold text-[var(--gx-text)]">
            {release.releaseId}
          </h1>
          <p className="m-0 text-[var(--gx-text-muted)]">
            {release.roundTitle || 'Practice'} · {release.exercise} · {release.mode} · schema {release.schemaVersion}
          </p>
        </div>
        <span className="inline-flex self-start rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-300">
          Administrator only
        </span>
      </div>

      <section className="mt-8 rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="answers-title">
        <h2 id="answers-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Answers</h2>
        <p className="mb-5 mt-2 text-sm text-[var(--gx-text-muted)]">
          Sample-level private truth used by the scorer. It is not loaded until you reveal it.
        </p>
        <AdminAnswerReveal releaseId={release.id} />
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="policy-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="policy-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Scoring policy</h2>
            <p className="mb-0 mt-2 text-sm text-[var(--gx-text-muted)]">
              Pass threshold {scoringPolicy.pass_threshold}; scorer {scoringPolicy.scorer_version}.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--gx-text-muted)]">
            <div>Require all samples: {scoringPolicy.require_all_samples ? 'Yes' : 'No'}</div>
            <div>Reject unexpected samples: {scoringPolicy.reject_unexpected_samples ? 'Yes' : 'No'}</div>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--gx-border)]">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead className="bg-[var(--gx-bg-alt)]">
              <tr>
                <th className="border-b border-[var(--gx-border)] px-3 py-2">Field</th>
                <th className="border-b border-[var(--gx-border)] px-3 py-2">Scored</th>
                <th className="border-b border-[var(--gx-border)] px-3 py-2">Method</th>
                <th className="border-b border-[var(--gx-border)] px-3 py-2">Weight</th>
                <th className="border-b border-[var(--gx-border)] px-3 py-2">Condition</th>
              </tr>
            </thead>
            <tbody>
              {scoringPolicy.fields.map((field) => (
                <tr key={field.name}>
                  <td className="border-b border-[var(--gx-border)] px-3 py-2 font-semibold">{field.name}</td>
                  <td className="border-b border-[var(--gx-border)] px-3 py-2">{field.scored ? 'Yes' : 'No'}</td>
                  <td className="border-b border-[var(--gx-border)] px-3 py-2">{field.scorer}</td>
                  <td className="border-b border-[var(--gx-border)] px-3 py-2">{field.weight}</td>
                  <td className="border-b border-[var(--gx-border)] px-3 py-2">
                    {field.score_when ? `${field.score_when.field} = ${field.score_when.equals}` : 'Always'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="files-title">
        <h2 id="files-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Private files</h2>
        <p className="mb-5 mt-2 text-sm text-[var(--gx-text-muted)]">
          Files are streamed through administrator-only endpoints. Their R2 locations are never exposed.
        </p>
        <div className="overflow-x-auto rounded-xl border border-[var(--gx-border)]">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead className="bg-[var(--gx-bg-alt)]">
              <tr>
                <th className="border-b border-[var(--gx-border)] px-3 py-2">File</th>
                <th className="border-b border-[var(--gx-border)] px-3 py-2">Type</th>
                <th className="border-b border-[var(--gx-border)] px-3 py-2">Size</th>
                <th className="border-b border-[var(--gx-border)] px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {privateFiles.map((file) => {
                const endpoint = `/api/admin/releases/${encodeURIComponent(release.id)}/private-files/${file.id}`;
                const isAnswerKey = file.relativePath === 'answer_key.json';
                return (
                  <tr key={file.id}>
                    <td className="border-b border-[var(--gx-border)] px-3 py-2 font-mono text-xs">{file.relativePath}</td>
                    <td className="border-b border-[var(--gx-border)] px-3 py-2">{fileKind(file.relativePath)}</td>
                    <td className="border-b border-[var(--gx-border)] px-3 py-2">{formatBytes(file.size)}</td>
                    <td className="border-b border-[var(--gx-border)] px-3 py-2">
                      {isAnswerKey ? (
                        <a className="font-semibold" href="#answers-title">Reveal above</a>
                      ) : (
                        <span className="flex gap-3">
                          <a className="font-semibold" href={endpoint} rel="noopener noreferrer" target="_blank">View</a>
                          <a className="font-semibold" href={`${endpoint}?download=1`}>Download</a>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
