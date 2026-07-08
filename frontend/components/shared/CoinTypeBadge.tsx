import { Badge } from "@/components/ui/Badge";
import type { CoinType } from "@/lib/types";

const COIN_TYPE_LABELS: Record<CoinType, string> = {
  Governance: "Governance",
  GovernanceUtility: "Gov + Utility",
  NativeStablecoin: "Native Stable",
  SyntheticDollar: "Synthetic $",
  LockedEscrow: "Locked / Escrow",
  Native: "Native Asset",
  NoToken: "No Token",
};

export function CoinTypeBadge({ coinType }: { coinType: CoinType | null | undefined }) {
  if (!coinType || coinType === "NoToken") {
    return (
      <Badge tone="neutral" className="text-[10px]">
        No native token
      </Badge>
    );
  }
  return (
    <Badge tone="electric" className="text-[10px]">
      {COIN_TYPE_LABELS[coinType]}
    </Badge>
  );
}
