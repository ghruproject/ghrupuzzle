# Repository working rules

## Git policy

Use plain `git` for all repository operations on this machine. The GitHub CLI
(`gh`) is not available and must not be requested, installed, or treated as a
prerequisite. Use configured Git remotes for fetching and pushing.

## Dataset execution

Computationally heavy biological generation and analysis belongs on SLURM in
the sibling `genomepuzzle` repository. This web application must not perform
assemblies, read simulation, Kleborate batches, phylogenetic inference, or
dataset-wide QC during web requests.
