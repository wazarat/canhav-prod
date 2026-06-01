import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <div className={cn("glass rounded-2xl px-5 py-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wider text-ink-300">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink-50">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
