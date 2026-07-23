---
slug: genotyping
title: Genotyping
summary: Recover consistent species, sequence-type, surface-locus and resistance-determinant calls.
exercise: typing
order: 4
---

# Genotyping

## Aim

Use supplied assemblies to recover consistent organism, sequence-type,
surface-locus and resistance-determinant calls.

## Recommended process

1. **Check the assemblies.** Confirm that every file is readable and linked to
   the correct public sample identifier.
2. **Confirm the organism.** Use a suitable taxonomic method or the species
   output of a validated genotyping workflow.
3. **Select the correct scheme.** Typing databases and locus schemes are
   organism-specific. Do not apply a Klebsiella-specific preset to an unrelated
   organism.
4. **Run a suitable workflow.** The targeted Klebsiella exercise requires a
   workflow that reports MLST, K and O loci, capsule interpretation and acquired
   resistance determinants.
5. **Retain confidence information.** Review warnings, missing loci, partial
   matches and low-confidence calls.
6. **Normalise the required fields.** Transfer results into the supplied columns
   without changing their biological meaning.
7. **Review contradictions.** Unexpected species, multiple alleles or missing
   loci can indicate contamination, fragmentation or the wrong scheme.

## Interpreting outputs

**Sequence type (ST):** Report the called MLST sequence type. If the profile is
incomplete or novel, use the representation requested by the exercise rather
than inventing an ST.

**K locus and capsule type:** The locus designation and inferred capsule type
are related but are not interchangeable. Return each in its specified field.

**wzi allele:** Report the allele call provided by the workflow. Keep missing or
ambiguous calls explicit.

**O locus and O type:** Distinguish the locus designation from its serotype
interpretation.

**Carbapenemase genes:** Report detected gene names in the requested format. A
detected gene is a genomic determinant, not a complete susceptibility
interpretation.

**Species:** Report the final organism call supported by the analysis. Do not
copy the expected label when the evidence disagrees.

## Normalisation

The assessment compares structured fields, so formatting matters. Use
consistent capitalisation and separators. Do not add explanatory prose to a
field that expects one controlled value. Put qualifications in a notes field
when one is provided.

For multiple carbapenemase calls, use the separator shown by the exercise. Do
not change allele or locus names to a preferred local style.

## Common problems

**No ST call:** Investigate missing or fragmented housekeeping loci,
contamination, poor assembly quality or the wrong scheme.

**Multiple allele calls:** Review mixed-sample evidence and assembly graph or
coverage information.

**Unexpected species:** Confirm the input file and rerun an appropriate
taxonomic method.

**Database-dependent differences:** Record the database version and do not
merge calls from incompatible schemes without explanation.

Next: [submission and troubleshooting](/guides/submission-and-troubleshooting).
