"""
Local, file-backed implementation of :class:`Repository`.

Stores DynamoDB-shaped items in a single JSON file (``backend/data/store.json``)
keyed by ``"<PK>|<SK>"``. Zero external dependencies, zero cloud — but the item
shape is identical to what the DynamoDB adapter produces, so promoting to real
DynamoDB later changes nothing for callers.
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from .adapter import Item, Repository
from . import schema


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _key(pk: str, sk: str) -> str:
    return f"{pk}|{sk}"


class LocalAdapter(Repository):
    def __init__(self, path: os.PathLike | str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    # --- internal helpers --------------------------------------------------
    def _load(self) -> Dict[str, Item]:
        if not self.path.exists():
            return {}
        try:
            with self.path.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
        except (json.JSONDecodeError, OSError):
            return {}
        return data.get("items", {}) if isinstance(data, dict) else {}

    def _save(self, items: Dict[str, Item]) -> None:
        payload = {
            "_meta": {
                "table": schema.TABLE_NAME,
                "backend": "local",
                "updatedAt": _now_iso(),
                "count": len(items),
            },
            "items": items,
        }
        # Atomic write: tmp file in the same dir, then replace.
        fd, tmp = tempfile.mkstemp(dir=str(self.path.parent), suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, indent=2, ensure_ascii=False, sort_keys=True)
            os.replace(tmp, self.path)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)

    # --- Repository API ----------------------------------------------------
    def put_item(self, item: Item) -> None:
        pk, sk = item.get(schema.PK), item.get(schema.SK)
        if not pk or not sk:
            raise ValueError("Item must include both 'PK' and 'SK'.")
        items = self._load()
        items[_key(pk, sk)] = item
        self._save(items)

    def get_item(self, pk: str, sk: str) -> Optional[Item]:
        return self._load().get(_key(pk, sk))

    def delete_item(self, pk: str, sk: str) -> bool:
        items = self._load()
        if _key(pk, sk) not in items:
            return False
        del items[_key(pk, sk)]
        self._save(items)
        return True

    def query(self, pk: str, status: Optional[str] = None) -> List[Item]:
        results = [it for it in self._load().values() if it.get(schema.PK) == pk]
        if status is not None:
            results = [it for it in results if it.get("Status") == status]
        return sorted(results, key=lambda it: it.get("Name", it.get(schema.SK, "")))

    def update_status(self, pk: str, sk: str, status: str) -> Optional[Item]:
        if not schema.is_valid_status(status):
            raise ValueError(f"Invalid status: {status!r}")
        items = self._load()
        item = items.get(_key(pk, sk))
        if item is None:
            return None
        item["Status"] = status
        item["UpdatedAt"] = _now_iso()
        items[_key(pk, sk)] = item
        self._save(items)
        return item

    def all(self) -> List[Item]:
        return sorted(
            self._load().values(),
            key=lambda it: (it.get(schema.PK, ""), it.get("Name", it.get(schema.SK, ""))),
        )
