import type { DataSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCE_COLOR: Record<DataSource, string> = {
  live: "bg-emerald-400",
  demo: "bg-amber-400",
  derived: "bg-ink-400",
};

const SOURCE_LABEL: Record<DataSource, string> = {
  live: "Live",
  demo: "Demo",
  derived: "Derived",
};

interface DataSourceDotProps {
  dataSource: DataSource;
  sourceLabel?: string;
  className?: string;
}

export function DataSourceDot({ dataSource, sourceLabel, className }: DataSourceDotProps) {
  const tooltip = sourceLabel ?? SOURCE_LABEL[dataSource];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1", className)}
      title={tooltip}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", SOURCE_COLOR[dataSource])}
        aria-hidden
      />
      <span className="sr-only">{tooltip}</span>
    </span>
  );
}
