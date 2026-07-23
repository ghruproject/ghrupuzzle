import { PracticeCards } from '@/components/practice-cards';

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
