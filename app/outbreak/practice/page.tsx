import { ExercisePage } from '@/components/exercise-page';
import { outbreakPracticeDefinition } from '@/lib/exercise-definitions';
import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata({
  title: 'Outbreak analysis practice',
  description:
    'Practise bacterial reference mapping, variant calling, phylogenetic analysis and outbreak-cluster interpretation.',
  path: '/outbreak/practice',
  keywords: ['bacterial outbreak analysis exercise', 'microbial phylogenetics practice'],
});

export default function OutbreakPracticePage() {
  return <ExercisePage definition={outbreakPracticeDefinition} />;
}
