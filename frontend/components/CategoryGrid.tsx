import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  CandlestickChart,
  CircleDollarSign,
  Coins,
  Landmark,
  LineChart,
  Layers,
  Network,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { CategoryDef, CategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<CategorySlug, LucideIcon> = {
  networks: Network,
  stablecoins: Coins,
  rwas: Landmark,
  tokens: CircleDollarSign,
  lending: Banknote,
  perpetuals: CandlestickChart,
  yield: Sparkles,
  dex: Layers,
  options: LineChart,
};

function CategoryCard({ category }: { category: CategoryDef }) {
  const Icon = ICONS[category.slug];
  const isActive = category.status === "active";

  const inner = (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-4 rounded-2xl border p-5 transition-all duration-200",
        isActive
          ? "glass border-ink-700/60 hover:border-electric-500/50 hover:glow-ring"
          : "border-ink-800/50 bg-ink-900/30",
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid h-11 w-11 place-items-center rounded-xl border",
            isActive
              ? "border-electric-500/30 bg-electric-500/10 text-electric-400"
              : "border-ink-800 bg-ink-900/60 text-ink-300",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        {isActive ? (
          <Badge tone="signal">{category.trackedCount ?? 0} tracked</Badge>
        ) : (
          <Badge tone="neutral">Coming soon</Badge>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            {category.label}
          </h3>
          {isActive && (
            <ArrowUpRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-electric-400" />
          )}
        </div>
        <p className="text-sm text-ink-300">{category.description}</p>
      </div>
    </div>
  );

  if (!isActive) {
    return (
      <div aria-disabled className="cursor-not-allowed opacity-60">
        {inner}
      </div>
    );
  }

  return (
    <Link href={`/${category.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}

export function CategoryGrid({ categories }: { categories: CategoryDef[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <CategoryCard key={c.slug} category={c} />
      ))}
    </div>
  );
}
