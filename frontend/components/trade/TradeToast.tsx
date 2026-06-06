"use client";

import { useEffect, useState } from "react";

import { tradePanel } from "@/components/trade/tradeStyles";

interface TradeToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function TradeToast({ message, onDismiss }: TradeToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const id = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 3000);
    return () => clearTimeout(id);
  }, [message, onDismiss]);

  if (!message || !visible) return null;

  return (
    <div
      className={`${tradePanel} fixed bottom-6 right-6 z-50 max-w-sm border-[#0ECB81]/30 px-4 py-3 shadow-2xl`}
    >
      <p className="text-sm font-medium text-[#0ECB81]">{message}</p>
    </div>
  );
}
