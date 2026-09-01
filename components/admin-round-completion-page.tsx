'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import {
  CHALLENGE_EXERCISES,
  type AdminExerciseProgress,
  type AdminRoundCompletion,
  type AdminRoundParticipant,
} from '@/lib/admin-round-completion';

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

type Filter =
  | 'All'
  | 'Completed'
  | 'Incomplete'
  | 'Not started'
  | 'Review pending'
  | 'Eligible'
  | 'Issued';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMAT.format(date);
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

function exerciseTone(status: AdminExerciseProgress['status']) {
  if (status === 'Passed') return 'success' as const;
  if (status === 'Awaiting finalisation' || status === 'Review pending') return 'warning' as const;
  if (status === 'Not passed') return 'danger' as const;
  return 'neutral' as const;
}

function overallTone(status: AdminRoundParticipant['overallStatus']) {
  if (status === 'Eligible' || status === 'Issued') return 'success' as const;
  if (status === 'Awaiting finalisation' || status === 'Review pending') return 'warning' as const;
  if (status === 'Not eligible') return 'danger' as const;
  return 'neutral' as const;
}

function csvCell(value: string | number | boolean): string {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function AdminRoundCompletionPage({ initialData }: { initialData: AdminRoundCompletion }) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const eligibleParticipants = useMemo(
    () => data.participants.filter((participant) => participant.eligible && !participant.isAdministrator),
    [data.participants],
  );

  const visibleParticipants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.participants.filter((participant) => {
      if (query && !participant.name.toLowerCase().includes(query) && !participant.email.toLowerCase().includes(query)) {
        return false;
      }
      if (filter === 'Completed') return participant.completedExercises === CHALLENGE_EXERCISES.length;
      if (filter === 'Incomplete') return participant.completedExercises < CHALLENGE_EXERCISES.length;
      if (filter === 'Not started') return participant.overallStatus === 'Not started';
      if (filter === 'Review pending') return participant.overallStatus === 'Review pending';
      if (filter === 'Eligible') return participant.eligible;
      if (filter === 'Issued') return participant.overallStatus === 'Issued';
      return true;
    });
  }, [data.participants, filter, search]);

  async function reload() {
    const response = await fetch(`/api/admin/rounds/${encodeURIComponent(data.round.id)}`, {
      cache: 'no-store',
    });
    const result = (await response.json()) as AdminRoundCompletion & { error?: string };
    if (!response.ok) throw new Error(result.error || 'Challenge progress could not be refreshed.');
    setData(result);
    setSelected(new Set());
  }

  async function finaliseScores() {
    if (!window.confirm(
      `Finalise ${data.summary.provisionalScores} provisional score${data.summary.provisionalScores === 1 ? '' : 's'} for ${data.round.title}? Open reviews will remain provisional.`,
    )) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/rounds/${encodeURIComponent(data.round.id)}/finalize`, {
        method: 'POST',
      });
      const result = (await response.json()) as { finalizedScores?: number; error?: string };
      if (!response.ok) throw new Error(result.error || 'Scores could not be finalised.');
      await reload();
      setMessage(`${Number(result.finalizedScores || 0)} score(s) finalised. Eligibility has been refreshed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Scores could not be finalised.');
    } finally {
      setBusy(false);
    }
  }

  async function issueSelectedCertificates() {
    const participants = eligibleParticipants.filter((participant) => selected.has(participant.userId));
    if (!participants.length) return;
    if (!window.confirm(
      `Issue ${participants.length} achievement certificate${participants.length === 1 ? '' : 's'}? Only participants with four final passing results and no open review are included.`,
    )) return;
    setBusy(true);
    setMessage(`Issuing 0 of ${participants.length} certificates…`);
    const failures: string[] = [];
    let issued = 0;
    for (const participant of participants) {
      try {
        const response = await fetch('/api/certificates/issue', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId: participant.userId, roundId: data.round.id }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error || 'Certificate could not be issued.');
        issued += 1;
      } catch (error) {
        failures.push(`${participant.name}: ${error instanceof Error ? error.message : 'failed'}`);
      }
      setMessage(`Issuing ${issued + failures.length} of ${participants.length} certificates…`);
    }
    try {
      await reload();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'Progress could not be refreshed.');
    }
    setMessage(
      failures.length
        ? `${issued} certificate(s) issued. ${failures.length} failed: ${failures.join('; ')}`
        : `${issued} certificate(s) issued successfully.`,
    );
    setBusy(false);
  }

  function exportCsv() {
    const rows = [
      ['Name', 'Email', 'Administrator', ...CHALLENGE_EXERCISES, 'Exercises completed', 'Attempts', 'Overall status', 'Certificate code'],
      ...visibleParticipants.map((participant) => [
        participant.name,
        participant.email,
        participant.isAdministrator ? 'Yes' : 'No',
        ...participant.exercises.map((exercise) => exercise.status),
        participant.completedExercises,
        participant.attempts,
        participant.overallStatus,
        participant.certificateCode || '',
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${data.round.slug}-completion.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const allEligibleSelected = eligibleParticipants.length > 0
    && eligibleParticipants.every((participant) => selected.has(participant.userId));

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-10">
      <Link className="text-sm font-semibold" href="/admin">← Back to administration</Link>
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gx-accent)]">Challenge management</p>
          <h1 className="mb-2 mt-2 text-3xl font-bold text-[var(--gx-text)]">{data.round.title}</h1>
          <p className="m-0 text-sm text-[var(--gx-text-muted)]">
            {formatDate(data.round.opensAt)} – {formatDate(data.round.closesAt)} · {data.round.closed ? 'Closed' : 'Open'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="gx-btn gx-btn-secondary" type="button" onClick={exportCsv}>Export CSV</button>
          {data.round.closed && data.summary.provisionalScores > 0 ? (
            <button className="gx-btn gx-btn-secondary" type="button" disabled={busy} onClick={() => void finaliseScores()}>
              Finalise {data.summary.provisionalScores} scores
            </button>
          ) : null}
          <button
            className="gx-btn gx-btn-primary"
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => void issueSelectedCertificates()}
          >
            Issue {selected.size || ''} certificate{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-[var(--gx-accent)]/30 bg-[var(--gx-accent)]/10 px-4 py-3 text-sm font-semibold text-[var(--gx-text)]" role="status">
          {message}
        </div>
      ) : null}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8" aria-label="Challenge summary">
        {[
          ['Participants', data.summary.enrolledParticipants],
          ['Completed', data.summary.completed],
          ['Incomplete', data.summary.incomplete],
          ['Not started', data.summary.notStarted],
          ['Awaiting finalisation', data.summary.awaitingFinalisation],
          ['Review pending', data.summary.reviewPending],
          ['Eligible', data.summary.eligible],
          ['Issued', data.summary.issued],
        ].map(([label, value]) => (
          <div className="rounded-xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-4 shadow-sm" key={label}>
            <strong className="block text-2xl text-[var(--gx-text)]">{value}</strong>
            <span className="mt-1 block text-xs text-[var(--gx-text-muted)]">{label}</span>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="m-0 text-xl font-bold text-[var(--gx-text)]">Participant completion</h2>
            <p className="mb-0 mt-1 text-sm text-[var(--gx-text-muted)]">
              Completion means at least one valid submission for every registered exercise. Achievement certificates require four final passing results and no open review.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select className="gx-input" aria-label="Filter participants" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
              {(['All', 'Completed', 'Incomplete', 'Not started', 'Review pending', 'Eligible', 'Issued'] satisfies Filter[]).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <input className="gx-input sm:w-72" type="search" placeholder="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-4 py-3 text-sm">
          <label className="flex items-center gap-2 font-semibold text-[var(--gx-text)]">
            <input
              type="checkbox"
              checked={allEligibleSelected}
              disabled={!eligibleParticipants.length || busy}
              onChange={(event) => setSelected(event.target.checked
                ? new Set(eligibleParticipants.map((participant) => participant.userId))
                : new Set())}
            />
            Select all {eligibleParticipants.length} eligible participant{eligibleParticipants.length === 1 ? '' : 's'}
          </label>
          <span className="text-[var(--gx-text-muted)]">
            {data.summary.administratorEnrolments} administrator/test enrolment{data.summary.administratorEnrolments === 1 ? '' : 's'} excluded from summary and bulk selection
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--gx-border)]">
          <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
            <thead className="bg-[var(--gx-bg-alt)] text-xs uppercase tracking-wide text-[var(--gx-text-muted)]">
              <tr>
                <th className="border-b border-[var(--gx-border)] px-3 py-3">Select</th>
                <th className="border-b border-[var(--gx-border)] px-3 py-3">Participant</th>
                {CHALLENGE_EXERCISES.map((exercise) => <th className="border-b border-[var(--gx-border)] px-3 py-3 capitalize" key={exercise}>{exercise}</th>)}
                <th className="border-b border-[var(--gx-border)] px-3 py-3">Overall</th>
                <th className="border-b border-[var(--gx-border)] px-3 py-3">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {visibleParticipants.map((participant) => (
                <tr key={participant.userId}>
                  <td className="border-b border-[var(--gx-border)] px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${participant.name}`}
                      checked={selected.has(participant.userId)}
                      disabled={!participant.eligible || participant.isAdministrator || busy}
                      onChange={(event) => setSelected((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(participant.userId); else next.delete(participant.userId);
                        return next;
                      })}
                    />
                  </td>
                  <td className="border-b border-[var(--gx-border)] px-3 py-3">
                    <strong className="block text-[var(--gx-text)]">{participant.name || 'Unnamed participant'}</strong>
                    <span className="block text-xs text-[var(--gx-text-muted)]">{participant.email}</span>
                    {participant.isAdministrator ? <span className="mt-1 block text-xs font-bold text-[var(--gx-accent)]">Administrator/test</span> : null}
                  </td>
                  {participant.exercises.map((exercise) => (
                    <td className="border-b border-[var(--gx-border)] px-3 py-3" key={exercise.exercise}>
                      <Badge tone={exerciseTone(exercise.status)}>{exercise.status}</Badge>
                      <span className="mt-1 block text-xs text-[var(--gx-text-muted)]">
                        {exercise.attempts ? `${exercise.attempts} attempt${exercise.attempts === 1 ? '' : 's'} · ${formatDate(exercise.latestSubmittedAt)}` : 'No submission'}
                      </span>
                    </td>
                  ))}
                  <td className="border-b border-[var(--gx-border)] px-3 py-3">
                    <Badge tone={overallTone(participant.overallStatus)}>{participant.overallStatus}</Badge>
                    <span className="mt-1 block text-xs text-[var(--gx-text-muted)]">{participant.completedExercises}/4 completed · {participant.attempts} attempts</span>
                  </td>
                  <td className="border-b border-[var(--gx-border)] px-3 py-3">
                    {participant.certificateCode ? (
                      <Link className="font-semibold" href={`/verify/${participant.certificateCode}`}>View certificate →</Link>
                    ) : participant.eligible ? (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Ready to issue</span>
                    ) : (
                      <span className="text-xs text-[var(--gx-text-muted)]">Not eligible</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleParticipants.length ? <p className="px-4 py-5 text-sm text-[var(--gx-text-muted)]">No participants match this view.</p> : null}
        </div>
      </section>
    </div>
  );
}
