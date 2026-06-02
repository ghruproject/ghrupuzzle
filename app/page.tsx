import Link from 'next/link';

const exercises = [
  {
    href: '/assembly',
    practiceHref: '/assembly/practice',
    title: 'Short-read assembly',
    mode: 'Challenge + practice',
    copy: 'De novo assembly, contamination detection, and structured QC reporting from paired-end Illumina-style reads.',
  },
  {
    href: '/hybrid-assembly',
    practiceHref: '/hybrid-assembly/practice',
    title: 'Hybrid assembly',
    mode: 'New exercise',
    copy: 'Simulated short and long reads designed for benchmarking hybrid assembly, polishing, and assembly completeness.',
  },
  {
    href: '/typing',
    practiceHref: '/typing/practice',
    title: 'Genotyping',
    mode: 'Challenge + practice',
    copy: 'Assembly-based Klebsiella typing focused on normalised locus, serotype, and resistance interpretation.',
  },
  {
    href: '/outbreak',
    practiceHref: '/outbreak/practice',
    title: 'Outbreak analysis',
    mode: 'Challenge + practice',
    copy: 'Reference mapping, variant calling, phylogeny, and cluster interpretation with an outbreak-style cohort.',
  },
];

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-8 shadow-sm mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          GHRU Skills Drills
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          Benchmark the parts of microbial genomics that actually fail in production.
        </h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-6">
          GHRUPuzzles packages controlled datasets into reproducible exercises for assembly, typing, outbreak investigation, and
          hybrid short-read plus long-read workflows. Each puzzle is designed to show whether a participant can run tools, reason
          about outputs, and return a clean deliverable under realistic constraints.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/assembly"
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl font-bold text-[var(--gx-text-inverted)] bg-[var(--gx-gradient,var(--gx-accent))] hover:opacity-90 transition-opacity"
            style={{ background: 'var(--gx-gradient)' }}
          >
            Start with assembly
          </Link>
          <Link
            href="/hybrid-assembly/practice"
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl font-bold border border-[var(--gx-border)] text-[var(--gx-text)] hover:text-[var(--gx-text-bright)] bg-transparent transition-colors"
          >
            Open hybrid practice
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {exercises.map((exercise) => (
          <article
            key={exercise.href}
            className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-5 flex flex-col gap-3"
          >
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
                {exercise.mode}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--gx-text)] mt-1 mb-1">{exercise.title}</h2>
            <p className="text-sm text-[var(--gx-text-muted)] flex-1">{exercise.copy}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Link
                href={exercise.practiceHref}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl font-bold text-[var(--gx-text-inverted)] hover:opacity-90 transition-opacity text-sm"
                style={{ background: 'var(--gx-gradient)' }}
              >
                Practice
              </Link>
              <Link
                href={exercise.href}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl font-bold border border-[var(--gx-border)] text-[var(--gx-text)] hover:text-[var(--gx-text-bright)] bg-transparent transition-colors text-sm"
              >
                Challenge
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
