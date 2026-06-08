import { Badge } from "@/components/ui/Badge";
import { assetSubtypeLabel, pegMechanismLabel } from "@/lib/classification";
import type { AssetSubtype, PegMechanism } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Renders the fine-grained economic classification (playbook §1.3) as compact
 * chips: an asset-subtype chip plus, where meaningful, a peg-mechanism chip.
 * Returns null when nothing is classified so it can be dropped anywhere safely.
 */
export function ClassificationChips({
  assetSubtype,
  pegMechanism,
  size = "sm",
  className,
}: {
  assetSubtype?: AssetSubtype | null;
  pegMechanism?: PegMechanism | null;
  size?: "sm" | "xs";
  className?: string;
}) {
  const subtype = assetSubtypeLabel(assetSubtype);
  // "none" pegs (governance / commodity / equity) carry no peg signal — hide.
  const peg = pegMechanism && pegMechanism !== "none" ? pegMechanismLabel(pegMechanism) : null;

  if (!subtype && !peg) return null;

  const sizeClass = size === "xs" ? "text-[10px]" : undefined;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {subtype && (
        <Badge tone="electric" className={sizeClass}>
          {subtype}
        </Badge>
      )}
      {peg && (
        <Badge tone="signal" className={sizeClass} title="Peg / backing mechanism">
          {peg}
        </Badge>
      )}
    </div>
  );
}
