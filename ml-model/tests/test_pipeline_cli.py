"""Tests for run_pipeline.py CLI behavior and exit codes."""

import subprocess
import sys
from pathlib import Path

PYTHON_EXE = sys.executable
SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "run_pipeline.py"
CONFIG_PATH = Path(__file__).resolve().parents[1] / "config.yaml"


def test_cli_default_config_exits_with_code_2() -> None:
    res = subprocess.run(
        [PYTHON_EXE, str(SCRIPT_PATH), "--config", str(CONFIG_PATH)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 2
    assert "prerequisites are missing" in res.stderr
    assert "area_of_interest.locality" in res.stderr
    assert "paths.dem" in res.stderr


def test_cli_export_flag_exits_with_code_0() -> None:
    res = subprocess.run(
        [PYTHON_EXE, str(SCRIPT_PATH), "--config", str(CONFIG_PATH), "--export"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0
    assert "Export completed successfully" in res.stderr


def test_cli_synthetic_demo_flag_exits_with_code_0() -> None:
    res = subprocess.run(
        [
            PYTHON_EXE,
            str(SCRIPT_PATH),
            "--config",
            str(CONFIG_PATH),
            "--synthetic-demo",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0
    assert "Running synthetic demo benchmark" in res.stderr


def test_cli_nonexistent_config_exits_with_code_2() -> None:
    res = subprocess.run(
        [
            PYTHON_EXE,
            str(SCRIPT_PATH),
            "--config",
            "nonexistent_config_path.yaml",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 2
    assert "Could not load configuration" in res.stderr
