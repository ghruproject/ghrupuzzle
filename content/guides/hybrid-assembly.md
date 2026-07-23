---
slug: hybrid-assembly
title: Hybrid assembly
summary: Combine short and long reads, assess polishing and decide whether each assembly is complete or fragmented.
exercise: hybrid
order: 4
---

# Hybrid assembly

## What this exercise tests

You are given paired-end short reads and a long-read file for each sample.
Combine both data types, assess the result and report whether the assembly is
complete, circularised or still fragmented.

## Before starting

Confirm that all three files belong to the same public sample identifier. Check
the requirements in [installing bioinformatics tools](/guides/installing-tools);
the recommended GHRU-assembly hybrid route requires Linux or WSL2.

## 1. Inspect short reads

```bash
pixi run bactscout qc /absolute/path/to/short_reads \
  -o /absolute/path/to/short_read_qc \
  -t 8
```

Review quality, coverage and taxonomic composition before combining the reads.

## 2. Inspect long reads

For ONT R10 data:

```bash
pixi run bactscout long qc /absolute/path/to/long_reads \
  --platform ont_r10
```

Select the platform value that matches the supplied data. Review read count,
yield, N50, quality, coverage and taxonomy.

## 3. Prepare the GHRU-assembly sample sheet

```csv
sample_id,short_reads1,short_reads2,long_reads,genome_size
sample_01,/data/sample_01_R1.fastq.gz,/data/sample_01_R2.fastq.gz,/data/sample_01_long.fastq.gz,5.5m
```

Use absolute paths and keep one row per sample.

## 4. Run the hybrid workflow

```bash
git clone https://github.com/ghruproject/GHRU-assembly.git
cd GHRU-assembly

nextflow run main.nf \
  --samplesheet /absolute/path/to/samplesheet.csv \
  --outdir /absolute/path/to/hybrid_results \
  -resume
```

The hybrid route uses Unicycler and runs QC around the assembly. Record the
pipeline version, Nextflow version, container profile and non-default
parameters. An equivalent hybrid workflow is acceptable unless one is
specified by the exercise.

## 5. Judge completeness carefully

- **single contig:** a structural description only;
- **circularised:** supported by the assembly graph or validated terminal
  overlap;
- **complete:** expected replicons appear resolved and QC evidence is coherent;
- **fragmented:** unresolved sequence remains across multiple contigs.

Inspect the assembly graph, read mapping and coverage. Check whether small
plasmids or other replicons may have been lost. Do not call a contig circular
only because it is long.

## Fill the result sheet

Record the public identifier, input filenames, assembler and version, species
classification, overall QC outcome, polishing/circularisation evidence and any
unresolved contamination, repeats or missing replicons.

## Common problems

**Short- and long-read taxonomy disagree:** Stop and recheck sample identity.

**Suspicious duplication at contig ends:** Inspect terminal overlap and the
assembly graph.

**Small replicons are absent:** Review long-read coverage and unassembled reads.

**Polishing reduces quality:** Confirm the correct reads, model and draft were
used.

Next: [submission and troubleshooting](/guides/submission-and-troubleshooting).
