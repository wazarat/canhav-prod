"""
boto3 / DynamoDB implementation of :class:`Repository`.

DEFERRED (Step 4): this is wired up and correct, but not exercised yet — the
project runs on the ``LocalAdapter`` until real DynamoDB is provisioned. boto3 is
imported lazily so the rest of the backend (and the ingestion script) runs with
zero third-party dependencies installed.

Configure via env:
    AWS_REGION             (default: us-east-1)
    DYNAMODB_TABLE         (default: schema.TABLE_NAME)
    DYNAMODB_ENDPOINT_URL  (optional; set to http://localhost:8000 for DynamoDB Local)
plus the usual AWS credential env vars / profile.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import List, Optional

from .adapter import Item, Repository
from . import schema


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


class DynamoAdapter(Repository):
    def __init__(
        self,
        table_name: Optional[str] = None,
        region: Optional[str] = None,
        endpoint_url: Optional[str] = None,
    ) -> None:
        # Lazy import: only required when this adapter is actually instantiated.
        try:
            import boto3  # type: ignore
        except ImportError as exc:  # pragma: no cover - depends on env
            raise RuntimeError(
                "boto3 is required for the DynamoDB backend. "
                "Install it with `pip install -r backend/requirements.txt`."
            ) from exc

        self.table_name = table_name or os.environ.get("DYNAMODB_TABLE", schema.TABLE_NAME)
        resource = boto3.resource(
            "dynamodb",
            region_name=region or os.environ.get("AWS_REGION", "us-east-1"),
            endpoint_url=endpoint_url or os.environ.get("DYNAMODB_ENDPOINT_URL") or None,
        )
        self.table = resource.Table(self.table_name)

    def put_item(self, item: Item) -> None:
        if not item.get(schema.PK) or not item.get(schema.SK):
            raise ValueError("Item must include both 'PK' and 'SK'.")
        self.table.put_item(Item=item)

    def get_item(self, pk: str, sk: str) -> Optional[Item]:
        resp = self.table.get_item(Key={schema.PK: pk, schema.SK: sk})
        return resp.get("Item")

    def query(self, pk: str, status: Optional[str] = None) -> List[Item]:
        from boto3.dynamodb.conditions import Attr, Key  # type: ignore

        kwargs = {"KeyConditionExpression": Key(schema.PK).eq(pk)}
        if status is not None:
            kwargs["FilterExpression"] = Attr("Status").eq(status)

        items: List[Item] = []
        resp = self.table.query(**kwargs)
        items.extend(resp.get("Items", []))
        while "LastEvaluatedKey" in resp:
            kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
            resp = self.table.query(**kwargs)
            items.extend(resp.get("Items", []))
        return items

    def update_status(self, pk: str, sk: str, status: str) -> Optional[Item]:
        if not schema.is_valid_status(status):
            raise ValueError(f"Invalid status: {status!r}")
        resp = self.table.update_item(
            Key={schema.PK: pk, schema.SK: sk},
            UpdateExpression="SET #s = :status, UpdatedAt = :ts",
            ExpressionAttributeNames={"#s": "Status"},
            ExpressionAttributeValues={":status": status, ":ts": _now_iso()},
            ConditionExpression="attribute_exists(SK)",
            ReturnValues="ALL_NEW",
        )
        return resp.get("Attributes")

    def all(self) -> List[Item]:
        items: List[Item] = []
        resp = self.table.scan()
        items.extend(resp.get("Items", []))
        while "LastEvaluatedKey" in resp:
            resp = self.table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
            items.extend(resp.get("Items", []))
        return items
