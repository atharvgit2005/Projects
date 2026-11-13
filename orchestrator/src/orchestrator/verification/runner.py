"""Verification runner executing trusted project commands."""

from __future__ import annotations

import re
import subprocess
import time
from typing import List, Optional

from orchestrator.config import VerificationConfig
from orchestrator.core.models import VerificationCheck, VerificationResult


class VerificationRunner:
    """Executes trusted verification commands and compiles objective evidence."""

    def __init__(self, config: Optional[VerificationConfig] = None):
        self.config = config or VerificationConfig()

    def run_all(self, workspace_dir: str) -> VerificationResult:
        """Executes all configured verification suites."""
        checks: List[VerificationCheck] = []
        overall_passed = True
        failures: List[str] = []
        start_total = time.time()

        # 1. Unit/Integration Tests
        tests_passed = 0
        tests_failed = 0
        if self.config.test_command:
            check = self._run_command("tests", self.config.test_command, workspace_dir)
            checks.append(check)
            if check.status == "FAILED":
                overall_passed = False
                failures.append(f"Test suite failed with exit code {check.exit_code}")
            # Try to parse pytest counts: "X passed, Y failed"
            parsed_p, parsed_f = self._parse_test_counts(check.stdout + "\n" + check.stderr)
            tests_passed += parsed_p
            tests_failed += parsed_f
            if check.status == "PASSED" and tests_passed == 0 and tests_failed == 0:
                tests_passed = 1

        # 2. Build
        build_status = "SKIPPED"
        if self.config.build_command:
            check = self._run_command("build", self.config.build_command, workspace_dir)
            checks.append(check)
            build_status = check.status
            if check.status == "FAILED":
                overall_passed = False
                failures.append(f"Build command failed with exit code {check.exit_code}")

        # 3. Lint
        lint_status = "SKIPPED"
        if self.config.lint_command:
            check = self._run_command("lint", self.config.lint_command, workspace_dir)
            checks.append(check)
            lint_status = check.status
            if check.status == "FAILED":
                overall_passed = False
                failures.append(f"Linter failed with exit code {check.exit_code}")

        # 4. Typecheck
        typecheck_status = "SKIPPED"
        if self.config.typecheck_command:
            check = self._run_command("typecheck", self.config.typecheck_command, workspace_dir)
            checks.append(check)
            typecheck_status = check.status
            if check.status == "FAILED":
                overall_passed = False
                failures.append(f"Typechecker failed with exit code {check.exit_code}")

        # 5. Custom Commands
        for idx, cmd in enumerate(self.config.custom_commands, 1):
            check = self._run_command(f"custom_{idx}", cmd, workspace_dir)
            checks.append(check)
            if check.status == "FAILED":
                overall_passed = False
                failures.append(f"Verification '{check.name}' failed with exit code {check.exit_code}")

        total_duration = (time.time() - start_total) * 1000.0

        return VerificationResult(
            status="PASSED" if overall_passed else "FAILED",
            checks=checks,
            tests={"passed": tests_passed, "failed": tests_failed},
            build=build_status,
            lint=lint_status,
            typecheck=typecheck_status,
            browser="SKIPPED",
            failures=failures,
            duration_ms=round(total_duration, 2),
        )

    def _run_command(self, name: str, command: str, cwd: str) -> VerificationCheck:
        start_time = time.time()
        try:
            res = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=self.config.timeout_seconds,
            )
            duration_ms = (time.time() - start_time) * 1000.0
            status = "PASSED" if res.returncode == 0 else "FAILED"
            return VerificationCheck(
                name=name,
                command=command,
                status=status,
                exit_code=res.returncode,
                stdout=res.stdout,
                stderr=res.stderr,
                duration_ms=round(duration_ms, 2),
            )
        except subprocess.TimeoutExpired as e:
            duration_ms = (time.time() - start_time) * 1000.0
            return VerificationCheck(
                name=name,
                command=command,
                status="FAILED",
                exit_code=-1,
                stdout=e.stdout or "" if isinstance(e.stdout, str) else "",
                stderr=f"Command timed out after {self.config.timeout_seconds}s",
                duration_ms=round(duration_ms, 2),
            )
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000.0
            return VerificationCheck(
                name=name,
                command=command,
                status="FAILED",
                exit_code=-1,
                stdout="",
                stderr=str(e),
                duration_ms=round(duration_ms, 2),
            )

    def _parse_test_counts(self, output: str) -> tuple[int, int]:
        """Heuristic parser for pytest / unittest / jest outputs."""
        passed = 0
        failed = 0

        # Pytest pattern: "X passed, Y failed"
        p_match = re.search(r"(\d+)\s+passed", output)
        if p_match:
            passed = int(p_match.group(1))
        f_match = re.search(r"(\d+)\s+failed", output)
        if f_match:
            failed = int(f_match.group(1))

        # Unittest pattern: "FAILED (failures=1, errors=1)"
        if "FAILED" in output and not f_match:
            err_match = re.search(r"failures=(\d+)", output)
            if err_match:
                failed += int(err_match.group(1))
            err_match2 = re.search(r"errors=(\d+)", output)
            if err_match2:
                failed += int(err_match2.group(1))

        return passed, failed
