"use client";

import { useCallback, useEffect, useState } from "react";

import { positionFromQuote } from "./engine";
import { JLP_MARKET } from "./jlpMarket";
import { markPriceAt } from "./priceFeed";
import type { ActivityItem, Position, Quote, SmartAccount } from "./types";

const POS_KEY = "canhav.jlp.position.v1";
const LOG_KEY = "canhav.jlp.activity.v1";
const ACC_KEY = "canhav.jlp.account.v1";

function load<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(k: string, v: T) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota / private mode */
  }
}

function fakeTx(): string {
  const hex = "0123456789abcdef";
  return (
    "0x" +
    Array.from({ length: 64 }, () => hex[Math.floor(Math.random() * 16)]).join("")
  );
}

export function usePosition() {
  const [account, setAccount] = useState<SmartAccount | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [mark, setMark] = useState<number>(() => JLP_MARKET.priceUsd);

  useEffect(() => {
    setAccount(load(ACC_KEY, null));
    setPosition(load(POS_KEY, null));
    setActivity(load(LOG_KEY, []));
    setMark(markPriceAt(Date.now()));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setMark(markPriceAt(Date.now())), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    save(POS_KEY, position);
  }, [position]);

  useEffect(() => {
    save(LOG_KEY, activity);
  }, [activity]);

  useEffect(() => {
    save(ACC_KEY, account);
  }, [account]);

  const connect = useCallback(() => {
    const addr =
      "0x" +
      Array.from({ length: 40 }, () =>
        "0123456789abcdef"[Math.floor(Math.random() * 16)],
      ).join("");
    setAccount({ address: addr, connected: true, gasSponsored: true, chainId: 421614 });
  }, []);

  const disconnect = useCallback(() => setAccount(null), []);

  const open = useCallback((q: Quote) => {
    const pos = positionFromQuote(q);
    setPosition((prev) => {
      if (!prev) return pos;
      const totalSize = prev.jlpSize + pos.jlpSize;
      const entry =
        (prev.entryPrice * prev.jlpSize + pos.entryPrice * pos.jlpSize) / totalSize;
      return {
        ...prev,
        jlpSize: +totalSize.toFixed(4),
        entryPrice: +entry.toFixed(4),
        notionalUsd: +(totalSize * entry).toFixed(2),
        collateralUsd: +(prev.collateralUsd + pos.collateralUsd).toFixed(2),
      };
    });
    setActivity((a) =>
      [
        {
          id: pos.id,
          kind: "buy" as const,
          jlp: q.jlpOut,
          priceUsd: q.entryPrice,
          valueUsd: +(q.jlpOut * q.entryPrice).toFixed(2),
          feeUsd: q.feeUsd,
          txHash: fakeTx(),
          at: new Date().toISOString(),
        },
        ...a,
      ].slice(0, 25),
    );
  }, []);

  const close = useCallback((markPrice: number) => {
    setPosition((prev) => {
      if (!prev) return null;
      setActivity((a) =>
        [
          {
            id: crypto.randomUUID(),
            kind: "close" as const,
            jlp: prev.jlpSize,
            priceUsd: markPrice,
            valueUsd: +(prev.jlpSize * markPrice).toFixed(2),
            feeUsd: 0,
            txHash: fakeTx(),
            at: new Date().toISOString(),
          },
          ...a,
        ].slice(0, 25),
      );
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    setPosition(null);
    setActivity([]);
  }, []);

  return { account, connect, disconnect, position, mark, open, close, activity, reset };
}
