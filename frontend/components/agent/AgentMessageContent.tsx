"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const assistantComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mb-2 mt-3 first:mt-0 text-sm font-semibold text-ink-50">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-3 first:mt-0 text-sm font-semibold text-ink-50">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 first:mt-0 text-sm font-semibold text-ink-50">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1.5 mt-2 first:mt-0 text-sm font-medium text-ink-100">{children}</h4>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-medium text-ink-50">{children}</strong>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-electric-400 underline decoration-electric-500/40 underline-offset-2 transition-colors hover:text-electric-300"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-ink-800/80 px-1 py-0.5 font-mono text-xs text-ink-100">
      {children}
    </code>
  ),
};

export function AgentMessageContent({
  role,
  text,
  className,
}: {
  role: "user" | "assistant" | "system";
  text: string;
  className?: string;
}) {
  if (!text) return null;

  if (role === "user") {
    return <span className={cn("whitespace-pre-wrap", className)}>{text}</span>;
  }

  return (
    <div className={cn("agent-markdown leading-relaxed", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={assistantComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
