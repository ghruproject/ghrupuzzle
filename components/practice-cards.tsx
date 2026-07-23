import Link from 'next/link';
import { PRACTICE_EXERCISES } from '@/lib/practice-exercises';

export function PracticeCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {PRACTICE_EXERCISES.map((exercise) => (
        <article key={exercise.practiceHref} className="card flex flex-col gap-3">
          <span className="inline-flex self-start items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
            {exercise.dataAvailable ? 'Public practice data' : 'Public exercise preview'}
          </span>
          <h2 className="text-lg font-bold text-[var(--gx-text)] mt-1 mb-1">{exercise.title}</h2>
          <p className="text-sm text-[var(--gx-text-muted)] flex-1">{exercise.copy}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            <Link className="gx-btn gx-btn-primary" href={exercise.practiceHref}>
              {exercise.dataAvailable ? 'Preview practice' : 'Preview exercise'}
            </Link>
            <Link className="gx-btn gx-btn-secondary" href={exercise.challengeHref}>
              Challenge details
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
