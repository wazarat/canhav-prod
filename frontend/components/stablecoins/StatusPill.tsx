import { CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { ApprovalStatus } from "@/lib/types";

export function StatusPill({ status }: { status: ApprovalStatus }) {
  if (status === "APPROVED") {
    return (
      <Badge tone="positive">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge tone="warning">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}
