"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";

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
    <Card className="fixed bottom-6 right-6 z-50 max-w-sm border border-emerald-500/30 bg-ink-900/95 py-4 shadow-xl">
      <p className="text-sm font-medium text-emerald-300">{message}</p>
    </Card>
  );
}
