"""Wrapper so `uv run python -m scripts.seed_phase10_demo` matches Phase 06."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.scripts.seed_phase10_demo import main

if __name__ == "__main__":
    main()
