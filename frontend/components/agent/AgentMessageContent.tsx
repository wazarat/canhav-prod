"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const assistantComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mb-1.5 mt-3 first:mt-0 text-sm font-semibold text-ink-50">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-1.5 mt-3 first:mt-0 text-sm font-semibold text-ink-50">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 first:mt-0 text-sm font-semibold text-ink-50">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1 mt-2 first:mt-0 text-sm font-medium text-ink-100">{children}</h4>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-medium text-ink-50">{children}</strong>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0 marker:text-ink-500">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0 marker:text-ink-500">
      {children}
    </ol>
  ),
  // GFM "loose" lists wrap each item's text in a <p>; zero its margins so the
  // marker and text stay on one line and items don't double-space.
  li: ({ children }) => (
    <li className="leading-relaxed [&>p]:mb-0 [&>ol]:mt-0.5 [&>ul]:mt-0.5">{children}</li>
  ),
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
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg border border-ink-800/60 bg-ink-950/60 p-3 text-xs leading-relaxed last:mb-0 [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-electric-500/40 pl-3 text-ink-300 last:mb-0 [&>p]:mb-1 [&>p:last-child]:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-ink-800/60" />,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="text-ink-300">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-ink-700/80 px-2 py-1.5 text-left font-medium uppercase tracking-wide text-[11px] text-ink-400">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-ink-800/50 px-2 py-1.5 align-top text-ink-100">{children}</td>
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
