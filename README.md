# GHRUPuzzles

GHRUPuzzles is a Next.js site for publishing controlled microbial genomics exercises.

The current exercise set includes:

- short-read genome assembly
- hybrid assembly with simulated short and long reads
- genotyping
- outbreak investigation

## Repo Role

This repository is the website and publishing layer.

It is responsible for:

- rendering the exercise pages
- loading published dataset manifests from `public/*_file_details.json`
- exposing download links for reads and sample sheets
- uploading website-ready datasets to R2 with `scripts/update_dataset.py`

It is not the primary simulation engine.

Dataset generation should stay in a separate local checkout of:

- `https://github.com/happykhan/genomepuzzle`

## Key Paths

- `app/`: Next.js routes
- `components/`: shared UI and exercise rendering
- `lib/`: exercise definitions and dataset types
- `public/`: published dataset manifests and helper download scripts
- `datasets/`: local seed CSVs for dataset generation workflows
- `scripts/update_dataset.py`: publish website-ready datasets to R2 and refresh manifest JSON
- `scripts/generate_hybrid_dataset.py`: run the local `genomepuzzle` engine and convert its output into website-ready hybrid exercise directories

## UI

The site has been refactored onto a local `genomicx/ui`-style shell rather than the original Bulma-only layout.

That refactor includes:

- shared page shell and navigation
- shared exercise renderer for challenge and practice routes
- dedicated hybrid assembly pages

## Hybrid Dataset Workflow

Keep the simulator outside this repo. Expected local layout:

```text
../genomepuzzle
../genomepuzzle/ghru_output_dataset/hybrid_assembly_work
../genomepuzzle/ghru_output_dataset/hybrid_assembly_practice
../genomepuzzle/ghru_output_dataset/hybrid_assembly_real
```

Clone the generator once:

```bash
git clone https://github.com/happykhan/genomepuzzle ../genomepuzzle
```

Generate a website-ready hybrid practice dataset:

```bash
python3 scripts/generate_hybrid_dataset.py \
  --samplelist datasets/hybrid_assembly_template.csv \
  --engine-output-dir ../genomepuzzle/ghru_output_dataset/hybrid_assembly_work \
  --output-dir ../genomepuzzle/ghru_output_dataset/hybrid_assembly_practice
```

What that script does:

- runs `genomepuzzle rapid`
- collects generated `*_R1.fastq.gz`, `*_R2.fastq.gz`, and `*_long.fastq.gz` files
- renames them to anonymised public sample names
- creates `answer_sheet.csv`
- creates `sample_sheet.csv`

The starter file at `datasets/hybrid_assembly_template.csv` is only a minimal seed. Replace it with the actual accession set you want to simulate.

## Publishing Datasets

Once a website-ready dataset directory exists, publish it with:

```bash
python3 scripts/update_dataset.py \
  --hybridpath ../genomepuzzle/ghru_output_dataset/hybrid_assembly_practice \
  --realhybridpath ../genomepuzzle/ghru_output_dataset/hybrid_assembly_real
```

That script:

- uploads reads and sheets to R2
- writes `public/*_file_details.json`
- generates `curl` and `wget` helper download scripts

Hybrid dataset directories are expected to contain:

```text
Sample_xxxxx_R1.fastq.gz
Sample_xxxxx_R2.fastq.gz
Sample_xxxxx_long.fastq.gz
answer_sheet.csv
sample_sheet.csv
```

## Development

Run the site in a Node-enabled shell:

```bash
npm install
npm run dev
```

This Codex environment did not have `node` or `npm` on `PATH`, so local Next.js build verification was not possible here.

## GitHub

Current feature branch for this work:

- `codex/genomicx-hybrid-assembly`

Pushed changes include:

- UI refactor
- hybrid assembly routes
- hybrid dataset bridge script
- hybrid manifest scaffolding

## Deployment

This repo does not currently define a deployment target in versioned config.

There is no checked-in:

- `vercel.json`
- `netlify.toml`
- GitHub Actions deploy workflow
- other explicit hosting configuration

So deployment is still a separate step from pushing code. If this site is already connected to a hosting provider outside the repo, merge to the tracked production branch and let that provider deploy. Otherwise, add the deployment target explicitly first.
