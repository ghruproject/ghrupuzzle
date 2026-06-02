# GHRUPuzzles

Next.js site for publishing controlled microbial genomics exercises.

## Exercises

- Short-read assembly
- Hybrid assembly with simulated short and long reads
- Genotyping
- Outbreak analysis

## Local Structure

- `app/`: Next.js routes and UI
- `public/*_file_details.json`: published dataset manifests consumed by the site
- `scripts/update_dataset.py`: uploads website-ready exercise directories to R2 and refreshes manifest JSON
- `scripts/generate_hybrid_dataset.py`: runs the local `genomepuzzle` engine and converts its output into a website-ready hybrid dataset directory

## Hybrid Dataset Workflow

The simulator should stay outside this repo. The expected local layout is:

```text
../genomepuzzle
../genomepuzzle/ghru_output_dataset/hybrid_assembly_practice
../genomepuzzle/ghru_output_dataset/hybrid_assembly_real
```

Clone the generator once:

```bash
git clone https://github.com/happykhan/genomepuzzle ../genomepuzzle
```

Generate a website-ready hybrid practice dataset from the local engine:

```bash
python3 scripts/generate_hybrid_dataset.py \
  --samplelist datasets/hybrid_assembly_template.csv \
  --engine-output-dir ../genomepuzzle/ghru_output_dataset/hybrid_assembly_work \
  --output-dir ../genomepuzzle/ghru_output_dataset/hybrid_assembly_practice
```

The bridge script will:

- run `genomepuzzle rapid`
- collect the generated `*_R1.fastq.gz`, `*_R2.fastq.gz`, and `*_long.fastq.gz` files
- rename them to anonymised public sample names
- emit `answer_sheet.csv` and `sample_sheet.csv` in the format expected by this website

`datasets/hybrid_assembly_template.csv` is a minimal seed file. In practice you will usually replace it with a richer accession list exported from NCBI Datasets.

Upload refreshed manifests and download helpers:

```bash
python3 scripts/update_dataset.py \
  --hybridpath ../genomepuzzle/ghru_output_dataset/hybrid_assembly_practice \
  --realhybridpath ../genomepuzzle/ghru_output_dataset/hybrid_assembly_real
```

Hybrid directories are expected to contain:

```text
Sample_xxxxx_R1.fastq.gz
Sample_xxxxx_R2.fastq.gz
Sample_xxxxx_long.fastq.gz
answer_sheet.csv
sample_sheet.csv
```

## Dev

This environment currently has no `node`/`npm` on `PATH`, so UI dependency installs and local Next.js builds need to happen in a Node-enabled shell.
