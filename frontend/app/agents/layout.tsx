import { agentConfigStatus } from "@/lib/agent/config";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";
import { AgentsShell } from "@/components/agent/AgentsShell";
import { PrivyShell } from "@/components/agent/PrivyShell";

export default async function AgentsLayout({ children }: { children: React.ReactNode }) {
  const status = agentConfigStatus();
  const session = getSession();
  const profile = session ? await getUserProfile(session.userId) : null;

  const initialSession = session
    ? {
        userId: session.userId,
        agentId: userAgentId(session.userId),
        displayName: profile?.displayName ?? null,
      }
    : null;

  return (
    <PrivyShell>
      <AgentsShell initialSession={initialSession} privyConfigured={status.privy}>
        {children}
      </AgentsShell>
    </PrivyShell>
  );
}
