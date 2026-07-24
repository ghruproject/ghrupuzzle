import { PracticeCards } from '@/components/practice-cards';
import { SITE_DESCRIPTION, SITE_VALUE_PROPOSITION } from '@/lib/seo';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="card mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest text-[var(--gx-accent)]">
          ghrupuzzles
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          {SITE_DESCRIPTION}
        </h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-0">
          Work through short-read assembly, hybrid assembly, genotyping and outbreak analysis.
          {' '}
          {SITE_VALUE_PROPOSITION}
        </p>
      </section>

      <section id="practice" className="scroll-mt-24">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-2">
            Practice with realistic data
          </h2>
          <p className="text-[var(--gx-text-muted)] max-w-3xl m-0">
            Use simulated datasets designed to reflect the complexity of real microbial genomics
            data. Test your team’s proficiency, benchmark your bioinformatics pipelines and
            identify areas for improvement.
          </p>
        </div>
        <PracticeCards />
      </section>
    </div>
  );
}
