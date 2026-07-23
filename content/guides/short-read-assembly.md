---
slug: short-read-assembly
title: Short-read assembly
summary: Assemble paired-end reads, assess the recovered genome and make a defensible QC decision.
exercise: assembly
order: 2
---

# Short-read assembly

## Aim

Produce a draft bacterial genome assembly from paired-end short reads, evaluate
its quality, identify the organism and return a defensible QC outcome.

## Recommended process

1. **Check the read pairs.** Confirm that R1 and R2 contain corresponding reads
   and map unambiguously to the public sample identifier.
2. **Assess raw reads.** Review read quality, adapter content, length and
   taxonomic composition.
3. **Trim only when justified.** Remove adapters and poor-quality sequence using
   a documented rule. Excessive trimming can reduce coverage and fragment the
   assembly.
4. **Assemble each sample.** Use a bacterial short-read assembler or validated
   institutional workflow.
5. **Filter deliberately.** If short contigs are removed, record the minimum
   retained length and apply the rule consistently.
6. **Assess the assembly.** Review contiguity, size, GC content, coverage,
   completeness and contamination.
7. **Confirm taxonomy.** Base the final call on an appropriate classifier or
   comparison method, not the expected label alone.
8. **Assign the QC outcome.** Integrate all evidence and explain failures or
   caveats in the `error` or `notes` field.

## Evidence to review

- total assembly length;
- number of contigs;
- N50 or another contiguity summary;
- read coverage or mapped-read proportion;
- GC content;
- estimated completeness and contamination;
- taxonomic classification; and
- agreement between read-level and assembly-level findings.

N50 is not a measure of correctness. A highly contiguous assembly can still
contain contamination, misassemblies or the wrong organism. A fragmented
assembly may remain usable for some typing tasks. Judge fitness for the
exercise rather than optimising one number.

## Common problems

**Very small assembly:** Check read pairing, input paths, trimming severity and
coverage.

**Very large assembly:** Investigate contamination, duplicated sequence, mixed
samples or unfiltered short contigs.

**Unexpected GC content or taxonomy:** Check sample identity and contamination
before rerunning with different parameters.

**Many short contigs:** Review coverage, read quality, mixed content and repeat
structure.

**Conflicting QC tools:** Inspect the underlying reports and document which
evidence determined the final outcome.

## Result sheet

The practice sheet includes the public sample name, expected species label,
your taxonomic classification, R1 and R2 filenames, the overall QC outcome, an
error reason and notes. Complete the supplied template rather than creating a
replacement.

Next: [submission and troubleshooting](/guides/submission-and-troubleshooting).
