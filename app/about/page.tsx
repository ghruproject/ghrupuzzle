import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-8 shadow-sm mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          About
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          Controlled exercises for pathogen genomics training.
        </h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl">
          GHRUPuzzles is a skills assessment and training surface for the Global Health Research Unit on Genomic Surveillance of
          Antimicrobial Resistance. The aim is simple: give participants realistic files, clear deliverables, and enough structure
          to compare pipelines without making the exercise trivial.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6">
          <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-4">What the exercises test</h2>
          <ul className="pl-5 list-disc space-y-2 text-[var(--gx-text-muted)]">
            <li>Deploying and running the right bioinformatics tools in a reproducible environment.</li>
            <li>Interpreting QC, taxonomy, typing, and phylogenetic outputs rather than just generating them.</li>
            <li>Returning a clean sample sheet or analysis artifact that another team can immediately consume.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6">
          <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-4">Programme context</h2>
          <p className="text-[var(--gx-text-muted)] mb-3">
            GHRU supports genomic surveillance of antimicrobial resistance across international public health and research settings.
            These drills are intended for GHRU members first, but anyone working in pathogen genomics can use them as a benchmark.
          </p>
          <p className="text-[var(--gx-text-muted)]">
            Learn more at{' '}
            <a href="https://ghru.pathogensurveillance.net/" target="_blank" rel="noopener noreferrer">
              ghru.pathogensurveillance.net
            </a>
            .
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 md:col-span-2">
          <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-4">Licensing</h2>
          <p className="text-[var(--gx-text-muted)] mb-4">
            GHRUPuzzles was created by{' '}
            <a href="https://www.pathogensurveillance.net/" target="_blank" rel="noopener noreferrer">
              Nabil-Fareed Alikhan
            </a>
            . Content is released under{' '}
            <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer">
              CC BY-NC 4.0
            </a>
            : reuse is encouraged with attribution for non-commercial use.
          </p>
          <Image src="/cc4bync.png" alt="Creative Commons BY NC 4.0 License" width={120} height={42} />
        </section>
      </div>
    </div>
  );
}
