---
slug: hybrid-assembly
title: Hybrid assembly
summary: Combine short and long reads and evaluate polishing, circularisation and structural completeness.
exercise: hybrid
order: 3
---

# Hybrid assembly

## Aim

Combine paired-end short reads with long reads to obtain a more complete
bacterial assembly while retaining the base-level accuracy supported by the
short-read data.

## Recommended process

1. **Confirm sample matching.** Ensure that the short- and long-read files refer
   to the same isolate.
2. **Assess each data type separately.** For short reads, review quality and
   adapter content. For long reads, review yield, length distribution, read
   quality and potential adapters.
3. **Choose a hybrid strategy.** Use a hybrid assembler or a documented
   long-read assembly followed by short-read polishing.
4. **Record the workflow.** Report the assembler, polishing tools, versions and
   important settings.
5. **Inspect the assembly graph or structural evidence.** Do not infer
   circularisation solely because a contig is long.
6. **Polish and recheck.** Where appropriate, use the supplied reads to improve
   base-level accuracy, then reassess the result.
7. **Evaluate completeness and contamination.** Review the core assembly
   metrics alongside structural completeness.
8. **Report cautiously.** State whether the assembly appears complete, circular
   or fragmented and explain the evidence in the notes.

## Circularisation and completeness

Use conservative language:

- **circularised:** supported by the assembler or assembly graph and checked for
  a plausible circular overlap;
- **complete:** expected replicons appear to be represented without unresolved
  breaks, supported by appropriate QC;
- **single contig:** a structural description only; it does not prove
  completeness or circularity; and
- **fragmented:** unresolved sequence remains across multiple contigs.

Rotate circular replicons only when the method and biological anchor are
justified. Record any trimming of duplicated terminal sequence.

## Compare the evidence

Ask whether:

- the hybrid assembly improves contiguity without introducing implausible
  sequence;
- short reads map back consistently;
- coverage is broadly coherent across replicons;
- completeness and contamination estimates are plausible;
- taxonomic classifications agree across data types; and
- small plasmids or other replicons may have been lost.

## Common problems

**Short and long reads disagree:** Recheck sample identity and taxonomic
composition before combining them.

**One very long contig with suspicious duplications:** Inspect terminal overlap
and assembly graph evidence.

**Polishing changes little or reduces quality:** Confirm that the reads and
model are appropriate and that the correct assembly was used.

**Small replicons are missing:** Review long-read depth, assembler output and
unassembled reads.

## Result sheet

The practice sheet includes the public sample name, taxonomic classification,
input filenames, assembler or workflow, QC outcome and notes. Use the notes to
record polishing, circularisation, contamination and unresolved structure.

Next: [submission and troubleshooting](/guides/submission-and-troubleshooting).
