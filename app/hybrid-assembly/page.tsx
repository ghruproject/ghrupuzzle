import { ExercisePage } from '@/components/exercise-page';
import { hybridChallengeDefinition } from '@/lib/exercise-definitions';

export default function HybridAssemblyPage() {
  return <ExercisePage definition={hybridChallengeDefinition} />;
}
