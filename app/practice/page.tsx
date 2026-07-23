import { PracticeCards } from '@/components/practice-cards';
import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata({
  title: 'Microbial genomics practice exercises',
  description:
    'Preview tasks, download simulated microbial genomics datasets and test bioinformatics workflows before submitting results for assessment.',
  path: '/practice',
  keywords: ['microbial genomics practice', 'bioinformatics exercises', 'pipeline benchmarking'],
});

export default function PracticePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="card mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          Practice anytime
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          Test a workflow before submitting it for assessment.
        </h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-0">
          Preview the task, download the available data and work at your own pace. An account is
          only required when you submit a completed result sheet for assessment and feedback.
        </p>
      </section>
      <PracticeCards />
    </div>
  );
}
