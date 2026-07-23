import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PARTICIPANT_GUIDES, participantGuide } from '@/lib/generated-guides';

export function generateStaticParams() {
  return PARTICIPANT_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = participantGuide(slug);
  if (!guide) {
    return {};
  }
  return {
    title: `${guide.title} | GHRU Puzzles`,
    description: guide.summary,
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = participantGuide(slug);
  if (!guide) {
    notFound();
  }

  const currentIndex = PARTICIPANT_GUIDES.findIndex((candidate) => candidate.slug === guide.slug);
  const previous = PARTICIPANT_GUIDES[currentIndex - 1];
  const next = PARTICIPANT_GUIDES[currentIndex + 1];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-5">
        <Link href="/guides" className="text-sm font-bold">
          ← All participant guides
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8 items-start">
        <nav
          aria-label="Participant guides"
          className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-4 lg:sticky lg:top-4"
        >
          <p className="text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)] mt-0 mb-3">
            In this guide
          </p>
          <ul className="list-none p-0 m-0 space-y-1">
            {PARTICIPANT_GUIDES.map((candidate) => (
              <li key={candidate.slug}>
                <Link
                  href={`/guides/${candidate.slug}`}
                  aria-current={candidate.slug === guide.slug ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    candidate.slug === guide.slug
                      ? 'bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)]'
                      : 'text-[var(--gx-text-muted)] hover:bg-[var(--gx-accent-dim)]'
                  }`}
                >
                  {candidate.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 md:p-9 min-w-0">
          <div className="guide-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{guide.markdown}</ReactMarkdown>
          </div>

          <nav
            aria-label="Guide pagination"
            className="mt-10 pt-6 border-t border-[var(--gx-border)] flex flex-wrap justify-between gap-3"
          >
            {previous ? (
              <Link href={`/guides/${previous.slug}`} className="gx-btn gx-btn-secondary">
                ← {previous.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/guides/${next.slug}`} className="gx-btn gx-btn-primary">
                {next.title} →
              </Link>
            ) : null}
          </nav>
        </article>
      </div>
    </div>
  );
}
