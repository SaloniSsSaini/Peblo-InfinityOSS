"use client";

import { isDemoMode } from "@/lib/demo-mode";

export function DemoModeBanner() {
  if (!isDemoMode()) return null;
  return (
    <div
      className="border-b border-violet-500/25 bg-violet-950/40 px-4 py-2 text-center text-xs text-violet-100/90"
      role="status"
    >
      <strong className="font-medium text-violet-50">Portfolio demo</strong> — all data stays in your
      browser (localStorage). No API, database, or Render backend required.
    </div>
  );
}
