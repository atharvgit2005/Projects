"""Evidence packager for verification results."""

from __future__ import annotations

import json
from pathlib import Path

from orchestrator.core.models import VerificationResult


class EvidencePackager:
    """Saves and packages verification evidence for inspection and review."""

    @staticmethod
    def package(result: VerificationResult, output_dir: str | Path) -> Path:
        out_path = Path(output_dir).resolve()
        out_path.mkdir(parents=True, exist_ok=True)

        # 1. Save JSON result
        with open(out_path / "result.json", "w", encoding="utf-8") as f:
            json.dump(result.model_dump(mode="json"), f, indent=2)

        # 2. Save individual check logs
        for check in result.checks:
            safe_name = check.name.replace(" ", "_").lower()
            with open(out_path / f"{safe_name}.log", "w", encoding="utf-8") as f:
                f.write(f"CHECK: {check.name}\n")
                f.write(f"COMMAND: {check.command}\n")
                f.write(f"STATUS: {check.status}\n")
                f.write(f"EXIT CODE: {check.exit_code}\n")
                f.write(f"DURATION: {check.duration_ms}ms\n\n")
                f.write("=== STDOUT ===\n")
                f.write(check.stdout or "(empty)")
                f.write("\n\n=== STDERR ===\n")
                f.write(check.stderr or "(empty)")

        return out_path
