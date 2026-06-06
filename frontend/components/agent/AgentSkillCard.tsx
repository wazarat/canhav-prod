"use client";

import { useCallback, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { skillToJson, skillToMarkdown } from "@/lib/agent/skillExport";
import type { AgentSkill } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AgentSkillCardProps {
  skill: AgentSkill;
}

function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:text-ink-50"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function CollapsibleSection({ heading, body }: { heading: string; body: string }) {
  return (
    <details className="group rounded-lg border border-ink-800/60 bg-ink-900/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ink-100">
        {heading}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" />
      </summary>
      <p className="border-t border-ink-800/60 px-4 py-3 text-sm leading-relaxed text-ink-300">
        {body}
      </p>
    </details>
  );
}

export function AgentSkillCard({ skill }: AgentSkillCardProps) {
  const md = skillToMarkdown(skill);
  const json = skillToJson(skill);

  return (
    <section id="agent-skill" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-2">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
            AI Agent Skill
          </h2>
          <p className="mt-1 text-sm text-ink-300">
            Machine-readable protocol knowledge for agents
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton label="Copy as Markdown" text={md} />
          <CopyButton label="Copy as JSON" text={json} />
          <a
            href={`/agents/skills/${skill.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 hover:bg-electric-500/20"
          >
            Raw markdown
          </a>
        </div>
      </div>

      <Card className="space-y-4">
        <div>
          <CardTitle className="text-base">{skill.title}</CardTitle>
          <CardDescription className="mt-2 leading-relaxed">{skill.summary}</CardDescription>
          <p className="mt-2 font-mono text-xs text-ink-500">
            {skill.id} · v{skill.version}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Facts</p>
          <TableShell>
            <Table>
              <TBody>
                {skill.facts.map((f) => (
                  <TR key={f.key}>
                    <TD className="w-1/3 font-mono text-xs text-ink-400">{f.key}</TD>
                    <TD className="text-sm text-ink-100">{f.value}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableShell>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Sections</p>
          <div className="space-y-2">
            {skill.sections.map((s) => (
              <CollapsibleSection key={s.heading} heading={s.heading} body={s.body} />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Actions</p>
          <TableShell>
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Signature</TH>
                  <TH>Access</TH>
                </TR>
              </THead>
              <TBody>
                {skill.actions.map((a) => (
                  <TR key={a.signature}>
                    <TD>
                      <p className="text-sm font-medium text-ink-100">{a.name}</p>
                      <p className="text-xs text-ink-400">{a.description}</p>
                    </TD>
                    <TD>
                      <code className="break-all text-xs text-electric-400">{a.signature}</code>
                    </TD>
                    <TD>
                      <Badge tone={a.readOnly ? "neutral" : "warning"}>
                        {a.readOnly ? "read-only" : "write"}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableShell>
        </div>

        {skill.glossary && skill.glossary.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Glossary</p>
            <dl className="space-y-2">
              {skill.glossary.map((g) => (
                <div key={g.term} className={cn("rounded-lg bg-ink-900/40 px-3 py-2")}>
                  <dt className="text-sm font-medium text-ink-100">{g.term}</dt>
                  <dd className="mt-0.5 text-sm text-ink-400">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Card>
    </section>
  );
}
