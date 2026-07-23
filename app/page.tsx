import Link from 'next/link';
import { PracticeCards } from '@/components/practice-cards';
import { NEXT_CHALLENGE } from '@/lib/challenge';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="card mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          GHRU Skills Drills
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          Practise microbial genomics workflows, then test them in the GHRU Challenge.
        </h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-6">
          Preview the instructions and download practice datasets without an account. Sign in only
          when you want to submit results for assessment or participate in the timed challenge.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/practice" className="gx-btn gx-btn-primary">
            Explore practice exercises
          </Link>
          <Link href="/challenge" className="gx-btn gx-btn-secondary">
            View the {NEXT_CHALLENGE.dateLabel} challenge
          </Link>
        </div>
      </section>

      <section id="practice" className="scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-2">Practice anytime</h2>
            <p className="text-[var(--gx-text-muted)] m-0">
              Public previews, sample sheets, and available datasets. No account required.
            </p>
          </div>
          <Link href="/sign-in?returnTo=%2Fdashboard" className="text-sm font-semibold">
            Sign in to submit results →
          </Link>
        </div>
        <PracticeCards />
      </section>
    </div>
  );
}
