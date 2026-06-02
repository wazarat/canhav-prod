"""
Database package — exposes the repository factory.

Usage:
    from app.db import get_repository
    repo = get_repository()        # LocalAdapter by default
    repo.put_item(item)

Set ``DB_BACKEND=redis`` (plus ``REDIS_URL``) to switch to Upstash Redis.
"""

from __future__ import annotations

import os
from pathlib import Path

from .adapter import Item, Repository
from . import schema

__all__ = ["get_repository", "default_store_path", "Repository", "Item", "schema"]


def default_store_path() -> Path:
    """`backend/data/store.json`, resolved relative to this file."""
    # app/db/__init__.py -> parents[0]=db, [1]=app, [2]=backend
    backend_root = Path(__file__).resolve().parents[2]
    return backend_root / "data" / "store.json"


def get_repository() -> Repository:
    """Return the configured repository (local file store by default)."""
    backend = os.environ.get("DB_BACKEND", "local").strip().lower()

    if backend == "redis":
        from .redis_adapter import RedisAdapter

        return RedisAdapter()

    if backend not in ("local", ""):
        raise ValueError(
            f"Unknown DB_BACKEND={backend!r}. Use 'local' (default) or 'redis'."
        )

    from .local_adapter import LocalAdapter

    store_path = os.environ.get("STORE_PATH") or default_store_path()
    return LocalAdapter(store_path)
