import { Badge } from "@/components/ui/Badge";
import type { ReceiptType } from "@/lib/types";

const RECEIPT_TYPE_LABELS: Record<ReceiptType, string> = {
  LiquidStaking: "LST",
  LiquidRestaking: "LRT",
  LendingReceipt: "Lending Receipt",
  YieldVault: "Yield Vault",
  StakedStablecoin: "Staked Stable",
  FixedIncomeTranche: "Fixed Income",
  TokenizedRWA: "Tokenized RWA",
  LockedEscrowReceipt: "Locked Receipt",
};

export function ReceiptTypeBadge({ receiptType }: { receiptType: ReceiptType | null | undefined }) {
  if (!receiptType) return null;
  return (
    <Badge tone="signal" className="text-[10px]">
      {RECEIPT_TYPE_LABELS[receiptType]}
    </Badge>
  );
}
