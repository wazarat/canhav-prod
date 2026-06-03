"""
Storage abstraction.

Every read/write goes through this ``Repository`` interface so the rest of the
codebase never cares whether it's talking to a local JSON file (dev) or real
DynamoDB (prod). Swapping backends is a one-line change in ``get_repository``.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

# A single-table item is just a dict of attributes (incl. "PK" and "SK").
Item = Dict[str, Any]


class Repository(ABC):
    """Minimal single-table access pattern shared by all adapters."""

    @abstractmethod
    def put_item(self, item: Item) -> None:
        """Insert or overwrite an item (keyed by its PK + SK)."""

    @abstractmethod
    def get_item(self, pk: str, sk: str) -> Optional[Item]:
        """Fetch a single item, or ``None`` if it doesn't exist."""

    @abstractmethod
    def delete_item(self, pk: str, sk: str) -> bool:
        """Delete an item; returns ``True`` if it existed, ``False`` otherwise."""

    @abstractmethod
    def query(self, pk: str, status: Optional[str] = None) -> List[Item]:
        """Return all items in a partition, optionally filtered by ``Status``."""

    @abstractmethod
    def update_status(self, pk: str, sk: str, status: str) -> Optional[Item]:
        """Flip an item's approval ``Status``; returns the updated item or None."""

    @abstractmethod
    def all(self) -> List[Item]:
        """Return every item in the table (used by staging / admin views)."""
