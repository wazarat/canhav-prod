"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { FloatingResearchChat } from "./FloatingResearchChat";

export const OPEN_STATE_KEY = "canhav:research-chat-open";
export const REFRESH_EVENT = "canhav:research-chat-refresh";
export const ENTITY_AGENT_MINTED_EVENT = "canhav:entity-agent-minted";
export const AGENT_CACHE_KEY = "canhav:research-chat-agent-cache";

export interface ResearchChatScopeState {
  entitySlug: string | null;
  entityName?: string;
}

interface ResearchChatContextValue {
  scope: ResearchChatScopeState;
  setScope: (scope: ResearchChatScopeState) => void;
  refreshToken: number;
  bumpRefresh: () => void;
  llmConfigured: boolean;
}

const ResearchChatContext = createContext<ResearchChatContextValue | null>(null);

const DATA_PREFIXES = ["/entities", "/stablecoins", "/rwas", "/tokens"];

function isDataRoute(pathname: string): boolean {
  return DATA_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Open the floating chat and re-resolve the active agent (e.g. after mint). */
export function openResearchChat(): void {
  try {
    sessionStorage.removeItem(AGENT_CACHE_KEY);
    sessionStorage.setItem(OPEN_STATE_KEY, "1");
  } catch {
    // Best-effort only.
  }
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

export function useResearchChat(): ResearchChatContextValue {
  const ctx = useContext(ResearchChatContext);
  if (!ctx) {
    throw new Error("useResearchChat must be used within ResearchChatProvider");
  }
  return ctx;
}

/**
 * Mounts a single persistent floating chat on data routes. Pages set scope via
 * {@link ResearchChatScope} without remounting the widget.
 */
export function ResearchChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scope, setScope] = useState<ResearchChatScopeState>({
    entitySlug: null,
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [llmConfigured, setLlmConfigured] = useState(false);

  const bumpRefresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/agent/me");
        if (!res.ok) return;
        const data = (await res.json()) as { llmConfigured?: boolean };
        if (active && data.llmConfigured != null) {
          setLlmConfigured(data.llmConfigured);
        }
      } catch {
        // LLM flag is optional sugar for the chat UI.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handler = () => bumpRefresh();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [bumpRefresh]);

  const value = useMemo(
    () => ({
      scope,
      setScope,
      refreshToken,
      bumpRefresh,
      llmConfigured,
    }),
    [scope, refreshToken, bumpRefresh, llmConfigured],
  );

  const onDataRoute = isDataRoute(pathname);

  return (
    <ResearchChatContext.Provider value={value}>
      {children}
      {onDataRoute && (
        <FloatingResearchChat
          entitySlug={scope.entitySlug}
          entityName={scope.entityName}
          llmConfigured={llmConfigured}
          refreshToken={refreshToken}
        />
      )}
    </ResearchChatContext.Provider>
  );
}

/**
 * Sets the entity context for the shared floating chat. Does not clear scope on
 * unmount so the next page can update without a blank frame.
 */
export function ResearchChatScope({
  entitySlug = null,
  entityName,
}: {
  entitySlug?: string | null;
  entityName?: string;
}) {
  const { setScope } = useResearchChat();

  useEffect(() => {
    setScope({ entitySlug, entityName });
  }, [entitySlug, entityName, setScope]);

  return null;
}
