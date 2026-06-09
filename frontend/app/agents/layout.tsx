import { agentConfigStatus } from "@/lib/agent/config";
import { getSession } from "@/lib/auth/session";
import { userAgentId } from "@/lib/agent/user-agent";
import { AgentsShell } from "@/components/agent/AgentsShell";

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  const status = agentConfigStatus();
  const session = getSession();

  const initialSession = session
    ? { userId: session.userId, agentId: userAgentId(session.userId) }
    : null;

  return (
    <AgentsShell initialSession={initialSession} passkeyConfigured={status.passkeyServer}>
      {children}
    </AgentsShell>
  );
}
