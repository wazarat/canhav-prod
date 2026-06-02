"""
Tiny, dependency-free ``.env`` loader.

The live overlays (Alchemy / Dune / CoinGecko) and the approval token need
secrets from ``backend/.env``. Rather than pull in ``python-dotenv``, this parses
the file with the standard library so the scripts stay install-free, consistent
with the ingestion scripts and the LocalAdapter.

Usage:
    from app.config import load_env, get_env
    load_env()                       # populates os.environ from backend/.env
    key = get_env("ALCHEMY_API_KEY") # -> value or None
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

# backend/app/config.py -> parents[1] == backend/
BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_PATH = BACKEND_ROOT / ".env"


def load_env(path: Optional[os.PathLike | str] = None, *, override: bool = False) -> dict:
    """
    Parse a ``.env`` file into ``os.environ`` and return the parsed mapping.

    - Lines that are blank or start with ``#`` are ignored.
    - ``export FOO=bar`` and ``FOO=bar`` are both accepted.
    - Surrounding single/double quotes on the value are stripped.
    - Existing environment variables are preserved unless ``override=True``.

    Missing file is not an error (returns ``{}``) — callers decide whether a
    given key is required.
    """
    env_path = Path(path) if path is not None else DEFAULT_ENV_PATH
    parsed: dict[str, str] = {}
    if not env_path.exists():
        return parsed

    with env_path.open("r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[len("export ") :].lstrip()
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]
            if not key:
                continue
            parsed[key] = value
            if override or key not in os.environ:
                os.environ[key] = value
    return parsed


def get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    """Return an env var, treating empty strings as unset."""
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    return value
