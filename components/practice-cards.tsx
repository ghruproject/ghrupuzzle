import Link from 'next/link';
import { PRACTICE_EXERCISES } from '@/lib/practice-exercises';

export function PracticeCards() {
  return (
    <div className="card p-0 overflow-hidden">
      {PRACTICE_EXERCISES.map((exercise) => (
        <article
          key={exercise.practiceHref}
          className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 border-b last:border-b-0 border-[var(--gx-border)]"
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-[var(--gx-text)] m-0">{exercise.title}</h3>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
                {exercise.dataAvailable ? 'Dataset available' : 'Dataset coming soon'}
              </span>
            </div>
            <p className="text-sm text-[var(--gx-text-muted)] m-0">{exercise.copy}</p>
          </div>
          <Link className="gx-btn gx-btn-primary shrink-0" href={exercise.practiceHref}>
            Open exercise →
          </Link>
        </article>
      ))}
    </div>
  );
}
