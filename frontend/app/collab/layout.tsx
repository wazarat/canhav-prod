import { PrivyShell } from "@/components/agent/PrivyShell";

export default function CollabLayout({ children }: { children: React.ReactNode }) {
  return <PrivyShell>{children}</PrivyShell>;
}
