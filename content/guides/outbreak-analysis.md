---
slug: outbreak-analysis
title: Outbreak analysis
summary: Inspect reads, call variants against one reference, infer a phylogeny and assign analytical clusters.
exercise: outbreak
order: 6
---

# Outbreak analysis

## What this exercise tests

You are given paired-end reads and epidemiological metadata. Perform a
consistent mapping-based analysis, build a tree and use both genomic and
contextual evidence to assign analytical clusters.

The commands below form a worked example. Equivalent validated bacterial
variant-calling workflows are acceptable unless the exercise specifies one.

## 1. Inspect every read pair

Use [BactScout](https://github.com/ghruproject/bactscout) before mapping:

```bash
pixi run bactscout qc /absolute/path/to/reads \
  -o /absolute/path/to/bactscout_results \
  -t 8
```

Remove or flag a sample only with a recorded reason. Different species or
strong contamination signals should not silently enter the same phylogeny.

## 2. Install the worked-example tools

```bash
conda create -n outbreak -c conda-forge -c bioconda \
  --strict-channel-priority snippy iqtree
conda activate outbreak

snippy --version
snippy --check
iqtree2 --version
```

## 3. Use one reference for the cohort

Use the reference specified by the exercise. If none is specified, select a
high-quality, closely related reference and record its accession and version.
All samples must use the same reference and filtering rules.

Example for one sample:

```bash
snippy \
  --cpus 8 \
  --outdir work/sample_01 \
  --ref reference/reference.gbk \
  --R1 reads/sample_01_R1.fastq.gz \
  --R2 reads/sample_01_R2.fastq.gz
```

Repeat consistently for each sample. Review `snps.txt`, `snps.log`, BAM/VCF
outputs and coverage evidence before building a shared alignment.

## 4. Build the core SNP alignment

```bash
snippy-core \
  --prefix results/core \
  work/sample_01 \
  work/sample_02 \
  work/sample_03
```

Confirm that `core.aln` contains every expected sample and enough callable
sites. A single poor sample can greatly reduce the shared core.

## 5. Infer a tree

For a SNP-only alignment, include an ascertainment-bias correction:

```bash
iqtree2 \
  -s results/core.aln \
  -m GTR+ASC \
  -B 1000 \
  -T AUTO
```

Retain the `.treefile`, `.iqtree` report and logs. Review branch support and
investigate unusually long branches before assigning clusters.

## 6. Combine the tree and metadata

Tree tip names must match metadata identifiers exactly. A visualisation tool
such as [Microreact](https://microreact.org/) can be useful for reviewing the
tree alongside sample metadata. Before combining them:

- keep one metadata row per sample;
- use an unambiguous date format;
- check that tree and metadata identifiers join;
- inspect colours, locations and dates; and
- confirm that the visualised tree and metadata support your reported cluster
  assignments.

## Assign clusters

Do not apply a universal SNP threshold unless the exercise defines one.
Consider genetic distance, topology, branch support, collection date, location,
host/source information and QC limitations together. A phylogenetic tree does
not prove direct transmission.

Use stable labels such as `Cluster 1`, `Cluster 2` and `Unclustered`, unless the
result sheet requests another vocabulary.

## Common problems

**Low mapping:** Check species, contamination, reference distance and read
quality.

**Very small shared core:** Identify divergent or low-coverage samples and
review filtering.

**Extremely long branch:** Investigate contamination, mixed reads and calling
errors.

**Tree and metadata fail to join:** Normalise identifiers once and reuse them.

Next: [submission and troubleshooting](/guides/submission-and-troubleshooting).
