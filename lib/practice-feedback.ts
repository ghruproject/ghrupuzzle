export interface PracticeFeedbackItem {
  sampleId: string;
  field: string;
  correct: boolean;
  submitted: string;
  expected: string;
}

export interface PracticeSampleFeedback {
  sampleId: string;
  items: PracticeFeedbackItem[];
  highlightedItems: PracticeFeedbackItem[];
  correctCount: number;
  totalCount: number;
  allCorrect: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  qc_status: 'QC status',
  failure_reason: 'Failure reason',
  species: 'Species',
  st: 'Sequence type',
  k_locus: 'K locus',
  capsule_type: 'Capsule type',
  wzi: 'wzi allele',
  o_locus: 'O locus',
  o_type: 'O type',
  bla_carb: 'Carbapenemases',
  cluster: 'Cluster assignment',
};

export function practiceFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replaceAll('_', ' ');
}

export function buildPracticeSampleFeedback(
  sampleIds: string[],
  items: PracticeFeedbackItem[],
): PracticeSampleFeedback[] {
  return sampleIds.map((sampleId) => {
    const sampleItems = items.filter((item) => item.sampleId === sampleId);
    const correctCount = sampleItems.filter((item) => item.correct).length;
    return {
      sampleId,
      items: sampleItems,
      highlightedItems: sampleItems.filter(
        (item) =>
          ['qc_status', 'failure_reason'].includes(item.field) || !item.correct,
      ),
      correctCount,
      totalCount: sampleItems.length,
      allCorrect: sampleItems.length > 0 && correctCount === sampleItems.length,
    };
  });
}
