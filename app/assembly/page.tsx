import { ExercisePage } from '@/components/exercise-page';
import { assemblyChallengeDefinition } from '@/lib/exercise-definitions';

export default function AssemblyPage() {
  return <ExercisePage definition={assemblyChallengeDefinition} />;
}
