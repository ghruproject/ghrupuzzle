import { ExercisePage } from '@/components/exercise-page';
import { typingPracticeDefinition } from '@/lib/exercise-definitions';
import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata({
  title: 'Bacterial genotyping practice',
  description:
    'Practise interpreting Klebsiella species, sequence type, locus, serotype and antimicrobial-resistance results.',
  path: '/typing/practice',
  keywords: ['Klebsiella genotyping exercise', 'Kleborate practice'],
});

export default function TypingPracticePage() {
  return <ExercisePage definition={typingPracticeDefinition} />;
}
