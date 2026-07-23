---
slug: getting-started
title: Getting started
summary: Prepare the exercise data, computing environment and analysis record before running a workflow.
exercise: all
order: 1
---

# Getting started

This guide explains how to move from the files supplied by GHRU Puzzles to a
completed result sheet. It is deliberately tool-neutral: the exercise page
defines the required inputs and outputs, while you may use a suitable workflow
available in your institution unless the exercise specifies a particular tool,
version, database or reference.

> **Important:** This is training guidance, not a clinical standard operating
> procedure. Use only the data supplied for the exercise and do not use exercise
> outputs to make clinical or public-health decisions.

## Choose an exercise

- [Short-read assembly](/guides/short-read-assembly)
- [Hybrid assembly](/guides/hybrid-assembly)
- [Genotyping](/guides/genotyping)
- [Outbreak analysis](/guides/outbreak-analysis)
- [Submission and troubleshooting](/guides/submission-and-troubleshooting)

## Read the task as a data contract

Before running an analysis, identify:

- the biological question;
- the input file types;
- the public sample identifier;
- the required output columns and file formats;
- any required reference, database, naming convention or threshold;
- which fields will be assessed; and
- the submission deadline for a timed challenge.

The exercise page and downloaded result sheet are the definitive instructions
for that release. Do not rename, remove or reorder result-sheet columns unless
the exercise explicitly permits it. Do not replace the public sample identifier
with an internal laboratory identifier.

## Check the downloaded files

Confirm that every sample listed in the result sheet has the expected inputs.

For paired-end short reads:

- each sample should have an R1 and R2 file;
- the pair should use the same sample identifier;
- the files should be readable and decompress without errors; and
- the files should not be empty or unexpectedly small.

For hybrid assembly, also confirm that the long-read file belongs to the same
sample. For genotyping, confirm that each FASTA file contains sequence. For
outbreak analysis, confirm that the metadata and read filenames describe the
same sample set.

If checksums are supplied, verify them before analysis. Keep the original
downloaded files unchanged.

## Use a clear working directory

```text
exercise/
|-- input/          # original downloaded files
|-- work/           # intermediate files
|-- results/        # final assemblies, reports and tables
|-- logs/           # software logs and run summaries
|-- submission/     # completed result sheet and deliverables
`-- provenance/     # commands, versions, parameters and checksums
```

Write results to a new directory rather than into `input/`. Use one stable
sample identifier throughout filenames, outputs and the submission sheet.

## Choose a reproducible environment

Use an approach supported by your local infrastructure:

- an existing institutional workflow;
- an Apptainer/Singularity or Docker container;
- an isolated Conda or Micromamba environment; or
- a version-controlled workflow such as Nextflow.

On shared or high-performance computing systems, follow local scheduler,
storage, installation and container policies.

Record:

- workflow or software name;
- software and database versions;
- command or configuration;
- important non-default parameters;
- container image or environment specification;
- reference accession and version, where applicable; and
- analysis date.

Save the actual command or configuration rather than reconstructing it later.

## Common workflow

### 1. Inventory the inputs

Create a manifest containing the public sample identifier and the path to every
input file. Use it to detect missing files, duplicates and mismatched pairs.

### 2. Inspect raw-data quality

Depending on the exercise, review:

- read count and total bases;
- per-base quality and adapter content;
- read-length distribution;
- ambiguous bases and duplication;
- taxonomic composition; and
- coverage relative to an expected bacterial genome size.

No single plot or metric is sufficient. Interpret the checks together and keep
the reports.

### 3. Run the primary analysis

Test one sample first. Confirm that the expected output files are produced
before scaling to the full dataset.

### 4. Evaluate plausibility

A completed command is not the same as a valid result. Look for unexpected
species assignments, mixed data, abnormal genome size or GC content,
fragmentation, poor mapping, unusual variant counts, ambiguous typing calls and
disagreement between related outputs.

Thresholds are guides, not substitutes for reviewing the evidence.

### 5. Record an interpretation

For every sample, assign the exact outcome vocabulary requested by the result
sheet. Explain failures and important caveats. Do not silently remove a
difficult sample.

### 6. Validate the submission

Use the [submission checklist](/guides/submission-and-troubleshooting) before
uploading the result sheet.
