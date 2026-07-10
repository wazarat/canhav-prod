import { redirect } from "next/navigation";

import { PrivyShell } from "@/components/agent/PrivyShell";
import { collabEnabled } from "@/lib/collab-flag";

export default function CollabLayout({ children }: { children: React.ReactNode }) {
  if (!collabEnabled()) redirect("/");
  return <PrivyShell>{children}</PrivyShell>;
}
