import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  badges,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-500" />}
            {crumb.href ? (
              <Link href={crumb.href} className="transition-colors hover:text-ink-50">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-ink-100">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
              {title}
            </h1>
            {badges}
          </div>
          {description && (
            <div className="max-w-3xl text-sm leading-relaxed text-ink-300">{description}</div>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
    </div>
  );
}
