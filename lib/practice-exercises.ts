export const PRACTICE_EXERCISES = [
  {
    challengeHref: '/assembly',
    practiceHref: '/assembly/practice',
    title: 'Short-read assembly',
    dataAvailable: true,
    copy:
      'Selected paired-end short-read data for de novo genome assembly and quality control. Some samples contain deliberate data-quality problems.',
  },
  {
    challengeHref: '/hybrid-assembly',
    practiceHref: '/hybrid-assembly/practice',
    title: 'Hybrid assembly',
    dataAvailable: true,
    copy:
      'Selected short- and long-read data for de novo genome assembly and quality control. Some samples contain deliberate data-quality problems.',
  },
  {
    challengeHref: '/typing',
    practiceHref: '/typing/practice',
    title: 'Genotyping',
    dataAvailable: true,
    copy:
      'Klebsiella pneumoniae genome assemblies for genotyping with Kleborate. Some assemblies contain deliberate data-quality problems.',
  },
  {
    challengeHref: '/outbreak',
    practiceHref: '/outbreak/practice',
    title: 'Outbreak analysis',
    dataAvailable: true,
    copy:
      'Short-read sequencing data for phylogenetic reconstruction and outbreak-cluster identification. Some samples contain deliberate data-quality problems.',
  },
] as const;
