---
slug: short-read-assembly
title: Short-read assembly
summary: Inspect paired-end reads, assemble each bacterial genome and return a defensible species and QC result.
exercise: assembly
order: 3
---

# Short-read assembly

## What this exercise tests

You are given paired-end short reads and a result-sheet template. Assemble each
genome, inspect read and assembly quality, identify the organism and explain any
failed or questionable result.

## Before starting

1. Read [installing bioinformatics tools](/guides/installing-tools).
2. Download the R1 and R2 files and result sheet.
3. Confirm that every public sample identifier has one read pair.
4. Keep the downloaded files unchanged.

```bash
gzip -t input/*.fastq.gz
ls -lh input/
```

## Recommended route

The recommended worked route uses
[BactScout](https://github.com/ghruproject/bactscout) for read QC and
[GHRU-assembly](https://github.com/ghruproject/GHRU-assembly) for assembly and
post-assembly checks. An equivalent documented bacterial assembly workflow is
also acceptable unless the exercise states otherwise.

### 1. Inspect the reads with BactScout

From a BactScout checkout:

```bash
pixi run bactscout qc /absolute/path/to/input \
  -o /absolute/path/to/bactscout_results \
  -t 8
```

Review `final_summary.csv` and the per-sample reports. Look for low Q30,
adapter or ambiguous-base warnings, inadequate coverage, unexpected taxonomy
and mixed-sample evidence. Record how warnings affected the final QC decision.

### 2. Prepare the GHRU-assembly sample sheet

Create a CSV with absolute input paths. Leave `long_reads` empty for a
short-read-only sample.

```csv
sample_id,short_reads1,short_reads2,long_reads,genome_size
sample_01,/data/sample_01_R1.fastq.gz,/data/sample_01_R2.fastq.gz,,5.5m
```

Sample identifiers and paths must not contain spaces. FASTQ inputs must end in
`.fq.gz` or `.fastq.gz`.

### 3. Run the assembly workflow

```bash
git clone https://github.com/ghruproject/GHRU-assembly.git
cd GHRU-assembly

nextflow run main.nf \
  --samplesheet /absolute/path/to/samplesheet.csv \
  --outdir /absolute/path/to/assembly_results \
  -resume
```

The short-read route uses Shovill and includes trimming, assembly assessment,
taxonomy and contamination-oriented checks. Save the command and execution
report.

## Evidence to inspect

- total assembly length;
- number of contigs and N50;
- GC content;
- read depth or mapped-read proportion;
- taxonomic classification;
- completeness and contamination evidence;
- extremely short or duplicated contigs; and
- agreement between read-level and assembly-level findings.

N50 is not a correctness score. A contiguous assembly can contain the wrong
organism, contamination or a misassembly.

## Fill the result sheet

- `sample_name`: preserve the supplied public identifier.
- `tax_classification`: record the organism supported by your analysis.
- `r1` and `r2`: retain the correct paired filenames.
- `qc`: use the exact vocabulary requested by the template.
- `error`: give the main reason for a failed result.
- `notes`: record warnings, important parameters and interpretation.

Do not copy an expected species label into `tax_classification` without
checking the evidence.

## Common problems

**Very small assembly:** Check read pairing, coverage, trimming and file paths.

**Very large assembly:** Investigate contamination, duplicated sequence or
unfiltered short contigs.

**Many short contigs:** Review coverage, read quality, mixed content and repeat
structure.

**QC tools disagree:** Recheck the underlying reports before choosing a final
call.

Next: [submission and troubleshooting](/guides/submission-and-troubleshooting).
