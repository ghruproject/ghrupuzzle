---
slug: genotyping
title: Genotyping
summary: Run Kleborate on supplied assemblies and return consistent species, sequence-type, surface-locus and resistance calls.
exercise: typing
order: 5
---

# Genotyping

## What this exercise tests

You are given bacterial genome assemblies. The result sheet asks for consistent
species, sequence type, capsule and O-antigen calls, plus selected resistance
determinants.

The worked route uses
[Kleborate](https://github.com/klebgenomics/Kleborate), which is designed for
the *Klebsiella pneumoniae* species complex.

## Install Kleborate

Use a separate Conda environment:

```bash
conda create -n kleborate -c conda-forge -c bioconda \
  --strict-channel-priority kleborate
conda activate kleborate

amrfinder -u
kleborate --version
kleborate --list_modules
```

See [installing bioinformatics tools](/guides/installing-tools) for general
environment guidance.

## Check the assemblies

Confirm that every file contains sequence and that identifiers are unique:

```bash
grep -H -m 1 '^>' input/*.fasta
ls -lh input/*.fasta
```

Very small, fragmented or contaminated assemblies can produce missing or
multiple locus calls.

## Run the KpSC preset

```bash
kleborate \
  -a input/*.fasta \
  -o kleborate_results \
  -p kpsc \
  --trim_headers
```

Kleborate accepts `.fasta` and `.fasta.gz` inputs. The KpSC preset reports
species, MLST, virulence, resistance and K/O locus information. Record the
Kleborate and database versions.

## Interpret the output

Review warnings and confidence fields before transferring values:

- `st`: MLST sequence type;
- `k_locus`: K-locus designation;
- `capsule_type`: capsule interpretation associated with the K locus;
- `wzi`: reported *wzi* allele;
- `o_locus`: O-antigen locus;
- `o_type`: O-antigen serotype interpretation;
- `bla_carb`: detected carbapenemase genes; and
- `species`: organism classification supported by the analysis.

The locus designation and inferred serotype are related but are not
interchangeable. Keep missing, novel and low-confidence calls explicit.

## Normalise the result sheet

Use the exact sample identifier and column names supplied by the exercise.
Preserve allele and locus nomenclature. When more than one resistance
determinant is present, use the requested separator and place explanations in a
notes field rather than inside a controlled-value column.

## Common problems

**No ST call:** Investigate missing or fragmented housekeeping loci, poor
assembly quality or the wrong scheme.

**Multiple alleles:** Review contamination and mixed-sample evidence.

**Unexpected species:** Confirm the input and do not force the KpSC preset onto
an unrelated organism.

**Different calls between runs:** Check Kleborate, Kaptive and AMRFinder
database versions.

Next: [submission and troubleshooting](/guides/submission-and-troubleshooting).
