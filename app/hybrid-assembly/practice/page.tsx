import { ExercisePage } from '@/components/exercise-page';
import { hybridPracticeDefinition } from '@/lib/exercise-definitions';
import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata({
  title: 'Hybrid assembly practice',
  description:
    'Practise long-read assembly, taxonomic identification and read and assembly quality control using simulated short- and long-read data.',
  path: '/hybrid-assembly/practice',
  keywords: ['hybrid assembly exercise', 'long-read bacterial genome assembly'],
});

export default function HybridAssemblyPracticePage() {
  return <ExercisePage definition={hybridPracticeDefinition} />;
}
