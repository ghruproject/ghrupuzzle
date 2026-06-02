import argparse
import csv
import hashlib
import os
import shutil
import subprocess
from typing import Dict, List


def load_rows(path: str) -> List[Dict[str, str]]:
    with open(path, encoding="utf-8") as handle:
        return [row for row in csv.DictReader(handle)]


def stable_public_name(accession: str, random_seed: int) -> str:
    digest = hashlib.md5(f"{accession}:{random_seed}".encode("utf-8")).hexdigest()[:10]
    return f"Sample_{digest}"


def write_csv(path: str, rows: List[Dict[str, str]], fieldnames: List[str]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def run_engine(engine_dir: str, samplelist: str, output_dir: str) -> None:
    command = [
        "python3",
        os.path.join(engine_dir, "genomepuzzle", "main.py"),
        "rapid",
        "--samplelist",
        samplelist,
        "--output_dir",
        output_dir,
    ]
    subprocess.run(command, check=True)


def stage_outputs(source_dir: str, output_dir: str, rows: List[Dict[str, str]], random_seed: int) -> None:
    os.makedirs(output_dir, exist_ok=True)
    answer_rows = []
    sample_rows = []

    for row in rows:
        accession = row["accession"]
        public_name = row.get("public_name") or stable_public_name(accession, random_seed)
        species = row.get("organism_organismname") or row.get("species") or "Unknown"
        renamed_files = {
            "r1": f"{public_name}_R1.fastq.gz",
            "r2": f"{public_name}_R2.fastq.gz",
            "long_reads": f"{public_name}_long.fastq.gz",
        }

        shutil.copyfile(
            os.path.join(source_dir, f"{accession}_R1.fastq.gz"),
            os.path.join(output_dir, renamed_files["r1"]),
        )
        shutil.copyfile(
            os.path.join(source_dir, f"{accession}_R2.fastq.gz"),
            os.path.join(output_dir, renamed_files["r2"]),
        )
        shutil.copyfile(
            os.path.join(source_dir, f"{accession}_long.fastq.gz"),
            os.path.join(output_dir, renamed_files["long_reads"]),
        )

        answer_rows.append(
            {
                "public_name": public_name,
                "species": species,
                "reference_accession": accession,
                "assembler": "Unknown",
                "tax_classification": species,
                "qc": "PASSED",
                "notes": f"Generated with genomepuzzle rapid; original assembly {row.get('original_assembly', '')}",
            }
        )
        sample_rows.append(
            {
                "sample_name": public_name,
                "reference_accession": accession,
                "species": species,
                "tax_classification": "",
                "r1": renamed_files["r1"],
                "r2": renamed_files["r2"],
                "long_reads": renamed_files["long_reads"],
                "assembler": "",
                "qc": "",
                "notes": "",
            }
        )

    write_csv(
        os.path.join(output_dir, "answer_sheet.csv"),
        answer_rows,
        ["public_name", "species", "reference_accession", "assembler", "tax_classification", "qc", "notes"],
    )
    write_csv(
        os.path.join(output_dir, "sample_sheet.csv"),
        sample_rows,
        ["sample_name", "reference_accession", "species", "tax_classification", "r1", "r2", "long_reads", "assembler", "qc", "notes"],
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a website-ready hybrid assembly dataset from the local genomepuzzle engine."
    )
    parser.add_argument(
        "--engine-dir",
        default="../genomepuzzle",
        help="Path to the local genomepuzzle checkout.",
    )
    parser.add_argument(
        "--samplelist",
        required=True,
        help="CSV input for genomepuzzle rapid. This should include accession and assemblystats_totalsequencelength.",
    )
    parser.add_argument(
        "--engine-output-dir",
        default="../genomepuzzle/ghru_output_dataset/hybrid_assembly_work",
        help="Working directory where genomepuzzle rapid writes its raw outputs.",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Final website dataset directory containing renamed reads plus answer_sheet.csv and sample_sheet.csv.",
    )
    parser.add_argument(
        "--skip-engine",
        action="store_true",
        help="Skip running genomepuzzle rapid and only transform an existing engine output directory.",
    )
    parser.add_argument(
        "--random-seed",
        type=int,
        default=42,
        help="Seed used to generate deterministic public sample names.",
    )
    args = parser.parse_args()

    if not args.skip_engine:
        os.makedirs(args.engine_output_dir, exist_ok=True)
        run_engine(args.engine_dir, args.samplelist, args.engine_output_dir)

    rows = load_rows(os.path.join(args.engine_output_dir, "sample_sheet.csv"))
    stage_outputs(args.engine_output_dir, args.output_dir, rows, args.random_seed)


if __name__ == "__main__":
    main()
