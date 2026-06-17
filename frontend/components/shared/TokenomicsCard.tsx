import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import type { Tokenomics } from "@/lib/types";
import { formatNumberCompact } from "@/lib/utils";

interface TokenomicsCardProps {
  tokenomics: Tokenomics;
  title?: string;
  id?: string;
  embedded?: boolean;
}

export function TokenomicsCard({
  tokenomics,
  title = "Tokenomics",
  id = "tokenomics",
  embedded = false,
}: TokenomicsCardProps) {
  const inner = (
    <Card className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <CardDescription>Max supply</CardDescription>
          <CardTitle className="mt-1 text-base">
            {tokenomics.maxSupply != null
              ? formatNumberCompact(tokenomics.maxSupply)
              : "Uncapped"}
          </CardTitle>
        </div>
        {tokenomics.totalBurned != null && (
          <div>
            <CardDescription>Total burned</CardDescription>
            <CardTitle className="mt-1 text-base">
              {formatNumberCompact(tokenomics.totalBurned)}
            </CardTitle>
          </div>
        )}
      </div>

      {tokenomics.buybackPolicy && (
        <div>
          <CardDescription>Buyback policy</CardDescription>
          <p className="mt-1 text-sm leading-relaxed text-ink-200">
            {tokenomics.buybackPolicy}
          </p>
        </div>
      )}

      {tokenomics.emissionsPolicy && (
        <div>
          <CardDescription>Emissions policy</CardDescription>
          <p className="mt-1 text-sm leading-relaxed text-ink-200">
            {tokenomics.emissionsPolicy}
          </p>
        </div>
      )}

      {tokenomics.distribution && tokenomics.distribution.length > 0 && (
        <div className="space-y-2">
          <CardDescription>Distribution</CardDescription>
          <div className="space-y-2">
            {tokenomics.distribution.map((d) => (
              <div key={d.bucket} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-200">{d.bucket}</span>
                  <span className="font-medium text-ink-100">{d.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full bg-electric-500"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tokenomics.notes && tokenomics.notes.length > 0 && (
        <ul className="list-inside list-disc space-y-1 text-sm text-ink-300">
          {tokenomics.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </Card>
  );

  if (embedded) {
    return inner;
  }

  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          {title}
        </h2>
      </div>
      {inner}
    </section>
  );
}
