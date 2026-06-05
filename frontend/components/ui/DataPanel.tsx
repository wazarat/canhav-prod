import * as React from "react";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface DataPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  badge?: string;
}

export function DataPanel({ title, badge, className, children, ...props }: DataPanelProps) {
  return (
    <Card className={cn("space-y-1 divide-y divide-ink-800/60", className)} {...props}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {badge && <Badge tone="neutral">{badge}</Badge>}
      </div>
      <div className="pt-1">{children}</div>
    </Card>
  );
}

interface DataRowProps {
  label: string;
  value: React.ReactNode;
  source?: string;
  className?: string;
}

export function DataRow({ label, value, source, className }: DataRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2", className)}>
      <span className="text-sm text-ink-300">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className="text-sm font-medium text-ink-100">{value}</span>
        {source && (
          <Badge tone="neutral" className="text-[10px]">
            {source}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function LinkRow({ label, href }: { label: string; href: string | null }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-200 transition-colors hover:bg-ink-800/50 hover:text-ink-50"
    >
      <span>{label}</span>
      <ArrowUpRight className="h-3.5 w-3.5 text-ink-300" />
    </a>
  );
}
