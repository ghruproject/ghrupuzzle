---
slug: outbreak-analysis
title: Outbreak analysis
summary: Call variants, infer a phylogeny and assign analytical clusters using genomic and epidemiological evidence.
exercise: outbreak
order: 5
---

# Outbreak analysis

## Aim

Use read mapping and high-confidence variants to examine relatedness among
isolates, infer a phylogeny and assign analytical clusters using both genomic
and epidemiological evidence.

## Recommended process

1. **Confirm the cohort.** Check read files, sample identifiers and metadata.
   Exclude or separately analyse clearly different species.
2. **Choose an appropriate reference.** Use the reference specified by the
   exercise. If none is specified, choose a high-quality, closely related
   reference and record its accession and version.
3. **Prepare the reference deliberately.** Know whether plasmids or other
   non-chromosomal replicons are included. Record any removal.
4. **Map reads and call variants.** Use a validated bacterial variant-calling
   workflow with consistent filters.
5. **Review per-sample mapping QC.** Check mapped-read proportion, depth,
   breadth, ambiguous calls and high-confidence variant counts.
6. **Build the shared alignment.** Confirm that the core or callable alignment
   contains enough information and has not been collapsed by poor samples.
7. **Consider masking.** Repetitive, mobile or recombinant regions can distort
   inference. Mask only with a documented rationale.
8. **Infer the tree.** Use a suitable nucleotide model and retain
   branch-support information.
9. **Integrate metadata.** Match tree tip names to metadata identifiers exactly.
10. **Assign clusters.** Use genomic, temporal, spatial and epidemiological
    evidence. Record ambiguity rather than forcing certainty.
11. **Create the deliverables.** Return the completed CSV, Newick tree and
    Microreact project file when required.

## Reference choice

Reference choice affects mapping, the callable genome and the variants
detected. A distant reference can reduce mapping quality and create biased or
missing calls. Results generated with different references are not directly
interchangeable.

Use a reference specified by the exercise for comparability. Otherwise, justify
your choice and report the exact accession or file checksum.

## Quality checks before interpreting a tree

Review:

- mapped-read proportion and coverage breadth for every sample;
- missing or ambiguous positions;
- the size of the core or callable alignment;
- the distribution of pairwise differences;
- unusually long branches;
- possible mixed or contaminated samples;
- branch support; and
- agreement between identifiers in the alignment, tree and metadata.

A phylogenetic tree shows inferred genetic relationships. It does not, by
itself, prove direct transmission or identify who infected whom.

## Cluster assignment

Do not use a universal SNP threshold unless the exercise defines one.
Appropriate thresholds depend on the organism, time scale, sampling, reference,
callable genome and pipeline.

Use cluster labels as analytical groupings. Consider:

- genetic proximity;
- branch support and topology;
- collection dates and locations;
- host or source information;
- phenotype or AMR metadata; and
- data-quality limitations.

Keep cluster names simple and consistent, such as `Cluster 1`, `Cluster 2` and
`Unclustered`, unless the exercise requests another vocabulary.

## Microreact preparation

- Tree tip names must exactly match metadata sample identifiers.
- Use one header row and one row per sample.
- Use an unambiguous date format.
- Keep column names stable.
- Avoid embedded line breaks in cells.
- Inspect the final project to confirm that the tree, colours and metadata
  align.

Export the requested project file after the final inspection. A share link is
not a substitute when the exercise requires a `.microreact` file.

## Common problems

**Low mapping for one sample:** Check species, sample identity, contamination,
read quality and reference distance.

**Very small core alignment:** Identify poor-quality or divergent samples and
review filtering.

**Extremely long branch:** Investigate contamination, mixed reads, reference
distance and systematic calling errors.

**Tree and metadata do not join:** Normalise sample identifiers; do not edit
tree labels and metadata independently.

**Unstable cluster assignment:** Report the ambiguity and the evidence that
changes the interpretation.

Next: [submission and troubleshooting](/guides/submission-and-troubleshooting).
