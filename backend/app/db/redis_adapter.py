"""
Redis implementation of :class:`Repository` (Upstash-friendly).

The entire single-table store lives in ONE Redis hash (default key
``canhav:store``): field = ``"<PK>|<SK>"``, value = the JSON-encoded item. This
mirrors :class:`LocalAdapter` exactly (same ``_key`` scheme), so promoting from
the local JSON file to Redis changes nothing for callers.

Works against any Redis, but is intended for Upstash Redis (set ``REDIS_URL`` to
the Upstash ``rediss://`` connection string). boto3/DynamoDB are gone.

``redis`` (redis-py) is imported lazily so the rest of the backend and the
stdlib-only ingestion scripts keep running with zero installs when
``DB_BACKEND`` is not ``redis``.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

from .adapter import Item, Repository
from . import schema

DEFAULT_STORE_KEY = "canhav:store"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _key(pk: str, sk: str) -> str:
    return f"{pk}|{sk}"


class RedisAdapter(Repository):
    def __init__(self, url: Optional[str] = None, store_key: Optional[str] = None) -> None:
        # Lazy import: only needed when this adapter is actually instantiated.
        try:
            import redis  # type: ignore
        except ImportError as exc:  # pragma: no cover - depends on env
            raise RuntimeError(
                "redis is required for the Redis backend. "
                "Install it with `pip install -r backend/requirements.txt`."
            ) from exc

        conn_url = url or os.environ.get("REDIS_URL")
        if not conn_url:
            raise RuntimeError(
                "REDIS_URL is not set. Point it at your Upstash 'rediss://' URL "
                "(see backend/.env.example)."
            )
        self.store_key = store_key or os.environ.get("REDIS_STORE_KEY", DEFAULT_STORE_KEY)
        # decode_responses so we get str (not bytes) back from the hash.
        self.client = redis.from_url(conn_url, decode_responses=True)

    # --- internal helpers --------------------------------------------------
    def _load(self) -> Dict[str, Item]:
        raw = self.client.hgetall(self.store_key) or {}
        out: Dict[str, Item] = {}
        for field, value in raw.items():
            try:
                out[field] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                continue
        return out

    # --- Repository API ----------------------------------------------------
    def put_item(self, item: Item) -> None:
        pk, sk = item.get(schema.PK), item.get(schema.SK)
        if not pk or not sk:
            raise ValueError("Item must include both 'PK' and 'SK'.")
        self.client.hset(self.store_key, _key(pk, sk), json.dumps(item, ensure_ascii=False))

    def get_item(self, pk: str, sk: str) -> Optional[Item]:
        raw = self.client.hget(self.store_key, _key(pk, sk))
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return None

    def query(self, pk: str, status: Optional[str] = None) -> List[Item]:
        results = [it for it in self._load().values() if it.get(schema.PK) == pk]
        if status is not None:
            results = [it for it in results if it.get("Status") == status]
        return sorted(results, key=lambda it: it.get("Name", it.get(schema.SK, "")))

    def update_status(self, pk: str, sk: str, status: str) -> Optional[Item]:
        if not schema.is_valid_status(status):
            raise ValueError(f"Invalid status: {status!r}")
        item = self.get_item(pk, sk)
        if item is None:
            return None
        item["Status"] = status
        item["UpdatedAt"] = _now_iso()
        self.put_item(item)
        return item

    def all(self) -> List[Item]:
        return sorted(
            self._load().values(),
            key=lambda it: (it.get(schema.PK, ""), it.get("Name", it.get(schema.SK, ""))),
        )
