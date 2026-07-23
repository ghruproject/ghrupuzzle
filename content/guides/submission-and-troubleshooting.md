---
slug: submission-and-troubleshooting
title: Submission and troubleshooting
summary: Record provenance, validate the result sheet and diagnose common workflow failures.
exercise: all
order: 7
---

# Submission and troubleshooting

## Record provenance

Keep a short provenance record with every analysis:

```text
Exercise:
Release or dataset:
Analysis date:
Participant or team:
Computing environment:
Workflow/software:
Version:
Database version:
Container/environment:
Reference accession or checksum:
Command/configuration:
Non-default parameters:
Input checksums:
Output directory:
QC exclusions and reasons:
Known limitations:
```

Do not include passwords, access tokens or other secrets in logs or submitted
files.

## Final submission checklist

### Analysis

- [ ] Every expected sample was analysed or explicitly marked with a reason.
- [ ] Input identity and pairing were checked.
- [ ] Raw-data and output QC were reviewed.
- [ ] Taxonomic calls were checked rather than assumed.
- [ ] Important warnings and ambiguous results were retained.
- [ ] Software, database, reference and parameter details were recorded.

### Result sheet

- [ ] The supplied template was used.
- [ ] Column names were not changed.
- [ ] Public sample identifiers match exactly.
- [ ] There is one row per sample and no duplicate row.
- [ ] Controlled values and separators are consistent.
- [ ] Formulas were replaced by values.
- [ ] The file was saved as a valid UTF-8 CSV.
- [ ] The saved file was reopened and checked.

### Additional files

- [ ] Required assemblies, tree or project files are present.
- [ ] Filenames are descriptive and contain no sensitive information.
- [ ] Tree tip names match metadata identifiers.
- [ ] The package contains results, not unnecessary intermediate files.
- [ ] No password, token or confidential local path is included.

## CSV checks

Before uploading:

- keep one row per expected sample;
- retain the original column names;
- use the public sample identifier exactly;
- remove formulas and save calculated values;
- use UTF-8 CSV unless instructed otherwise;
- quote commas contained within values;
- remove blank trailing rows and duplicate headers; and
- reopen the saved file in a plain-text editor.

## Troubleshooting

When a workflow fails:

1. Read the first meaningful error in the log, not only the final exit message.
2. Check paths, permissions, disk space and memory.
3. Confirm that inputs are complete and correctly formatted.
4. Reproduce the problem with one sample.
5. Record the software version and exact command.
6. Avoid changing several parameters at once.
7. Ask for help with the error, command, version and a non-sensitive
   description of the input.

If a workflow finishes but the result looks biologically implausible, treat
that as a QC failure to investigate. Do not choose a result solely because it
is closest to the expected answer.

## Return to an exercise

- [Short-read assembly practice](/assembly/practice)
- [Hybrid assembly practice](/hybrid-assembly/practice)
- [Genotyping practice](/typing/practice)
- [Outbreak analysis practice](/outbreak/practice)
