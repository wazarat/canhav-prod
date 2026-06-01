import Link from "next/link";

import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="font-mono text-sm text-electric-400">404</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
        Not found
      </h1>
      <p className="max-w-md text-sm text-ink-300">
        This profile may be pending approval, or the page doesn&apos;t exist. Only approved
        entities are exposed publicly.
      </p>
      <Button asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
