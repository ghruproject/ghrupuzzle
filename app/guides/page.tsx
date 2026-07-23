import Link from 'next/link';
import { PARTICIPANT_GUIDES } from '@/lib/generated-guides';
import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata({
  title: 'Participant guides',
  description:
    'Installation guidance and runnable command examples for completing microbial genomics assembly, genotyping and outbreak-analysis exercises.',
  path: '/guides',
  keywords: ['bioinformatics installation guide', 'microbial genomics commands'],
});

export default function GuidesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-8 shadow-sm mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          Participant documentation
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          How to approach the exercises
        </h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-0">
          Prepare your data, choose a reproducible workflow, review the biological evidence and
          return a valid result sheet. Start with the general guide, then open the page for your
          exercise.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PARTICIPANT_GUIDES.map((guide) => (
          <article
            key={guide.slug}
            className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 flex flex-col"
          >
            <div className="text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)] mb-2">
              {guide.exercise === 'all' ? 'All exercises' : 'Exercise guide'}
            </div>
            <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">{guide.title}</h2>
            <p className="text-[var(--gx-text-muted)] flex-1 mb-5">{guide.summary}</p>
            <Link href={`/guides/${guide.slug}`} className="gx-btn gx-btn-primary self-start">
              Read guide
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
