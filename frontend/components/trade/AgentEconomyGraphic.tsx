/**
 * Roadmap illustration for the agent-to-agent research economy: a dashed mesh
 * of ERC-8004 agents exchanging research for tCNHV, above a mock listing
 * table. Dashed strokes + "planned" chip signal this is not live yet.
 */
export function AgentEconomyGraphic() {
  return (
    <div className="glass overflow-hidden rounded-2xl border border-ink-700/60">
      <div className="relative overflow-hidden bg-ink-950/40 bg-[radial-gradient(120%_90%_at_50%_8%,rgba(139,92,246,0.22),transparent_62%)]">
        {/* terminal chrome */}
        <div className="flex items-center gap-1.5 border-b border-ink-800/70 px-4 py-2.5">
          <i className="block h-2 w-2 rounded-full bg-ink-600/60" />
          <i className="block h-2 w-2 rounded-full bg-ink-600/60" />
          <i className="block h-2 w-2 rounded-full bg-ink-600/60" />
          <span className="grow" />
          <span className="font-mono text-[9px] tracking-wide text-ink-500">
            a2a · research mesh · planned
          </span>
        </div>

        {/* agent mesh */}
        <svg
          aria-hidden="true"
          viewBox="0 0 300 130"
          width="100%"
          height="150"
          preserveAspectRatio="xMidYMid meet"
          className="block px-2 pt-3"
        >
          <defs>
            <linearGradient id="trade-a2a-edge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* dashed edges from your agent to peers */}
          <path d="M150 65 L52 26" stroke="url(#trade-a2a-edge)" strokeWidth="1.2" strokeDasharray="4 4" fill="none" />
          <path d="M150 65 L248 26" stroke="url(#trade-a2a-edge)" strokeWidth="1.2" strokeDasharray="4 4" fill="none" />
          <path d="M150 65 L52 108" stroke="url(#trade-a2a-edge)" strokeWidth="1.2" strokeDasharray="4 4" fill="none" />
          <path d="M150 65 L248 108" stroke="url(#trade-a2a-edge)" strokeWidth="1.2" strokeDasharray="4 4" fill="none" />

          {/* edge labels */}
          <text x="88" y="38" fill="#7C8499" fontSize="7" fontFamily="var(--font-mono)">verdict feed</text>
          <text x="184" y="38" fill="#7C8499" fontSize="7" fontFamily="var(--font-mono)">0.4 tCNHV</text>
          <text x="90" y="96" fill="#7C8499" fontSize="7" fontFamily="var(--font-mono)">thesis</text>
          <text x="182" y="96" fill="#7C8499" fontSize="7" fontFamily="var(--font-mono)">1.2 tCNHV</text>

          {/* peer nodes */}
          <g>
            <rect x="22" y="14" width="60" height="20" rx="10" fill="#10131D" stroke="#1F2433" />
            <text x="52" y="27" textAnchor="middle" fill="#7C8499" fontSize="7.5" fontFamily="var(--font-mono)">agent 0x3f…a2</text>
            <rect x="218" y="14" width="60" height="20" rx="10" fill="#10131D" stroke="#1F2433" />
            <text x="248" y="27" textAnchor="middle" fill="#7C8499" fontSize="7.5" fontFamily="var(--font-mono)">agent 0x91…c7</text>
            <rect x="22" y="96" width="60" height="20" rx="10" fill="#10131D" stroke="#1F2433" />
            <text x="52" y="109" textAnchor="middle" fill="#7C8499" fontSize="7.5" fontFamily="var(--font-mono)">agent 0xb4…e9</text>
            <rect x="218" y="96" width="60" height="20" rx="10" fill="#10131D" stroke="#1F2433" />
            <text x="248" y="109" textAnchor="middle" fill="#7C8499" fontSize="7.5" fontFamily="var(--font-mono)">agent 0x6d…18</text>
          </g>

          {/* your agent, center */}
          <rect x="112" y="52" width="76" height="26" rx="13" fill="#161A26" stroke="#8B5CF6" strokeOpacity="0.6" />
          <text x="150" y="65" textAnchor="middle" fill="#D4D8E4" fontSize="8" fontFamily="var(--font-mono)">your agent</text>
          <text x="150" y="74" textAnchor="middle" fill="#A78BFA" fontSize="6.5" fontFamily="var(--font-mono)">ERC-8004 · FHE</text>
        </svg>

        {/* mock listings */}
        <div className="divide-y divide-ink-800/70 border-t border-ink-800/70 px-3.5 py-1.5">
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-ink-100">ETH perp thesis</p>
              <p className="text-[10px] text-ink-500">verdict · fresh</p>
            </div>
            <span className="font-mono text-[11px] text-ink-200 tabular">0.4 tCNHV</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-ink-100">Funding-rate feed</p>
              <p className="text-[10px] text-ink-500">subscription</p>
            </div>
            <span className="font-mono text-[11px] text-ink-200 tabular">1.2 tCNHV / mo</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-ink-100">Verdict oracle</p>
              <p className="text-[10px] text-ink-500">per call</p>
            </div>
            <span className="inline-flex whitespace-nowrap rounded-full border border-amber-400/40 px-2 py-0.5 font-mono text-[9px] text-amber-200">
              planned
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
