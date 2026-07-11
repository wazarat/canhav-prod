import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CANHAV_CONTRACTS,
  DEPLOYER_ADDRESS,
  INTEGRATED_CONTRACTS,
  STACK,
  type ContractEntry,
} from "@/lib/contracts-registry";
import { arbiscanSepoliaAddress } from "@/lib/utils";

export const metadata = {
  title: "Contracts & stack",
  description:
    "The live on-chain contracts and partner stack behind CanHav agents, research gating and trading.",
};

function AddressLink({ address }: { address: string }) {
  const href = arbiscanSepoliaAddress(address);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1 text-xs text-electric-400 transition-colors hover:text-electric-300"
    >
      <span className="break-all font-mono">{address}</span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
    </a>
  );
}

function ContractRows({ entries }: { entries: ContractEntry[] }) {
  return (
    <ul className="mt-4 divide-y divide-ink-800/60">
      {entries.map((entry) => (
        <li
          key={entry.address + entry.name}
          className="flex flex-col gap-2 py-4 md:flex-row md:items-start md:justify-between md:gap-6"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink-50">{entry.name}</p>
            <p className="text-sm text-ink-300">{entry.role}</p>
            {entry.note && <p className="text-xs text-ink-500">{entry.note}</p>}
          </div>
          <AddressLink address={entry.address} />
        </li>
      ))}
    </ul>
  );
}

export default function ContractsPage() {
  return (
    <div className="container space-y-8 py-12">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Contracts & stack" }]}
        title="Contracts & stack"
        badges={<Badge tone="signal">Arbitrum</Badge>}
        description="Everything CanHav agents do settles on-chain: identity, reputation, research gating, encrypted guardrails and trades. These are the live contracts behind the platform and the partner technology they build on. Every address links to the block explorer."
      />

      <Card>
        <CardTitle>CanHav contracts</CardTitle>
        <CardDescription className="mt-1">
          Deployed and operated by CanHav on Arbitrum, chain id 421614.
        </CardDescription>
        <ContractRows entries={CANHAV_CONTRACTS} />
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Integrated contracts</CardTitle>
          <Badge tone="neutral">Integrated, not ours</Badge>
        </div>
        <CardDescription className="mt-1">
          Third-party contracts the platform executes against: GMX V2 perp markets and their
          collateral token.
        </CardDescription>
        <ContractRows entries={INTEGRATED_CONTRACTS} />
      </Card>

      <Card>
        <CardTitle>Stack</CardTitle>
        <CardDescription className="mt-1">
          The sponsor and partner technology CanHav is built with.
        </CardDescription>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {STACK.map((item) => (
            <div key={item.name} className="rounded-xl border border-ink-800/60 bg-ink-900/40 p-4">
              <p className="text-sm font-medium text-ink-50">{item.name}</p>
              <p className="mt-1 text-sm text-ink-300">{item.role}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
        <span>All CanHav contracts are deployed from</span>
        <AddressLink address={DEPLOYER_ADDRESS} />
      </div>
    </div>
  );
}
