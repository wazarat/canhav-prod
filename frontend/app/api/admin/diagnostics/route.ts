import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth/admin";
import { getNetworkMemberCoins } from "@/lib/data";
import {
  computeFieldCoverage,
  summarizeCoverage,
  type FieldCoverage,
} from "@/lib/server/diagnostics/fieldCoverage";
import { readLiveStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DiagnosticsItem {
  slug: string;
  name: string;
  sector: string | null;
  tags: string[];
  coverage: FieldCoverage[];
  summary: ReturnType<typeof summarizeCoverage>;
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Sign in as an admin or send a Bearer APPROVAL_TOKEN." },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const slugFilter = url.searchParams.get("slug");

  const { networks } = await readLiveStore();
  const selected = slugFilter ? networks.filter((n) => n.slug === slugFilter) : networks;

  if (slugFilter && selected.length === 0) {
    return NextResponse.json(
      { ok: false, error: `No network found for slug "${slugFilter}".` },
      { status: 404 },
    );
  }

  const items: DiagnosticsItem[] = [];
  for (const network of selected) {
    // Resolve member coins (for dangling-ref detection) only for the detailed
    // single-slug view; the full list stays cheap.
    const memberCoins = slugFilter ? await getNetworkMemberCoins(network) : undefined;
    const coverage = computeFieldCoverage(network, memberCoins);
    items.push({
      slug: network.slug,
      name: network.name,
      sector: network.sector ?? null,
      tags: network.tags ?? [],
      coverage,
      summary: summarizeCoverage(coverage),
    });
  }

  return NextResponse.json({ ok: true, items });
}
