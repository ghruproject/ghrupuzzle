import unittest
import hashlib
import json
import tempfile
from pathlib import Path

from scripts.publish_release import (
    build_private_upload_plan,
    build_upload_plan,
    load_and_validate_release,
)
from scripts.update_dataset import (
    delete_files_not_in_list,
    private_answer_summary,
)


class LegacyPublisherSafetyTests(unittest.TestCase):
    def test_public_answer_summary_contains_no_file_location(self):
        summary = private_answer_summary(
            [
                {
                    "public_name": "Sample_1",
                    "species": "Klebsiella pneumoniae",
                    "st": "ST42",
                },
                {
                    "public_name": "Sample_2",
                    "SPECIES": "Acinetobacter baumannii",
                    "error": "CONTAMINATED",
                },
            ]
        )

        self.assertEqual(
            summary,
            {
                "species": [
                    "Acinetobacter baumannii",
                    "Klebsiella pneumoniae",
                ]
            },
        )
        self.assertNotIn("filename", summary)
        self.assertNotIn("url", summary)

    def test_legacy_bucket_cleanup_is_disabled(self):
        with self.assertRaisesRegex(RuntimeError, "cleanup is disabled"):
            delete_files_not_in_list(["keep-me"])


class ManifestPublisherTests(unittest.TestCase):
    def make_release(self, root):
        release = Path(root)
        files = release / "public" / "files"
        files.mkdir(parents=True)
        fasta = files / "Sample_abc123.fasta"
        fasta.write_text(">contig\nACGT\n", encoding="utf-8")
        digest = hashlib.sha256(fasta.read_bytes()).hexdigest()
        manifest = {
            "schema_version": "1.0",
            "release_id": "2026-round-1-typing-practice",
            "exercise": "typing",
            "mode": "practice",
            "samples": [
                {
                    "sample_id": "Sample_abc123",
                    "files": {
                        "assembly": {
                            "filename": fasta.name,
                            "sha256": digest,
                            "size": fasta.stat().st_size,
                        }
                    },
                    "metadata": {},
                }
            ],
        }
        (release / "public" / "dataset_manifest.json").write_text(
            json.dumps(manifest), encoding="utf-8"
        )
        private = release / "private"
        private.mkdir()
        for name in ("answer_key.json", "provenance.json", "implant_manifest.json"):
            (private / name).write_text("{}", encoding="utf-8")
        return release

    def test_manifest_publisher_uses_release_prefix_and_manifest_last(self):
        with tempfile.TemporaryDirectory() as directory:
            release = self.make_release(directory)
            validated = load_and_validate_release(release)
            plan = build_upload_plan(validated, "https://data.example")

        self.assertEqual(
            plan[0]["key"],
            (
                "releases/2026-round-1-typing-practice/"
                "typing/practice/files/Sample_abc123.fasta"
            ),
        )
        self.assertTrue(plan[-1]["key"].endswith("/dataset_manifest.json"))
        published = plan[-1]["published_manifest"]
        self.assertEqual(
            published["samples"][0]["files"]["assembly"]["url"],
            (
                "https://data.example/releases/2026-round-1-typing-practice/"
                "typing/practice/files/Sample_abc123.fasta"
            ),
        )

    def test_manifest_publisher_rejects_private_truth(self):
        with tempfile.TemporaryDirectory() as directory:
            release = self.make_release(directory)
            manifest_path = release / "public" / "dataset_manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["samples"][0]["expected_answers"] = {"st": "ST42"}
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "private field"):
                load_and_validate_release(release)

    def test_manifest_publisher_rejects_checksum_mismatch(self):
        with tempfile.TemporaryDirectory() as directory:
            release = self.make_release(directory)
            fasta = release / "public" / "files" / "Sample_abc123.fasta"
            fasta.write_text(">contig\nTGCA\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                load_and_validate_release(release)

    def test_private_truth_uses_private_prefix(self):
        with tempfile.TemporaryDirectory() as directory:
            release = self.make_release(directory)
            validated = load_and_validate_release(release)
            plan = build_private_upload_plan(validated)
        self.assertEqual(len(plan), 3)
        self.assertTrue(
            all("/typing/practice/private/" in item["key"] for item in plan)
        )


if __name__ == "__main__":
    unittest.main()
