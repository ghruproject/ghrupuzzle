---
slug: installing-tools
title: Installing bioinformatics tools
summary: Set up reproducible Pixi, Conda, Docker, Nextflow or Apptainer environments before starting an exercise.
exercise: all
order: 2
---

# Installing bioinformatics tools

The exercises run on your own computer or computing service. A Linux system is
recommended. Windows users should use WSL2; macOS users should check each tool's
platform support before starting.

> Install and test the software before a timed challenge. Do not spend the
> challenge window resolving Docker permissions or downloading databases.

## Choose one installation route

| Environment | Best use |
| --- | --- |
| Pixi | Reproducible command-line environments, including BactScout |
| Conda or Micromamba | Individual Bioconda tools such as Kleborate, Snippy and IQ-TREE |
| Docker | Complete containerised workflows on a workstation or WSL2 |
| Apptainer | Containers on an HPC system where Docker is unavailable |
| Existing institutional pipeline | Valid when its tools, versions and settings can be recorded |

Avoid installing several competing versions into the same environment.

## Pixi

[Pixi](https://pixi.sh/) installs a project's declared tools and dependencies.

```bash
curl -fsSL https://pixi.sh/install.sh | bash
pixi --version
```

For [BactScout](https://github.com/ghruproject/bactscout):

```bash
git clone https://github.com/ghruproject/bactscout.git
cd bactscout
pixi install
pixi run bactscout --help
pixi run bactscout version
```

## Conda or Micromamba

Create a separate environment for each workflow. Configure Bioconda according
to the [Bioconda installation instructions](https://bioconda.github.io/).

```bash
conda create -n ghru-tools -c conda-forge -c bioconda \
  --strict-channel-priority snippy iqtree kleborate
conda activate ghru-tools

snippy --version
snippy --check
iqtree2 --version
kleborate --version
```

If your system provides Micromamba, the equivalent `micromamba create` and
`micromamba activate` commands can be used.

## Docker

Install Docker Engine on Linux or Docker Desktop with WSL2 integration on
Windows. Confirm that containers can run:

```bash
docker version
docker run --rm hello-world
```

BactScout provides a ready-to-run image:

```bash
docker pull happykhan/bactscout:latest

docker run --rm \
  -v "$PWD":/data \
  --user "$(id -u):$(id -g)" \
  happykhan/bactscout:latest \
  bactscout qc /data/reads -o /data/bactscout_results
```

Use an explicit image tag rather than `latest` when you need to reproduce a
completed analysis later.

## Nextflow and GHRU-assembly

[GHRU-assembly](https://github.com/ghruproject/GHRU-assembly) is a Nextflow
workflow. It uses Shovill for short reads, Dragonflye for long reads and
Unicycler for hybrid data.

Requirements:

- Linux or WSL2;
- Nextflow 24.10.3 or newer;
- Docker, or an appropriate institutional container configuration;
- approximately 10 CPU cores, 16 GB RAM and 50 GB free storage for the supplied
  examples.

Install Nextflow using the method approved by your institution, then verify it:

```bash
nextflow -version
docker version

git clone https://github.com/ghruproject/GHRU-assembly.git
cd GHRU-assembly
nextflow run main.nf --help
```

Hybrid and long-read execution is not currently recommended on macOS because
of Medaka compatibility limitations documented by the pipeline.

## Apptainer on HPC

Do not run Docker on a shared cluster unless the administrators explicitly
support it. Load the institutional Nextflow and Apptainer modules, or use the
versions provided by your workflow platform.

```bash
module load nextflow
module load apptainer

nextflow -version
apptainer --version
```

Ask the cluster team which executor, queue, project code and bind paths should
be used. Test one sample before submitting the full cohort.

## Record the environment

Save these details with every submission:

```text
Operating system:
Workflow and version:
Container image and tag:
Database version:
Command:
Non-default parameters:
Analysis date:
```

Continue to [getting started](/guides/getting-started) or open the guide for
your exercise.
