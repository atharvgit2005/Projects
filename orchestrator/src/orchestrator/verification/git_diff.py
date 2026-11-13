"""Git diff extraction and worktree status inspector."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
from typing import Dict, List, Tuple


class GitInspector:
    """Extracts git status, diffs, and patch evidence from target workspace."""

    def __init__(self, workspace_dir: str | Path):
        self.workspace_dir = Path(workspace_dir).resolve()

    def is_git_repo(self) -> bool:
        git_dir = self.workspace_dir / ".git"
        return git_dir.exists()

    def get_status(self) -> Tuple[List[str], List[str]]:
        """Returns (modified_or_staged_files, untracked_files)."""
        if not self.is_git_repo():
            return [], []

        try:
            res = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=str(self.workspace_dir),
                capture_output=True,
                text=True,
                check=False,
            )
            modified = []
            untracked = []
            for line in res.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                code = line[:2]
                path = line[3:]
                if code == "??":
                    untracked.append(path)
                else:
                    modified.append(path)
            return modified, untracked
        except Exception:
            return [], []

    def get_diff(self) -> str:
        """Generates unified diff including tracked changes and untracked files."""
        if not self.is_git_repo():
            return ""

        diff_parts: List[str] = []

        try:
            # 1. Diff of tracked files (both staged and unstaged)
            res = subprocess.run(
                ["git", "diff", "HEAD"],
                cwd=str(self.workspace_dir),
                capture_output=True,
                text=True,
                check=False,
            )
            if res.stdout.strip():
                diff_parts.append(res.stdout)
            else:
                # If no HEAD commit yet, try plain git diff
                res_unstaged = subprocess.run(
                    ["git", "diff"],
                    cwd=str(self.workspace_dir),
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if res_unstaged.stdout.strip():
                    diff_parts.append(res_unstaged.stdout)

            # 2. For untracked files, create synthetic diff patches
            _, untracked = self.get_status()
            for rel_path in untracked:
                full_path = self.workspace_dir / rel_path
                if full_path.is_file():
                    try:
                        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                            content = f.read()
                        lines = content.splitlines()
                        header = [
                            f"diff --git a/{rel_path} b/{rel_path}",
                            "new file mode 100644",
                            "--- /dev/null",
                            f"+++ b/{rel_path}",
                            f"@@ -0,0 +1,{len(lines)} @@",
                        ]
                        body = [f"+{line}" for line in lines]
                        diff_parts.append("\n".join(header + body))
                    except Exception:
                        pass

        except Exception:
            pass

        return "\n\n".join(diff_parts)
