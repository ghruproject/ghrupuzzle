'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import type {
  AdminCertificate,
  AdminCertificateCandidate,
  AdminOverview,
  AdminParticipant,
  AdminRound,
} from '@/lib/admin';
import {
  adminRoundPhase,
  certificateCandidateStatus,
  parseInvitationList,
} from '@/lib/admin-helpers';

type Dialog =
  | { type: 'round' }
  | { type: 'release' }
  | { type: 'invitations' }
  | { type: 'finalize'; round: AdminRound }
  | { type: 'certificate'; candidate: AdminCertificateCandidate }
  | { type: 'revoke'; certificate: AdminCertificate }
  | { type: 'add-administrator' }
  | { type: 'remove-administrator'; email: string }
  | { type: 'password-code'; participant: AdminParticipant }
  | {
      type: 'password-code-result';
      participant: AdminParticipant;
      code: string;
      expiresAt: string;
      setupUrl: string;
    }
  | null;

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const EXERCISE_PATHS = {
  assembly: '/assembly',
  hybrid: '/hybrid-assembly',
  typing: '/typing',
  outbreak: '/outbreak',
} as const;

function formatDate(value: string | number | null): string {
  if (!value) return '—';
  const date = typeof value === 'number' && value < 10_000_000_000
    ? new Date(value * 1000)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMAT.format(date);
}

function count(value: number): number {
  return Number(value) || 0;
}

function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  const tones = {
    neutral: 'border-[var(--gx-border)] bg-[var(--gx-bg-alt)] text-[var(--gx-text-muted)]',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    danger: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    accent: 'border-[var(--gx-accent)]/30 bg-[var(--gx-accent)]/10 text-[var(--gx-accent)]',
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Modal({
  eyebrow,
  title,
  description,
  busy,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        aria-describedby="admin-dialog-description"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-5">
          <div>
            <p className="mb-1 mt-0 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gx-accent)]">
              {eyebrow}
            </p>
            <h2 id="admin-dialog-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">
              {title}
            </h2>
            <p id="admin-dialog-description" className="mb-0 mt-2 text-sm text-[var(--gx-text-muted)]">
              {description}
            </p>
          </div>
          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--gx-border)] bg-[var(--gx-surface)] text-xl text-[var(--gx-text-muted)] hover:border-[var(--gx-accent)] hover:text-[var(--gx-text)]"
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogActions({
  busy,
  submitLabel,
  busyLabel,
  danger = false,
  onCancel,
}: {
  busy: boolean;
  submitLabel: string;
  busyLabel: string;
  danger?: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-4 sm:flex-row sm:justify-end">
      <button className="gx-btn gx-btn-secondary" type="button" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
      <button
        className={danger ? 'gx-btn border-red-600 bg-red-600 text-white hover:bg-red-700' : 'gx-btn gx-btn-primary'}
        type="submit"
        disabled={busy}
      >
        {busy ? busyLabel : submitLabel}
      </button>
    </div>
  );
}

export function AdminDashboard({ administratorName }: { administratorName: string }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [participantSearch, setParticipantSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' });
      const result = (await response.json()) as AdminOverview & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Administration data could not be loaded.');
      setOverview(result);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Administration data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setDialog(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [busy, dialog]);

  const filteredParticipants = useMemo(() => {
    const query = participantSearch.trim().toLowerCase();
    if (!query) return overview?.participants ?? [];
    return (overview?.participants ?? []).filter(
      (participant) =>
        participant.name.toLowerCase().includes(query) ||
        participant.email.toLowerCase().includes(query),
    );
  }, [overview?.participants, participantSearch]);

  async function mutate(
    url: string,
    body?: unknown,
    method = 'POST',
  ): Promise<Record<string, unknown>> {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = (await response.json()) as Record<string, unknown> & { error?: string };
      if (!response.ok) throw new Error(result.error || 'The action could not be completed.');
      setDialog(null);
      await load();
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function submitRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await mutate('/api/admin/rounds', {
        slug: data.get('slug'),
        title: data.get('title'),
        registrationMode: data.get('registrationMode'),
        registrationOpensAt: toIso(data.get('registrationOpensAt')),
        opensAt: toIso(data.get('opensAt')),
        closesAt: toIso(data.get('closesAt')),
        answersReleaseAt: toIso(data.get('answersReleaseAt')),
        graceSeconds: Number(data.get('graceSeconds') || 0),
      });
      setMessage('Challenge round created and published.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Challenge round could not be created.');
    }
  }

  async function submitRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const mode = String(data.get('mode'));
    try {
      await mutate('/api/admin/releases', {
        releaseId: data.get('releaseId'),
        exercise: data.get('exercise'),
        mode,
        roundId: mode === 'challenge' ? data.get('roundId') : undefined,
        schemaVersion: data.get('schemaVersion'),
      });
      setMessage('Release contract validated and registered.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Release could not be registered.');
    }
  }

  async function submitInvitations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const invitations = parseInvitationList(String(data.get('invitations') || ''));
      await mutate('/api/admin/invitations', { roundId: data.get('roundId'), invitations });
      setMessage(`${invitations.length} invitation${invitations.length === 1 ? '' : 's'} imported.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Invitations could not be imported.');
    }
  }

  async function finalizeRound(event: FormEvent<HTMLFormElement>, round: AdminRound) {
    event.preventDefault();
    try {
      const result = await mutate(`/api/rounds/${round.id}/finalize`);
      setMessage(`${count(Number(result.finalizedScores))} score(s) finalised for ${round.title}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Scores could not be finalised.');
    }
  }

  async function issueCertificate(
    event: FormEvent<HTMLFormElement>,
    candidate: AdminCertificateCandidate,
  ) {
    event.preventDefault();
    try {
      await mutate('/api/certificates/issue', {
        userId: candidate.user_id,
        roundId: candidate.round_id,
      });
      setMessage(`Certificate issued to ${candidate.participant_name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Certificate could not be issued.');
    }
  }

  async function revokeCertificate(
    event: FormEvent<HTMLFormElement>,
    certificate: AdminCertificate,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await mutate(`/api/certificates/${certificate.id}/revoke`, {
        reason: data.get('reason'),
      });
      setMessage(`Certificate ${certificate.public_code} revoked.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Certificate could not be revoked.');
    }
  }

  async function addAdministrator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const result = await mutate('/api/admin/administrators', {
        email: data.get('email'),
      });
      setMessage(`${String(result.email)} can now access administration.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Administrator access could not be added.',
      );
    }
  }

  async function removeAdministrator(
    event: FormEvent<HTMLFormElement>,
    email: string,
  ) {
    event.preventDefault();
    try {
      await mutate('/api/admin/administrators', { email }, 'DELETE');
      setMessage(`${email} no longer has administrator access.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Administrator access could not be removed.',
      );
    }
  }

  async function generatePasswordSetupCode(
    event: FormEvent<HTMLFormElement>,
    participant: AdminParticipant,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/password-setup-codes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: participant.id }),
      });
      const result = await response.json() as {
        code?: string;
        expiresAt?: string;
        setupUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.code || !result.expiresAt || !result.setupUrl) {
        throw new Error(result.error || 'A setup code could not be created.');
      }
      setDialog({
        type: 'password-code-result',
        participant,
        code: result.code,
        expiresAt: result.expiresAt,
        setupUrl: result.setupUrl,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'A setup code could not be created.');
      setDialog(null);
    } finally {
      setBusy(false);
    }
  }

  async function copyPasswordSetupDetails(
    participant: AdminParticipant,
    setupUrl: string,
    code: string,
    expiresAt: string,
  ) {
    try {
      await navigator.clipboard.writeText([
        'GHRU Puzzles password setup',
        `Open: ${setupUrl}`,
        `Email: ${participant.email}`,
        `One-time code: ${code}`,
        `Expires: ${formatDate(expiresAt)}`,
      ].join('\n'));
      setMessage('Password setup instructions copied. Share them privately with the participant.');
    } catch {
      setMessage('Copying failed. Select and copy the setup details manually.');
    }
  }

  const metrics = overview
    ? [
        ['Participants', overview.stats.participants],
        ['Active signups', overview.stats.activeEnrolments],
        ['Submissions', overview.stats.submissions],
        ['Open reviews', overview.stats.openReviews],
        ['Registered releases', overview.stats.registeredReleases],
        ['Active certificates', overview.stats.activeCertificates],
      ]
    : [];

  return (
    <>
      <section className="mb-7 rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] px-6 py-7 shadow-sm sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 mt-0 text-xs font-extrabold uppercase tracking-widest text-[var(--gx-accent)]">
              Administration
            </p>
            <h1 className="m-0 text-3xl font-bold text-[var(--gx-text)] sm:text-4xl">
              GHRUPUZZLES operations
            </h1>
            <p className="mb-0 mt-3 text-[var(--gx-text-muted)]">
              Welcome, {administratorName}. Manage challenge delivery, assessment and certificates.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="gx-btn gx-btn-primary" href="/review">Open review queue</Link>
            <Link className="gx-btn gx-btn-secondary" href="/dashboard">Participant dashboard</Link>
            <button className="gx-btn gx-btn-secondary" type="button" onClick={() => void load()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <p
          className="mb-6 rounded-xl border border-[var(--gx-border)] bg-[var(--gx-surface)] px-4 py-3 text-sm text-[var(--gx-text)]"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section aria-labelledby="admin-overview-title" className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="admin-overview-title" className="m-0 text-2xl font-bold text-[var(--gx-text)]">Overview</h2>
            <p className="mb-0 mt-1 text-sm text-[var(--gx-text-muted)]">Current operational totals.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="gx-btn gx-btn-primary" type="button" onClick={() => setDialog({ type: 'round' })}>Create challenge</button>
            <button className="gx-btn gx-btn-secondary" type="button" onClick={() => setDialog({ type: 'release' })}>Register release</button>
            <button className="gx-btn gx-btn-secondary" type="button" onClick={() => setDialog({ type: 'invitations' })}>Import invitations</button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {(loading && !overview ? Array.from({ length: 6 }, (_, index) => [`Loading ${index}`, '—']) : metrics).map(([label, value]) => (
            <article className="rounded-xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-4 shadow-sm" key={String(label)}>
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-[var(--gx-text-muted)]">{String(label).replace(/^Loading \d$/, 'Loading')}</p>
              <p className="mb-0 mt-2 text-3xl font-bold text-[var(--gx-text)]">{value}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="rounds-title">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="rounds-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Challenge rounds</h2>
                <p className="mb-0 mt-1 text-sm text-[var(--gx-text-muted)]">Published windows, signups and assessment state.</p>
              </div>
              <button className="gx-btn gx-btn-secondary" type="button" onClick={() => setDialog({ type: 'round' })}>New round</button>
            </div>
            <div className="space-y-3">
              {overview?.rounds.length ? overview.rounds.map((round) => {
                const phase = adminRoundPhase(round);
                return (
                  <article className="rounded-xl border border-[var(--gx-border)] bg-[var(--gx-bg-alt)] p-4" key={round.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="m-0 text-base font-bold text-[var(--gx-text)]">{round.title}</h3>
                          <Badge tone={phase === 'Open' ? 'success' : phase === 'Upcoming' ? 'accent' : 'neutral'}>{phase}</Badge>
                          <Badge>{round.registration_mode === 'open' ? 'Open signup' : 'Invitation only'}</Badge>
                        </div>
                        <p className="mb-0 mt-2 text-sm text-[var(--gx-text-muted)]">
                          {formatDate(round.opens_at)} – {formatDate(round.closes_at)}
                        </p>
                      </div>
                      {phase === 'Closed' && count(round.provisional_scores) > 0 ? (
                        <button className="gx-btn gx-btn-secondary" type="button" onClick={() => setDialog({ type: 'finalize', round })}>
                          Finalise scores
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--gx-border)] pt-4 text-sm sm:grid-cols-5">
                      <span><strong>{count(round.active_enrolments)}</strong><br /><span className="text-[var(--gx-text-muted)]">signups</span></span>
                      <span><strong>{count(round.releases)}</strong><br /><span className="text-[var(--gx-text-muted)]">releases</span></span>
                      <span><strong>{count(round.submissions)}</strong><br /><span className="text-[var(--gx-text-muted)]">submissions</span></span>
                      <span><strong>{count(round.open_reviews)}</strong><br /><span className="text-[var(--gx-text-muted)]">open reviews</span></span>
                      <span><strong>{count(round.provisional_scores)}</strong><br /><span className="text-[var(--gx-text-muted)]">provisional</span></span>
                    </div>
                  </article>
                );
              }) : <p className="m-0 text-sm text-[var(--gx-text-muted)]">{loading ? 'Loading rounds…' : 'No challenge rounds have been created.'}</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="releases-title">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="releases-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Dataset releases</h2>
                <p className="mb-0 mt-1 text-sm text-[var(--gx-text-muted)]">Contracts registered from the public and private R2 buckets.</p>
              </div>
              <button className="gx-btn gx-btn-secondary" type="button" onClick={() => setDialog({ type: 'release' })}>Register</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[var(--gx-text-muted)]">
                    <th className="border-b border-[var(--gx-border)] px-3 py-2">Release</th>
                    <th className="border-b border-[var(--gx-border)] px-3 py-2">Exercise</th>
                    <th className="border-b border-[var(--gx-border)] px-3 py-2">Mode</th>
                    <th className="border-b border-[var(--gx-border)] px-3 py-2">Schema</th>
                    <th className="border-b border-[var(--gx-border)] px-3 py-2">Submissions</th>
                    <th className="border-b border-[var(--gx-border)] px-3 py-2">Page</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.releases.map((release) => (
                    <tr key={release.id}>
                      <td className="border-b border-[var(--gx-border)] px-3 py-3">
                        <strong className="text-[var(--gx-text)]">{release.release_id}</strong>
                        <span className="block text-xs text-[var(--gx-text-muted)]">{release.round_title || 'Practice'}</span>
                      </td>
                      <td className="border-b border-[var(--gx-border)] px-3 py-3 capitalize">{release.exercise}</td>
                      <td className="border-b border-[var(--gx-border)] px-3 py-3"><Badge tone={release.mode === 'challenge' ? 'accent' : 'neutral'}>{release.mode}</Badge></td>
                      <td className="border-b border-[var(--gx-border)] px-3 py-3">{release.schema_version}</td>
                      <td className="border-b border-[var(--gx-border)] px-3 py-3">{count(release.submissions)}</td>
                      <td className="border-b border-[var(--gx-border)] px-3 py-3">
                        <Link
                          className="font-semibold"
                          href={`${EXERCISE_PATHS[release.exercise]}${release.mode === 'practice' ? '/practice' : ''}`}
                        >
                          {release.mode === 'challenge' ? 'Preview' : 'Open'} →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!overview?.releases.length ? <p className="text-sm text-[var(--gx-text-muted)]">{loading ? 'Loading releases…' : 'No releases registered.'}</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="participants-title">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="participants-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Participants</h2>
                <p className="mb-0 mt-1 text-sm text-[var(--gx-text-muted)]">Accounts, active challenge signups and submission activity.</p>
              </div>
              <label className="w-full sm:w-72">
                <span className="sr-only">Search participants</span>
                <input className="gx-input w-full" type="search" placeholder="Search name or email" value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} />
              </label>
            </div>
            <div className="max-h-[480px] overflow-auto rounded-xl border border-[var(--gx-border)]">
              <table className="w-full min-w-[660px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-[var(--gx-bg-alt)]">
                  <tr className="text-xs uppercase tracking-wide text-[var(--gx-text-muted)]">
                    <th className="border-b border-[var(--gx-border)] px-4 py-3">Participant</th>
                    <th className="border-b border-[var(--gx-border)] px-4 py-3">Role</th>
                    <th className="border-b border-[var(--gx-border)] px-4 py-3">Password</th>
                    <th className="border-b border-[var(--gx-border)] px-4 py-3">Signups</th>
                    <th className="border-b border-[var(--gx-border)] px-4 py-3">Submissions</th>
                    <th className="border-b border-[var(--gx-border)] px-4 py-3">Last submission</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => (
                    <tr key={participant.id}>
                      <td className="border-b border-[var(--gx-border)] px-4 py-3">
                        <strong className="text-[var(--gx-text)]">{participant.name || 'Unnamed participant'}</strong>
                        <span className="block text-xs text-[var(--gx-text-muted)]">{participant.email}</span>
                      </td>
                      <td className="border-b border-[var(--gx-border)] px-4 py-3">
                        {count(participant.is_administrator)
                          ? 'administrator'
                          : participant.roles?.split(',').join(', ') || 'participant'}
                      </td>
                      <td className="border-b border-[var(--gx-border)] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={count(participant.password_enabled) ? 'success' : 'warning'}>
                            {count(participant.password_enabled) ? 'Set' : 'Not set'}
                          </Badge>
                          <button
                            className="text-xs font-bold text-[var(--gx-accent)] hover:underline"
                            type="button"
                            onClick={() => setDialog({ type: 'password-code', participant })}
                          >
                            Create code
                          </button>
                        </div>
                      </td>
                      <td className="border-b border-[var(--gx-border)] px-4 py-3">{count(participant.active_enrolments)}</td>
                      <td className="border-b border-[var(--gx-border)] px-4 py-3">{count(participant.submissions)}</td>
                      <td className="border-b border-[var(--gx-border)] px-4 py-3">{formatDate(participant.last_submission_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredParticipants.length ? <p className="px-4 py-3 text-sm text-[var(--gx-text-muted)]">No participants match this search.</p> : null}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="administrator-access-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="administrator-access-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Administrator access</h2>
                <p className="mb-0 mt-1 text-sm text-[var(--gx-text-muted)]">Only these email addresses can open this dashboard or use administrator APIs.</p>
              </div>
              <button className="gx-btn gx-btn-secondary shrink-0" type="button" onClick={() => setDialog({ type: 'add-administrator' })}>Add</button>
            </div>
            <div className="mt-4 space-y-3">
              {overview?.administrators.map((administrator) => {
                const finalAdministrator = overview.administrators.length === 1;
                return (
                  <article className="flex items-center justify-between gap-3 rounded-xl border border-[var(--gx-border)] bg-[var(--gx-bg-alt)] p-3" key={administrator.email}>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-[var(--gx-text)]">{administrator.email}</strong>
                      <span className="block text-xs text-[var(--gx-text-muted)]">
                        Added {formatDate(administrator.created_at)}
                      </span>
                    </div>
                    <button
                      className="shrink-0 text-xs font-bold text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-[var(--gx-text-muted)] disabled:no-underline dark:text-red-300"
                      type="button"
                      disabled={finalAdministrator}
                      title={finalAdministrator ? 'Add another administrator before removing this address' : undefined}
                      onClick={() => setDialog({ type: 'remove-administrator', email: administrator.email })}
                    >
                      Remove
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="m-0 text-xl font-bold text-[var(--gx-text)]">Review queue</h2>
                <p className="mb-0 mt-2 text-sm text-[var(--gx-text-muted)]">Resolve participant requests before finalising challenge results.</p>
              </div>
              <span className="text-3xl font-bold text-[var(--gx-text)]">{overview?.stats.openReviews ?? '—'}</span>
            </div>
            <Link className="gx-btn gx-btn-secondary mt-4 w-full justify-center" href="/review">Review submissions</Link>
          </section>

          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="certificate-candidates-title">
            <h2 id="certificate-candidates-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Certificate eligibility</h2>
            <p className="mb-4 mt-1 text-sm text-[var(--gx-text-muted)]">Closed-round participants and their final result state.</p>
            <div className="space-y-3">
              {overview?.certificateCandidates.map((candidate) => {
                const status = certificateCandidateStatus(candidate);
                const ready = status === 'Ready to issue';
                return (
                  <article className="rounded-xl border border-[var(--gx-border)] bg-[var(--gx-bg-alt)] p-4" key={`${candidate.user_id}-${candidate.round_id}`}>
                    <strong className="block text-sm text-[var(--gx-text)]">{candidate.participant_name}</strong>
                    <span className="block text-xs text-[var(--gx-text-muted)]">{candidate.round_title} · {count(candidate.passed_exercises)}/4 passed</span>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <Badge tone={ready ? 'success' : status === 'Review pending' ? 'warning' : 'neutral'}>{status}</Badge>
                      {ready ? <button className="gx-btn gx-btn-secondary py-1.5 text-xs" type="button" onClick={() => setDialog({ type: 'certificate', candidate })}>Issue</button> : null}
                    </div>
                  </article>
                );
              })}
              {!overview?.certificateCandidates.length ? <p className="m-0 text-sm text-[var(--gx-text-muted)]">No closed-round certificate candidates.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="certificates-title">
            <h2 id="certificates-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Issued certificates</h2>
            <div className="mt-4 space-y-3">
              {overview?.certificates.slice(0, 12).map((certificate) => (
                <article className="border-b border-[var(--gx-border)] pb-3 last:border-0 last:pb-0" key={certificate.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="block text-sm text-[var(--gx-text)]">{certificate.participant_name}</strong>
                      <span className="block text-xs text-[var(--gx-text-muted)]">{certificate.round_title} · {certificate.public_code}</span>
                    </div>
                    <Badge tone={certificate.revoked_at ? 'danger' : 'success'}>{certificate.revoked_at ? 'Revoked' : 'Active'}</Badge>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs font-bold">
                    <Link className="text-[var(--gx-accent)] hover:underline" href={`/certificates/verify/${certificate.public_code}`}>Verify</Link>
                    {!certificate.revoked_at ? <button className="text-red-700 hover:underline dark:text-red-300" type="button" onClick={() => setDialog({ type: 'revoke', certificate })}>Revoke</button> : null}
                  </div>
                </article>
              ))}
              {!overview?.certificates.length ? <p className="m-0 text-sm text-[var(--gx-text-muted)]">No certificates have been issued.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 shadow-sm" aria-labelledby="audit-title">
            <h2 id="audit-title" className="m-0 text-xl font-bold text-[var(--gx-text)]">Recent administration</h2>
            <div className="mt-4 space-y-3">
              {overview?.auditEvents.slice(0, 12).map((event) => (
                <div className="border-b border-[var(--gx-border)] pb-3 text-sm last:border-0" key={event.id}>
                  <strong className="block text-[var(--gx-text)]">{event.action.replaceAll('.', ' ')}</strong>
                  <span className="block text-xs text-[var(--gx-text-muted)]">{event.actor_name || event.actor_email || 'System'} · {formatDate(event.created_at)}</span>
                </div>
              ))}
              {!overview?.auditEvents.length ? <p className="m-0 text-sm text-[var(--gx-text-muted)]">No administration events recorded.</p> : null}
            </div>
          </section>
        </aside>
      </div>

      {dialog?.type === 'round' ? (
        <Modal eyebrow="Challenge delivery" title="Create challenge round" description="This publishes the round immediately. Check every date before creating it." busy={busy} onClose={() => setDialog(null)}>
          <form onSubmit={submitRound}>
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <Field label="Round title"><input className="gx-input mt-2 w-full" name="title" placeholder="Challenge 3" required /></Field>
              <Field label="URL slug"><input className="gx-input mt-2 w-full" name="slug" placeholder="challenge-3" pattern="[a-z0-9][a-z0-9-]*" required /></Field>
              <Field label="Signup mode"><select className="gx-input mt-2 w-full" name="registrationMode" defaultValue="open"><option value="open">Open signup</option><option value="invite">Invitation only</option></select></Field>
              <Field label="Signup opens (optional)"><input className="gx-input mt-2 w-full" name="registrationOpensAt" type="datetime-local" /></Field>
              <Field label="Challenge opens"><input className="gx-input mt-2 w-full" name="opensAt" type="datetime-local" required /></Field>
              <Field label="Challenge closes"><input className="gx-input mt-2 w-full" name="closesAt" type="datetime-local" required /></Field>
              <Field label="Answers released (optional)"><input className="gx-input mt-2 w-full" name="answersReleaseAt" type="datetime-local" /></Field>
              <Field label="Submission grace (seconds)"><input className="gx-input mt-2 w-full" name="graceSeconds" type="number" min="0" defaultValue="0" /></Field>
            </div>
            <DialogActions busy={busy} submitLabel="Create and publish round" busyLabel="Creating…" onCancel={() => setDialog(null)} />
          </form>
        </Modal>
      ) : null}

      {dialog?.type === 'release' ? (
        <ReleaseDialog rounds={overview?.rounds ?? []} busy={busy} onClose={() => setDialog(null)} onSubmit={submitRelease} />
      ) : null}

      {dialog?.type === 'invitations' ? (
        <Modal eyebrow="Challenge access" title="Import invitations" description="Enter one participant per line as email or email,name. Existing invitations are updated." busy={busy} onClose={() => setDialog(null)}>
          <form onSubmit={submitInvitations}>
            <div className="space-y-4 px-6 py-5">
              <Field label="Challenge round"><select className="gx-input mt-2 w-full" name="roundId" required defaultValue=""><option value="" disabled>Select a round</option>{overview?.rounds.map((round) => <option value={round.id} key={round.id}>{round.title}</option>)}</select></Field>
              <Field label="Participants"><textarea className="gx-input mt-2 min-h-44 w-full resize-y font-mono text-sm" name="invitations" placeholder={'alex@example.org,Alex Morgan\nsam@example.org'} required /></Field>
            </div>
            <DialogActions busy={busy} submitLabel="Import invitations" busyLabel="Importing…" onCancel={() => setDialog(null)} />
          </form>
        </Modal>
      ) : null}

      {dialog?.type === 'finalize' ? (
        <Modal eyebrow="Assessment control" title={`Finalise ${dialog.round.title}`} description="Scores without an open review will become final. This action is recorded in the audit log." busy={busy} onClose={() => setDialog(null)}>
          <form onSubmit={(event) => finalizeRound(event, dialog.round)}>
            <div className="px-6 py-5">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[var(--gx-text)]">
                <strong>{count(dialog.round.provisional_scores)} provisional score(s)</strong> are eligible. {count(dialog.round.open_reviews)} open review(s) will be left provisional.
              </div>
            </div>
            <DialogActions busy={busy} submitLabel="Finalise eligible scores" busyLabel="Finalising…" onCancel={() => setDialog(null)} />
          </form>
        </Modal>
      ) : null}

      {dialog?.type === 'certificate' ? (
        <Modal eyebrow="Certificate control" title="Issue certificate" description="A signed PDF will be created in private storage with a public verification record." busy={busy} onClose={() => setDialog(null)}>
          <form onSubmit={(event) => issueCertificate(event, dialog.candidate)}>
            <div className="space-y-2 px-6 py-5 text-sm">
              <p className="m-0"><strong>Participant:</strong> {dialog.candidate.participant_name} ({dialog.candidate.participant_email})</p>
              <p className="m-0"><strong>Round:</strong> {dialog.candidate.round_title}</p>
              <p className="m-0"><strong>Final passes:</strong> {count(dialog.candidate.passed_exercises)}/4</p>
            </div>
            <DialogActions busy={busy} submitLabel="Issue certificate" busyLabel="Issuing…" onCancel={() => setDialog(null)} />
          </form>
        </Modal>
      ) : null}

      {dialog?.type === 'revoke' ? (
        <Modal eyebrow="Certificate control" title="Revoke certificate" description="The verification page will show this certificate as revoked. The audit record is retained." busy={busy} onClose={() => setDialog(null)}>
          <form onSubmit={(event) => revokeCertificate(event, dialog.certificate)}>
            <div className="space-y-4 px-6 py-5">
              <p className="m-0 text-sm text-[var(--gx-text)]"><strong>{dialog.certificate.participant_name}</strong> · {dialog.certificate.public_code}</p>
              <Field label="Reason for revocation"><textarea className="gx-input mt-2 min-h-28 w-full resize-y" name="reason" required maxLength={1000} /></Field>
            </div>
            <DialogActions danger busy={busy} submitLabel="Revoke certificate" busyLabel="Revoking…" onCancel={() => setDialog(null)} />
          </form>
        </Modal>
      ) : null}

      {dialog?.type === 'add-administrator' ? (
        <Modal eyebrow="Access control" title="Add administrator" description="This address will gain administrator access as soon as it signs in, even if no account exists yet." busy={busy} onClose={() => setDialog(null)}>
          <form onSubmit={addAdministrator}>
            <div className="px-6 py-5">
              <Field label="Email address"><input className="gx-input mt-2 w-full" name="email" type="email" autoComplete="email" placeholder="name@example.org" required autoFocus /></Field>
            </div>
            <DialogActions busy={busy} submitLabel="Add administrator" busyLabel="Adding…" onCancel={() => setDialog(null)} />
          </form>
        </Modal>
      ) : null}

      {dialog?.type === 'remove-administrator' ? (
        <Modal eyebrow="Access control" title="Remove administrator" description="This address will immediately lose access to the administration dashboard and administrator APIs." busy={busy} onClose={() => setDialog(null)}>
          <form onSubmit={(event) => removeAdministrator(event, dialog.email)}>
            <div className="px-6 py-5 text-sm text-[var(--gx-text)]">
              Remove administrator access for <strong>{dialog.email}</strong>?
            </div>
            <DialogActions danger busy={busy} submitLabel="Remove administrator" busyLabel="Removing…" onCancel={() => setDialog(null)} />
          </form>
        </Modal>
      ) : null}

      {dialog?.type === 'password-code' ? (
        <Modal eyebrow="Participant access" title="Create password setup code" description="This invalidates any earlier unused setup code for this participant. Their existing password is unchanged until the new code is used." busy={busy} onClose={() => setDialog(null)}>
          <form onSubmit={(event) => generatePasswordSetupCode(event, dialog.participant)}>
            <div className="space-y-2 px-6 py-5 text-sm text-[var(--gx-text)]">
              <p className="m-0"><strong>Participant:</strong> {dialog.participant.name}</p>
              <p className="m-0"><strong>Email:</strong> {dialog.participant.email}</p>
              <p className="mb-0 mt-3 text-[var(--gx-text-muted)]">The code expires after 24 hours. Share it through a private channel; it will be displayed only once here.</p>
            </div>
            <DialogActions busy={busy} submitLabel="Create setup code" busyLabel="Creating…" onCancel={() => setDialog(null)} />
          </form>
        </Modal>
      ) : null}

      {dialog?.type === 'password-code-result' ? (
        <Modal eyebrow="Participant access" title="Password setup code" description="Copy these instructions now. The code is stored only as a one-way hash and cannot be displayed again." busy={false} onClose={() => setDialog(null)}>
          <div className="space-y-4 px-6 py-5 text-sm">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wide text-[var(--gx-text-muted)]">Participant</span>
              <strong className="text-[var(--gx-text)]">{dialog.participant.name}</strong>
              <span className="block text-[var(--gx-text-muted)]">{dialog.participant.email}</span>
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wide text-[var(--gx-text-muted)]">Setup page</span>
              <code className="mt-1 block break-all rounded-lg bg-[var(--gx-bg-alt)] p-3 text-xs text-[var(--gx-text)]">{dialog.setupUrl}</code>
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wide text-[var(--gx-text-muted)]">One-time code</span>
              <code className="mt-1 block rounded-lg bg-[var(--gx-bg-alt)] p-3 text-xl font-bold tracking-widest text-[var(--gx-text)]">{dialog.code}</code>
            </div>
            <p className="m-0 text-[var(--gx-text-muted)]">Expires {formatDate(dialog.expiresAt)}.</p>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-4 sm:flex-row sm:justify-end">
            <button className="gx-btn gx-btn-secondary" type="button" onClick={() => setDialog(null)}>Close</button>
            <button className="gx-btn gx-btn-primary" type="button" onClick={() => void copyPasswordSetupDetails(dialog.participant, dialog.setupUrl, dialog.code, dialog.expiresAt)}>Copy instructions</button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="label">{label}{children}</label>;
}

function toIso(value: FormDataEntryValue | null): string | undefined {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString();
}

function ReleaseDialog({
  rounds,
  busy,
  onClose,
  onSubmit,
}: {
  rounds: AdminRound[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [mode, setMode] = useState('practice');
  return (
    <Modal eyebrow="Dataset contract" title="Register release" description="The server validates the schema 2.1 public contract and private scoring files in R2 before registration." busy={busy} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <Field label="Release ID"><input className="gx-input mt-2 w-full" name="releaseId" placeholder="challenge-2-typing" required /></Field>
          <Field label="Exercise"><select className="gx-input mt-2 w-full" name="exercise" defaultValue="typing"><option value="typing">Genotyping</option><option value="assembly">Short-read assembly</option><option value="hybrid">Hybrid assembly</option><option value="outbreak">Outbreak analysis</option></select></Field>
          <Field label="Mode"><select className="gx-input mt-2 w-full" name="mode" value={mode} onChange={(event) => setMode(event.target.value)}><option value="practice">Practice</option><option value="challenge">Challenge</option></select></Field>
          <Field label="Schema version"><input className="gx-input mt-2 w-full" name="schemaVersion" defaultValue="2.1" required /></Field>
          {mode === 'challenge' ? <div className="sm:col-span-2"><Field label="Challenge round"><select className="gx-input mt-2 w-full" name="roundId" required defaultValue=""><option value="" disabled>Select a round</option>{rounds.map((round) => <option value={round.id} key={round.id}>{round.title}</option>)}</select></Field></div> : null}
        </div>
        <DialogActions busy={busy} submitLabel="Validate and register" busyLabel="Validating…" onCancel={onClose} />
      </form>
    </Modal>
  );
}
