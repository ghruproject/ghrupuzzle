export type ExerciseMode = 'practice' | 'challenge';

export interface SampleSheetLink {
  filename?: string;
  url: string;
}

export interface SupportingFileLink {
  label: string;
  url: string;
}

export interface AnswerSheetSummary {
  filename?: string;
  url?: string;
  species: string[];
}

export interface ReferenceGenome {
  accession: string;
  organism: string;
  assembly_name?: string;
  source?: string;
  note?: string;
}

export interface ShortReadSample {
  public_name: string;
  R1_URL?: string;
  R2_URL?: string;
}

export interface TypingSample {
  public_name: string;
  FASTA_URL?: string;
}

export interface HybridAssemblySample extends ShortReadSample {
  LONG_READ_URL?: string;
  reference_accession?: string;
}

export interface ExerciseDataset<TSample> {
  samples: TSample[];
  answer_sheet: AnswerSheetSummary;
  sample_sheet: SampleSheetLink;
  supporting_files?: SupportingFileLink[];
  release_date?: string;
  references?: ReferenceGenome[];
  notes?: string[];
  bulk_download?: {
    curl: string;
    wget: string;
  };
  releaseDefinition?: {
    title: string;
    description: string;
    instructions: string[];
    fields: Array<SubmissionField & { score_when?: ContractCondition | null }>;
  };
  access?: {
    releaseDatabaseId: string;
    mode: ExerciseMode;
    opensAt?: string | null;
    closesAt?: string | null;
  };
}

export interface InstructionColumn {
  name: string;
  description: string;
}

export interface ExerciseDefinition<TSample> {
  exercise: 'typing' | 'assembly' | 'hybrid' | 'outbreak';
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  mode: ExerciseMode;
  kindLabel: string;
  practiceHref?: string;
  datasetPath: string;
  downloadPrefix: string;
  instructions: string[];
  sampleSheetIntro: string;
  submissionText: string;
  answerColumns: InstructionColumn[];
  sampleColumns: Array<{
    key: keyof TSample;
    label: string;
    isFile?: boolean;
  }>;
  emptyStateTitle: string;
  emptyStateBody: string;
}
import type { ContractCondition, SubmissionField } from './release-contract';
