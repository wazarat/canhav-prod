import { cn } from "@/lib/utils";

/**
 * Static decorative graphics for the homepage sector showcase, translated from
 * the approved Claude Design landing page. Values are illustrative, not live —
 * only the card meta (counts, sub-sector chips) is real data.
 */

function MeterRow({
  label,
  value,
  width,
  gradient,
  valueClassName,
}: {
  label: string;
  value: string;
  width: string;
  gradient: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[11px] text-ink-200">{label}</span>
        <span className={cn("font-mono text-[11px] tabular-nums text-ink-50", valueClassName)}>
          {value}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
          style={{ width }}
        />
      </div>
    </div>
  );
}

export function CreditGraphic() {
  const g = "from-[#5c92ff] to-[#4FE3F5]";
  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <MeterRow label="USDC market" value="78%" width="78%" gradient={g} />
      <MeterRow label="WETH market" value="54%" width="54%" gradient={g} />
      <MeterRow label="ARB market" value="41%" width="41%" gradient={g} />
    </div>
  );
}

export function StakingGraphic() {
  const g = "from-[#8B5CF6] to-[#A78BFA]";
  const up = "text-emerald-300";
  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <MeterRow label="wstETH" value="4.12%" width="70%" gradient={g} valueClassName={up} />
      <MeterRow label="rsETH" value="3.86%" width="62%" gradient={g} valueClassName={up} />
      <MeterRow label="sDAI" value="8.12%" width="88%" gradient={g} valueClassName={up} />
    </div>
  );
}

function MetricTile({
  label,
  value,
  valueClassName,
  className,
  children,
}: {
  label: string;
  value?: string;
  valueClassName?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-ink-700/60 bg-ink-900/70 px-3 py-2.5",
        className,
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {label}
      </span>
      {value && (
        <span
          className={cn(
            "font-display text-lg font-semibold tracking-tight text-ink-50",
            valueClassName,
          )}
        >
          {value}
        </span>
      )}
      {children}
    </div>
  );
}

export function DerivativesGraphic() {
  return (
    <div className="grid grid-cols-2 gap-2 p-3.5">
      <MetricTile label="Open interest" value="$284.1M" valueClassName="text-[#4FE3F5]" />
      <MetricTile label="Funding" value="0.011%" />
      <MetricTile label="Liquidation depth" className="col-span-2 gap-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#5c92ff]"
            style={{ width: "66%" }}
          />
        </div>
      </MetricTile>
    </div>
  );
}

function TableRow({
  label,
  sub,
  right,
}: {
  label: string;
  sub: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <div className="font-mono text-[11px] text-ink-100">{label}</div>
        <div className="text-[9px] text-ink-500">{sub}</div>
      </div>
      {right}
    </div>
  );
}

function MonoValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] tabular-nums text-ink-50">{children}</span>
  );
}

export function RwaGraphic() {
  return (
    <div className="divide-y divide-ink-800/70 px-3.5 py-1.5">
      <TableRow label="BUIDL" sub="Treasuries" right={<MonoValue>$512.4M</MonoValue>} />
      <TableRow label="USDY" sub="Treasuries" right={<MonoValue>$438.1M</MonoValue>} />
      <TableRow label="OUSG" sub="Credit" right={<MonoValue>$196.7M</MonoValue>} />
    </div>
  );
}

export function LiquidityGraphic() {
  return (
    <div className="px-3.5 pb-1 pt-3">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-display text-lg font-semibold tracking-tight text-ink-50">
          $1.24B
        </span>
        <span className="font-mono text-[10px] text-emerald-300">+8.4%</span>
      </div>
      <svg
        width="100%"
        height="58"
        viewBox="0 0 260 70"
        preserveAspectRatio="none"
        className="block"
      >
        <defs>
          <linearGradient id="home-liq-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(167,139,250,0.38)" />
            <stop offset="1" stopColor="rgba(167,139,250,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,56 L26,50 L52,53 L78,42 L104,45 L130,34 L156,38 L182,24 L208,28 L234,15 L260,19 L260,70 L0,70 Z"
          fill="url(#home-liq-fill)"
        />
        <path
          d="M0,56 L26,50 L52,53 L78,42 L104,45 L130,34 L156,38 L182,24 L208,28 L234,15 L260,19"
          fill="none"
          stroke="#A78BFA"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function StatusChip({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px]",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function GovernanceGraphic() {
  return (
    <div className="divide-y divide-ink-800/70 px-3.5 py-1.5">
      <TableRow
        label="ARB-42"
        sub="Quorum met"
        right={<StatusChip label="passed" className="border-emerald-500/40 text-emerald-300" />}
      />
      <TableRow
        label="ARB-43"
        sub="Voting open"
        right={<StatusChip label="live" className="border-[#22D3EE]/40 text-[#22D3EE]" />}
      />
      <TableRow label="Treasury" sub="Allocation" right={<MonoValue>$3.1B</MonoValue>} />
    </div>
  );
}
