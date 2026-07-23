import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-8 shadow-sm mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          About
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          Simulated datasets for testing microbial genomics workflows.
        </h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl">
          GHRUPUZZLES provides complex, simulated microbial genomics datasets for testing
          analytical proficiency and validating bioinformatics pipelines. Participants can
          practise with public datasets, submit results for structured assessment and take part in
          timed challenges.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6">
          <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-4">What it tests</h2>
          <ul className="pl-5 list-disc space-y-2 text-[var(--gx-text-muted)]">
            <li>Running bioinformatics tools in a reproducible environment.</li>
            <li>Interpreting QC, taxonomy, typing and phylogenetic evidence.</li>
            <li>Returning consistent result sheets and reusable analysis files.</li>
            <li>Comparing pipeline behaviour across realistic edge cases.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6">
          <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-4">Who it is for</h2>
          <p className="text-[var(--gx-text-muted)] mb-3">
            The exercises are intended for bioinformaticians, laboratory teams, trainees and
            researchers who want to test microbial genomics workflows against shared datasets.
          </p>
          <p className="text-[var(--gx-text-muted)]">
            The project was developed through the Global Health Research Unit on Genomic
            Surveillance of Antimicrobial Resistance. Learn more at{' '}
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
