export const PRACTICE_EXERCISES = [
  {
    practiceHref: '/assembly/practice',
    title: 'Short-read assembly',
    dataAvailable: true,
    copy: 'De novo assembly, contamination detection, and structured QC reporting from paired-end short reads.',
  },
  {
    practiceHref: '/hybrid-assembly/practice',
    title: 'Hybrid assembly',
    dataAvailable: true,
    copy: 'Benchmark hybrid assembly, polishing, circularisation, and assembly completeness.',
  },
  {
    practiceHref: '/typing/practice',
    title: 'Genotyping',
    dataAvailable: true,
    copy: 'Interpret assembly-based Klebsiella locus, serotype, sequence type, and resistance outputs.',
  },
  {
    practiceHref: '/outbreak/practice',
    title: 'Outbreak analysis',
    dataAvailable: true,
    copy: 'Work through reference mapping, variant calling, phylogeny, and cluster interpretation.',
  },
] as const;
