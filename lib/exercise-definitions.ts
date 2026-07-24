import type {
  ExerciseDefinition,
  HybridAssemblySample,
  ShortReadSample,
  TypingSample,
} from './exercises';

export const assemblyPracticeDefinition: ExerciseDefinition<ShortReadSample> = {
  exercise: 'assembly',
  slug: 'assembly-practice',
  title: 'De novo Assembly Practice',
  subtitle: 'Work through paired-end short-read assemblies and report species calls plus QC outcomes.',
  summary:
    'Practise short-read de novo assembly, taxonomic identification and read and assembly quality control.',
  mode: 'practice',
  kindLabel: 'Genome Assembly',
  datasetPath: '/practice_assembly_file_details.json',
  downloadPrefix: 'practice_assembly',
  instructions: [
    'Assemble each paired-end dataset with a de novo assembler of your choice.',
    'Run QC and taxonomic classification on the resulting assemblies.',
    'Mark contaminated datasets explicitly when the evidence supports mixed content.',
    'Complete the sample sheet and submit it as UTF-8 CSV or TSV through this portal.',
  ],
  sampleSheetIntro: 'Fill these columns in the returned assembly sheet.',
  submissionText:
    'Use this exercise to check that your workflow produces consistent, reviewable outputs across samples of differing quality.',
  answerColumns: [
    { name: 'sample_name', description: 'Public sample identifier used in this exercise.' },
    { name: 'species', description: 'Organism label included in the supplied sheet; verify your independent taxonomic result.' },
    { name: 'tax_classification', description: 'Your final taxonomic call for the recovered genome.' },
    { name: 'r1', description: 'Forward short-read FASTQ used for the assembly.' },
    { name: 'r2', description: 'Reverse short-read FASTQ used for the assembly.' },
    { name: 'qc', description: 'Overall QC verdict such as PASSED or FAILED.' },
    { name: 'error', description: 'Reason for failure or contamination if relevant.' },
    { name: 'notes', description: 'Assembly caveats, coverage issues, or interpretation notes.' },
  ],
  sampleColumns: [
    { key: 'public_name', label: 'Sample' },
    { key: 'R1_URL', label: 'R1 FASTQ', isFile: true },
    { key: 'R2_URL', label: 'R2 FASTQ', isFile: true },
  ],
  emptyStateTitle: 'Practice dataset coming soon',
  emptyStateBody: 'The instructions are available now. Downloads and submissions will open when the practice dataset is published.',
};

export const assemblyChallengeDefinition: ExerciseDefinition<ShortReadSample> = {
  ...assemblyPracticeDefinition,
  slug: 'assembly-challenge',
  title: 'De novo Assembly Challenge',
  summary:
    'The challenge dataset tests whether your short-read assembly workflow is stable under time pressure and mixed sample quality.',
  mode: 'challenge',
  practiceHref: '/assembly/practice',
  datasetPath: '/real_assembly_file_details.json',
  downloadPrefix: 'real_assembly',
};

export const hybridPracticeDefinition: ExerciseDefinition<HybridAssemblySample> = {
  exercise: 'hybrid',
  slug: 'hybrid-assembly-practice',
  title: 'Hybrid Assembly Practice',
  subtitle: 'Assemble paired short and long reads, identify each organism and assess input and assembly quality.',
  summary:
    'Practise long-read assembly, taxonomic identification and read and assembly quality control.',
  mode: 'practice',
  datasetPath: '/practice_hybrid_assembly_file_details.json',
  downloadPrefix: 'practice_hybrid_assembly',
  kindLabel: 'Hybrid Assembly',
  instructions: [
    'Assemble each genome using both paired-end short reads and the provided long-read file.',
    'Record which assembler and polishing approach you used for each sample.',
    'Report species calls, QC outcomes, and whether the assembly appears complete or fragmented.',
    'Submit the completed sample sheet through this portal.',
  ],
  sampleSheetIntro: 'The hybrid assembly sample sheet is designed to capture both data modalities and assembly provenance.',
  submissionText:
    'Use this exercise to check that your workflow handles cross-platform evidence and input-quality failures consistently.',
  answerColumns: [
    { name: 'sample_name', description: 'Public sample identifier used in this exercise.' },
    { name: 'species', description: 'Organism label included in the supplied sheet; verify your independent taxonomic result.' },
    { name: 'tax_classification', description: 'Your species call from the hybrid assembly result.' },
    { name: 'r1', description: 'Forward Illumina-style FASTQ input.' },
    { name: 'r2', description: 'Reverse Illumina-style FASTQ input.' },
    { name: 'long_reads', description: 'Single long-read FASTQ used for the hybrid assembly.' },
    { name: 'assembler', description: 'Assembler or workflow used to create the hybrid assembly.' },
    { name: 'qc', description: 'Overall QC verdict for the assembled genome.' },
    { name: 'notes', description: 'Polishing, circularisation, contamination, or repeat-resolution notes.' },
  ],
  sampleColumns: [
    { key: 'public_name', label: 'Sample' },
    { key: 'R1_URL', label: 'R1 FASTQ', isFile: true },
    { key: 'R2_URL', label: 'R2 FASTQ', isFile: true },
    { key: 'LONG_READ_URL', label: 'Long Reads', isFile: true },
  ],
  emptyStateTitle: 'Practice dataset coming soon',
  emptyStateBody:
    'The instructions are available now. Downloads and submissions will open when the hybrid practice dataset is published.',
};

export const hybridChallengeDefinition: ExerciseDefinition<HybridAssemblySample> = {
  ...hybridPracticeDefinition,
  slug: 'hybrid-assembly-challenge',
  title: 'Hybrid Assembly Challenge',
  mode: 'challenge',
  practiceHref: '/hybrid-assembly/practice',
  datasetPath: '/real_hybrid_assembly_file_details.json',
  downloadPrefix: 'real_hybrid_assembly',
};

export const typingPracticeDefinition: ExerciseDefinition<TypingSample> = {
  exercise: 'typing',
  slug: 'typing-practice',
  title: 'Genotyping Practice',
  subtitle: 'Use assembled genomes to recover sequence type, capsule, serotype, and carbapenemase calls.',
  summary:
    'Practise Klebsiella pneumoniae genotyping and recognise assemblies that are unsuitable for analysis.',
  mode: 'practice',
  datasetPath: '/practice_typing_file_details.json',
  downloadPrefix: 'practice_typing',
  kindLabel: 'Genotyping',
  instructions: [
    'Genotype each assembly with the appropriate typing workflow.',
    'Extract the required loci, serotype, resistance, and species fields.',
    'Populate the supplied sample sheet without changing the expected column names.',
    'Submit the final result sheet as UTF-8 CSV or TSV through this portal.',
  ],
  sampleSheetIntro: 'These fields capture the core Klebsiella typing outputs expected from each assembly.',
  submissionText: 'Consistency matters here: the goal is not just running the tool, but returning cleanly normalised calls.',
  answerColumns: [
    { name: 'sample', description: 'Input genome identifier, typically matching the FASTA filename stem.' },
    { name: 'st', description: 'MLST sequence type call.' },
    { name: 'k_locus', description: 'Capsule K-locus designation.' },
    { name: 'capsule_type', description: 'Capsule serotype derived from the K-locus.' },
    { name: 'wzi', description: 'wzi allele used to support capsule interpretation.' },
    { name: 'o_locus', description: 'O-antigen locus designation.' },
    { name: 'o_type', description: 'O-antigen serotype interpretation.' },
    { name: 'bla_carb', description: 'Detected carbapenemase genes, if present.' },
    { name: 'species', description: 'Your organism call for the assembly.' },
  ],
  sampleColumns: [
    { key: 'public_name', label: 'Sample' },
    { key: 'FASTA_URL', label: 'Assembly FASTA', isFile: true },
  ],
  emptyStateTitle: 'Practice dataset coming soon',
  emptyStateBody: 'The instructions are available now. Downloads and submissions will open when the genotyping practice dataset is published.',
};

export const typingChallengeDefinition: ExerciseDefinition<TypingSample> = {
  ...typingPracticeDefinition,
  slug: 'typing-challenge',
  title: 'Genotyping Challenge',
  mode: 'challenge',
  practiceHref: '/typing/practice',
  datasetPath: '/real_typing_file_details.json',
  downloadPrefix: 'real_typing',
};

export const outbreakPracticeDefinition: ExerciseDefinition<ShortReadSample> = {
  exercise: 'outbreak',
  slug: 'outbreak-practice',
  title: 'Outbreak Practice',
  subtitle: 'Build a mapping-based cluster analysis and deliver tree, metadata, and outbreak calls.',
  summary:
    'Practise read QC, phylogenetic reconstruction and label-independent outbreak-cluster assignment.',
  mode: 'practice',
  datasetPath: '/practice_outbreak_file_details.json',
  downloadPrefix: 'practice_outbreak',
  kindLabel: 'Outbreak Investigation',
  instructions: [
    'Map reads to an appropriate reference and call high-confidence variants.',
    'Create a phylogenetic tree in Newick format.',
    'Review the phylogeny alongside the supplied sample metadata.',
    'Identify likely outbreak clusters and submit the CSV or TSV result sheet for automated assessment.',
  ],
  sampleSheetIntro: 'Most epidemiological metadata are already present; your main task is to add the analytical cluster interpretation.',
  submissionText: 'Document any filtering, masking, or reference-choice decisions that materially affect the cluster calls.',
  answerColumns: [
    { name: 'Sample', description: 'Unique identifier for the sequenced isolate.' },
    { name: 'Cluster', description: 'Your inferred outbreak grouping.' },
    { name: 'Host', description: 'Host or source metadata.' },
    { name: 'Location', description: 'Collection location metadata.' },
    { name: 'Collection Date', description: 'Sample collection date metadata.' },
    { name: 'Phenotype', description: 'Phenotype or AMR metadata.' },
    { name: 'R1', description: 'Forward read file used in the analysis.' },
    { name: 'R2', description: 'Reverse read file used in the analysis.' },
    { name: 'Species', description: 'Predicted or assigned species for the sample.' },
  ],
  sampleColumns: [
    { key: 'public_name', label: 'Sample' },
    { key: 'R1_URL', label: 'R1 FASTQ', isFile: true },
    { key: 'R2_URL', label: 'R2 FASTQ', isFile: true },
  ],
  emptyStateTitle: 'Practice dataset coming soon',
  emptyStateBody: 'The instructions are available now. Downloads and submissions will open when the outbreak practice dataset is published.',
};

export const outbreakChallengeDefinition: ExerciseDefinition<ShortReadSample> = {
  ...outbreakPracticeDefinition,
  slug: 'outbreak-challenge',
  title: 'Outbreak Challenge',
  mode: 'challenge',
  practiceHref: '/outbreak/practice',
  datasetPath: '/real_outbreak_file_details.json',
  downloadPrefix: 'real_outbreak',
};
