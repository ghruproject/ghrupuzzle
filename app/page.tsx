import Link from 'next/link';

const exercises = [
  {
    href: '/assembly',
    title: 'Short-read assembly',
    mode: 'Challenge + practice',
    copy: 'De novo assembly, contamination detection, and structured QC reporting from paired-end Illumina-style reads.',
  },
  {
    href: '/hybrid-assembly',
    title: 'Hybrid assembly',
    mode: 'New exercise',
    copy: 'Simulated short and long reads designed for benchmarking hybrid assembly, polishing, and assembly completeness.',
  },
  {
    href: '/typing',
    title: 'Genotyping',
    mode: 'Challenge + practice',
    copy: 'Assembly-based Klebsiella typing focused on normalised locus, serotype, and resistance interpretation.',
  },
  {
    href: '/outbreak',
    title: 'Outbreak analysis',
    mode: 'Challenge + practice',
    copy: 'Reference mapping, variant calling, phylogeny, and cluster interpretation with an outbreak-style cohort.',
  },
];

export default function Home() {
  return (
    <div className="gx-page">
      <section className="gx-hero">
        <div className="gx-kicker">GHRU Skills Drills</div>
        <h1>Benchmark the parts of microbial genomics that actually fail in production.</h1>
        <p className="gx-hero-copy">
          GHRUPuzzles packages controlled datasets into reproducible exercises for assembly, typing, outbreak investigation, and
          hybrid short-read plus long-read workflows. Each puzzle is designed to show whether a participant can run tools, reason
          about outputs, and return a clean deliverable under realistic constraints.
        </p>
        <div className="gx-button-row">
          <Link href="/assembly" className="gx-button">
            Start with assembly
          </Link>
          <Link href="/hybrid-assembly/practice" className="gx-button gx-button-secondary">
            Open hybrid practice
          </Link>
        </div>
      </section>

      <section className="gx-home-grid">
        {exercises.map((exercise) => (
          <article key={exercise.href} className="card gx-exercise-card">
            <div className="gx-card-meta">
              <span className="gx-tag">{exercise.mode}</span>
            </div>
            <h2>{exercise.title}</h2>
            <p className="gx-muted">{exercise.copy}</p>
            <div className="gx-button-row">
              <Link href={exercise.href} className="gx-button">
                Open exercise
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
