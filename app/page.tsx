import { PracticeCards } from '@/components/practice-cards';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="card mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest text-[var(--gx-accent)]">
          ghrupuzzles
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          Complex simulated microbial genomics datasets for testing analytical proficiency and
          bioinformatics pipelines.
        </h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-0">
          Work through short-read assembly, hybrid assembly, genotyping and outbreak analysis.
          Evaluate your workflow, interpret quality evidence and produce reproducible results in
          standard formats.
        </p>
      </section>

      <section id="practice" className="scroll-mt-24">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-2">Practice anytime</h2>
          <p className="text-[var(--gx-text-muted)] max-w-3xl m-0">
            Preview each task and download available datasets without an account. Use the exercises
            to develop or benchmark your workflow. Sign in when you are ready to submit a result
            sheet for assessment and feedback.
          </p>
        </div>
        <PracticeCards />
      </section>
    </div>
  );
}
