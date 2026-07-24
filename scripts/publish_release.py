"""Validate and publish a GenomePuzzle public release package to R2."""

import argparse
import copy
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any, Mapping
from urllib.parse import quote

try:
    import boto3
    from botocore.client import Config
    from dotenv import load_dotenv
except ModuleNotFoundError:  # Validation and dry runs do not require upload dependencies.
    boto3 = None
    Config = None
    load_dotenv = None


SCHEMA_VERSION = "2.0"
EXERCISES = {"typing", "assembly", "hybrid", "outbreak"}
MODES = {"practice", "challenge"}
FORBIDDEN_KEYS = {
    "answer",
    "answers",
    "answer_key",
    "expected",
    "expected_answers",
    "implant",
    "implant_type",
    "reference_accession",
    "source",
    "source_id",
    "source_name",
    "truth",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def bundle_sha256(release_path: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(item for item in release_path.rglob("*") if item.is_file()):
        relative = path.relative_to(release_path).as_posix()
        if path.name in {"COMPLETE", "COMPLETE.json"} or relative.startswith("build/"):
            continue
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(sha256_file(path).encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest()


def _assert_no_private_keys(value: Any, path: str = "manifest") -> None:
    if isinstance(value, Mapping):
        for key, item in value.items():
            if str(key).lower() in FORBIDDEN_KEYS:
                raise ValueError(
                    "private field {0}.{1} cannot be published".format(path, key)
                )
            _assert_no_private_keys(item, "{0}.{1}".format(path, key))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _assert_no_private_keys(item, "{0}[{1}]".format(path, index))


def load_and_validate_release(release_dir):
    """Validate a public release package without accessing its private directory."""

    release_path = Path(release_dir).resolve()
    public_dir = release_path / "public"
    release_index_path = release_path / "release.json"
    complete_path = release_path / "COMPLETE.json"
    manifest_path = public_dir / "manifest.json"
    for required_path in (release_index_path, complete_path, manifest_path):
        if not required_path.is_file():
            raise ValueError("missing release artifact: {0}".format(required_path))
    with open(release_index_path, encoding="utf-8") as handle:
        release_index = json.load(handle)
    with open(complete_path, encoding="utf-8") as handle:
        complete = json.load(handle)
    if not manifest_path.is_file():
        raise ValueError("missing public dataset manifest: {0}".format(manifest_path))

    with open(manifest_path, encoding="utf-8") as handle:
        manifest = json.load(handle)
    if not isinstance(manifest, dict):
        raise ValueError("public dataset manifest must be a JSON object")
    _assert_no_private_keys(manifest)

    if str(manifest.get("schema_version")) != SCHEMA_VERSION:
        raise ValueError("unsupported public manifest schema version")
    if release_index.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("unsupported release index schema version")
    if complete.get("status") != "complete":
        raise ValueError("release is not complete")
    if complete.get("bundle_sha256") != bundle_sha256(release_path):
        raise ValueError("release content digest does not match COMPLETE.json")
    release_id = manifest.get("release_id")
    if not isinstance(release_id, str) or not release_id:
        raise ValueError("public manifest is missing release_id")
    if manifest.get("exercise") not in EXERCISES:
        raise ValueError("public manifest has an unsupported exercise")
    if manifest.get("mode") not in MODES:
        raise ValueError("public manifest has an unsupported mode")
    for payload_name, payload in (
        ("release.json", release_index),
        ("COMPLETE.json", complete),
    ):
        if payload.get("release_id") != release_id:
            raise ValueError("{0} release_id differs from manifest".format(payload_name))

    samples = manifest.get("samples")
    if not isinstance(samples, list) or not samples:
        raise ValueError("public manifest must contain at least one sample")

    seen_ids = set()
    seen_filenames = set()
    resolved_files = []
    for sample_index, sample in enumerate(samples):
        if not isinstance(sample, dict):
            raise ValueError("sample {0} must be an object".format(sample_index))
        sample_id = sample.get("sample_id")
        if not isinstance(sample_id, str) or not sample_id:
            raise ValueError("sample {0} is missing sample_id".format(sample_index))
        if sample_id in seen_ids:
            raise ValueError("duplicate sample_id: {0}".format(sample_id))
        seen_ids.add(sample_id)

        files = sample.get("files")
        if not isinstance(files, dict) or not files:
            raise ValueError("sample {0} has no files".format(sample_id))
        for role, details in files.items():
            if not isinstance(details, dict):
                raise ValueError(
                    "file details for {0}/{1} must be an object".format(
                        sample_id, role
                    )
                )
            filename = details.get("filename")
            expected_sha256 = details.get("sha256")
            expected_size = details.get("size")
            if not isinstance(filename, str) or Path(filename).name != filename:
                raise ValueError(
                    "file for {0}/{1} must use a basename".format(sample_id, role)
                )
            if filename in seen_filenames:
                raise ValueError("duplicate participant filename: {0}".format(filename))
            seen_filenames.add(filename)
            if not filename.startswith("{0}_".format(sample_id)) and filename != (
                "{0}.fasta".format(sample_id)
            ):
                raise ValueError(
                    "participant filename does not match sample_id: {0}".format(
                        filename
                    )
                )
            file_path = public_dir / "files" / filename
            if not file_path.is_file():
                raise ValueError("missing participant file: {0}".format(file_path))
            actual_size = file_path.stat().st_size
            if expected_size != actual_size:
                raise ValueError("size mismatch for {0}".format(filename))
            actual_sha256 = sha256_file(file_path)
            if expected_sha256 != actual_sha256:
                raise ValueError("checksum mismatch for {0}".format(filename))
            resolved_files.append(
                {
                    "sample_id": sample_id,
                    "role": str(role),
                    "filename": filename,
                    "path": file_path,
                    "sha256": actual_sha256,
                    "size": actual_size,
                }
            )

    required_public_files = []
    for filename in (
        "sample_sheet.csv",
        "submission_schema.json",
        "instructions.md",
        "checksums.sha256",
    ):
        path = public_dir / filename
        if not path.is_file():
            raise ValueError("release is missing required public file: {0}".format(filename))
        if path.suffix == ".json":
            with open(path, encoding="utf-8") as handle:
                json.load(handle)
        required_public_files.append(path)

    return {
        "release_dir": release_path,
        "public_dir": public_dir,
        "manifest_path": manifest_path,
        "manifest": manifest,
        "release_index_path": release_index_path,
        "complete_path": complete_path,
        "participant_files": resolved_files,
        "required_public_files": required_public_files,
    }


def release_prefix(manifest: Mapping[str, Any]) -> str:
    return "releases/{release_id}/{exercise}/{mode}".format(
        release_id=manifest["release_id"],
        exercise=manifest["exercise"],
        mode=manifest["mode"],
    )


def build_upload_plan(validated, public_base_url):
    """Build an ordered upload plan with the manifest deliberately last."""

    manifest = validated["manifest"]
    prefix = release_prefix(manifest)
    plan = []
    for item in validated["participant_files"]:
        plan.append(
            {
                "path": item["path"],
                "key": "{0}/files/{1}".format(prefix, item["filename"]),
                "sha256": item["sha256"],
                "size": item["size"],
                "content_type": "application/gzip"
                if item["filename"].endswith(".gz")
                else "text/plain",
            }
        )
    for path in validated["required_public_files"]:
        plan.append(
            {
                "path": path,
                "key": "{0}/{1}".format(prefix, path.name),
                "sha256": sha256_file(path),
                "size": path.stat().st_size,
                "content_type": (
                    "application/json"
                    if path.suffix == ".json"
                    else "text/csv"
                    if path.suffix == ".csv"
                    else "text/markdown"
                    if path.suffix == ".md"
                    else "text/plain"
                ),
            }
        )

    for path in (validated["release_index_path"], validated["complete_path"]):
        plan.append(
            {
                "path": path,
                "key": "{0}/{1}".format(prefix, path.name),
                "sha256": sha256_file(path),
                "size": path.stat().st_size,
                "content_type": "application/json",
            }
        )

    published_manifest = copy.deepcopy(manifest)
    for sample in published_manifest["samples"]:
        for details in sample["files"].values():
            key = "{0}/files/{1}".format(prefix, details["filename"])
            details["url"] = "{0}/{1}".format(
                public_base_url.rstrip("/"), quote(key, safe="/")
            )
    sample_sheet_path = validated["public_dir"] / "sample_sheet.csv"
    if sample_sheet_path.is_file():
        sample_sheet_key = "{0}/sample_sheet.csv".format(prefix)
        published_manifest["sample_sheet"] = {
            "filename": "sample_sheet.csv",
            "url": "{0}/{1}".format(
                public_base_url.rstrip("/"), quote(sample_sheet_key, safe="/")
            ),
            "sha256": sha256_file(sample_sheet_path),
            "size": sample_sheet_path.stat().st_size,
        }

    plan.append(
        {
            "path": validated["manifest_path"],
            "key": "{0}/dataset_manifest.json".format(prefix),
            "sha256": sha256_file(validated["manifest_path"]),
            "size": validated["manifest_path"].stat().st_size,
            "content_type": "application/json",
            "published_manifest": published_manifest,
        }
    )
    return plan


def build_private_upload_plan(validated):
    """Validate and plan private truth uploads to a separate R2 bucket."""

    private_dir = validated["release_dir"] / "private"
    required = {
        "answer_key.json",
        "provenance.json",
        "implant_manifest.json",
        "scoring_policy.json",
        "validation_report.json",
    }
    missing = sorted(name for name in required if not (private_dir / name).is_file())
    if missing:
        raise ValueError(
            "private release package is missing: {0}".format(", ".join(missing))
        )
    prefix = release_prefix(validated["manifest"])
    plan = []
    for path in sorted(private_dir.rglob("*")):
        if not path.is_file() or path.name.startswith("."):
            continue
        if path.suffix not in {".json", ".csv", ".txt"}:
            raise ValueError("unsupported private artifact: {0}".format(path))
        if path.suffix == ".json":
            with open(path, encoding="utf-8") as handle:
                json.load(handle)
        relative = path.relative_to(private_dir).as_posix()
        plan.append(
            {
                "path": path,
                "key": "{0}/private/{1}".format(prefix, relative),
                "sha256": sha256_file(path),
                "size": path.stat().st_size,
                "content_type": "application/json"
                if path.suffix == ".json"
                else "text/csv"
                if path.suffix == ".csv"
                else "text/plain",
            }
        )
    return plan


def _load_upload_environment(dotenv_path, require_public_url=True):
    if boto3 is None or Config is None or load_dotenv is None:
        raise RuntimeError("Publishing requires boto3 and python-dotenv")
    # Publishing deliberately switches between public and private credentials
    # in one process. Override values loaded for the previous bucket so private
    # artifacts cannot inherit the public bucket configuration.
    if not load_dotenv(dotenv_path, override=True):
        raise ValueError("Could not load environment file: {0}".format(dotenv_path))
    values = {
        "bucket": os.getenv("BUCKET_NAME"),
        "access_key": os.getenv("ACCESS_KEY_ID"),
        "secret_key": os.getenv("SECRET_ACCESS_KEY"),
        "endpoint": os.getenv("ENDPOINT_URL"),
        "public_url": os.getenv("PUBLIC_URL"),
    }
    required = ["bucket", "access_key", "secret_key", "endpoint"]
    if require_public_url:
        required.append("public_url")
    missing = [key for key in required if not values[key]]
    if missing:
        raise ValueError(
            "Missing publishing configuration: {0}".format(", ".join(missing))
        )
    return values


def publish_plan(
    plan,
    dotenv_path,
    force=False,
):
    """Apply a validated upload plan. There is intentionally no delete path."""

    config = _load_upload_environment(dotenv_path, require_public_url=False)
    s3 = boto3.client(
        "s3",
        aws_access_key_id=config["access_key"],
        aws_secret_access_key=config["secret_key"],
        endpoint_url=config["endpoint"],
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )
    for item in plan:
        if not force:
            try:
                existing = s3.head_object(Bucket=config["bucket"], Key=item["key"])
                remote_sha256 = existing.get("Metadata", {}).get("sha256")
                if remote_sha256 == item["sha256"]:
                    logging.info("Unchanged, skipping %s", item["key"])
                    continue
                raise RuntimeError(
                    "Remote object differs: {0}. Use --force to replace it.".format(
                        item["key"]
                    )
                )
            except s3.exceptions.ClientError as exc:
                status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
                if status != 404:
                    raise
        extra_args = {
            "ContentType": item["content_type"],
            "Metadata": {"sha256": item["sha256"]},
        }
        if item["path"].suffix in {".csv", ".gz", ".fasta"}:
            extra_args["ContentDisposition"] = "attachment"
        s3.upload_file(
            str(item["path"]),
            config["bucket"],
            item["key"],
            ExtraArgs=extra_args,
        )
        logging.info("Uploaded %s", item["key"])


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(
        description=(
            "Validate a GenomePuzzle public package and optionally publish it "
            "to a release-scoped R2 prefix."
        )
    )
    parser.add_argument("--release-dir", required=True)
    parser.add_argument("--public-url", help="Override PUBLIC_URL for the dry run")
    parser.add_argument("--dotenv", default=".r3_config.env")
    parser.add_argument(
        "--private-dotenv",
        help=(
            "Credentials for the private assessment R2 bucket. Required with "
            "--apply; must not point at the public practice bucket."
        ),
    )
    parser.add_argument(
        "--website-manifest",
        help="Write the URL-enriched public manifest after validation/publication",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Perform uploads. Without this flag the command is a dry run.",
    )
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    validated = load_and_validate_release(args.release_dir)
    public_url = args.public_url or os.getenv("PUBLIC_URL")
    if args.apply and not public_url:
        config = _load_upload_environment(args.dotenv)
        public_url = config["public_url"]
    if not public_url:
        public_url = "https://example.invalid"
    plan = build_upload_plan(validated, public_url)
    private_plan = build_private_upload_plan(validated)

    for item in plan + private_plan:
        logging.info(
            "%s %s%s (%d bytes, sha256=%s)",
            "UPLOAD" if args.apply else "DRY-RUN",
            "PRIVATE " if item in private_plan else "",
            item["key"],
            item["size"],
            item["sha256"],
        )
    if args.apply:
        if not args.private_dotenv:
            parser.error("--private-dotenv is required with --apply")
        publish_plan(plan, args.dotenv, force=args.force)
        publish_plan(private_plan, args.private_dotenv, force=args.force)

    if args.website_manifest:
        output_path = Path(args.website_manifest)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as handle:
            json.dump(plan[-1]["published_manifest"], handle, indent=2, sort_keys=True)
            handle.write("\n")
        logging.info("Wrote website manifest to %s", output_path)


if __name__ == "__main__":
    main()
