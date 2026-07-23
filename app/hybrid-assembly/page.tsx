import { ExercisePage } from '@/components/exercise-page';
import { hybridChallengeDefinition } from '@/lib/exercise-definitions';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata(
  'Hybrid assembly challenge',
  'The hybrid assembly challenge exercise for signed-up participants.',
);

export default function HybridAssemblyPage() {
  return <ExercisePage definition={hybridChallengeDefinition} />;
}
