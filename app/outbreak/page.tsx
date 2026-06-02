import { ExercisePage } from '@/components/exercise-page';
import { outbreakChallengeDefinition } from '@/lib/exercise-definitions';

export default function OutbreakPage() {
  return <ExercisePage definition={outbreakChallengeDefinition} />;
}
