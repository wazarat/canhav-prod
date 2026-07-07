import Link from "next/link";
import {
  BrainCircuit,
  CheckCircle2,
  CircleDashed,
  Coins,
  Database,
  Fingerprint,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { agentConfigStatus } from "@/lib/agent/config";

interface CapabilityRow {
  key: "openai" | "upstash" | "zerodev" | "tcnhv";
  icon: typeof BrainCircuit;
  label: string;
  ready: boolean;
  readyHint: string;
  pendingHint: string;
}

function CapabilityItem({ row }: { row: CapabilityRow }) {
  const Icon = row.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-ink-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-ink-100">{row.label}</p>
          {row.ready ? (
            <Badge tone="positive">
              <CheckCircle2 className="h-3 w-3" /> configured
            </Badge>
          ) : (
            <Badge tone="neutral">
              <CircleDashed className="h-3 w-3" /> not configured
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">
          {row.ready ? row.readyHint : row.pendingHint}
        </p>
      </div>
    </div>
  );
}

/**
 * Operator-only backend readiness panel (LLM, memory, identity, tCNHV).
 * Rendered on the admin-gated provisioning tab of /agents — end users never
 * see this.
 */
export function ProvisioningCard() {
  const status = agentConfigStatus();

  const rows: CapabilityRow[] = [
    {
      key: "openai",
      icon: BrainCircuit,
      label: "Reasoning (LLM)",
      ready: status.llm,
      readyHint: `LLM research loop active · model ${status.model} · via ${status.provider}.`,
      pendingHint:
        "Set OPENAI_API_KEY (or AI_GATEWAY_API_KEY for failover) to enable the research agent's chat + tool loop.",
    },
    {
      key: "upstash",
      icon: Database,
      label: "Memory (Upstash Redis)",
      ready: status.upstash,
      readyHint: "Agents persist learned facts and runs across sessions.",
      pendingHint:
        "No Upstash credentials — memory falls back to a local JSON file for offline dev.",
    },
    {
      key: "zerodev",
      icon: Fingerprint,
      label: "On-chain identity (ZeroDev + ERC-8004)",
      ready: status.zerodev,
      readyHint: "Agents can mint a wallet-owned ERC-8004 identity (gas sponsored).",
      pendingHint:
        "Deploy the registries + create a ZeroDev project, then set ZERODEV_RPC, IDENTITY_REGISTRY_ADDRESS, SECURITY_REGISTRY_ADDRESS, NEXT_PUBLIC_PRIVY_APP_ID, and PRIVY_APP_SECRET.",
    },
    {
      key: "tcnhv",
      icon: Coins,
      label: "tCNHV credits (mint + faucet)",
      ready: status.canMintTcnhv,
      readyHint: "Starting credits can be minted to treasuries and rewards paid out.",
      pendingHint: status.tcnhv
        ? status.factoryDeployerKeySet && !status.factoryDeployerKeyValid
          ? "FACTORY_DEPLOYER_PRIVATE_KEY is set but invalid — use the deployer wallet private key (0x + 64 hex chars, no quotes), then redeploy."
          : "Token is set but the owner key is missing — set FACTORY_DEPLOYER_PRIVATE_KEY on Vercel, then redeploy."
        : "Set TCNHV_TOKEN_ADDRESS and FACTORY_DEPLOYER_PRIVATE_KEY on Vercel to enable minting starting credits.",
    },
  ];

  const readyCount = rows.filter((r) => r.ready).length;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
        <div>
          <CardTitle className="text-base">Provisioning</CardTitle>
          <CardDescription className="mt-1">
            What&apos;s live in this environment. Each capability degrades gracefully until set.
            Visible to operators only.
          </CardDescription>
        </div>
        <Badge tone={readyCount === rows.length ? "positive" : "neutral"}>
          {readyCount}/{rows.length} ready
        </Badge>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <CapabilityItem key={row.key} row={row} />
        ))}
      </div>
      <p className="text-xs text-ink-500">
        Live status:{" "}
        <Link
          href="/api/agent/status"
          className="font-mono text-electric-400 hover:text-electric-300"
        >
          GET /api/agent/status
        </Link>
      </p>
    </Card>
  );
}
