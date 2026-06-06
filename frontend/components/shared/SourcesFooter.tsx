import { ArrowUpRight } from "lucide-react";

import { Card, CardTitle } from "@/components/ui/Card";
import type { SourceRef } from "@/lib/types";

export function SourcesFooter({ sources }: { sources: SourceRef[] }) {
  if (!sources.length) return null;
  return (
    <Card className="space-y-3">
      <CardTitle className="text-sm">Data sources</CardTitle>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {sources.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-electric-400 hover:underline"
            >
              {s.label}
              <ArrowUpRight className="h-3 w-3 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
