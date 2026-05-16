"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { AiHubWorkspace } from "@/components/ai-hub-workspace";

export default function AiHubPage() {
  return (
    <DashboardShell>
      <AiHubWorkspace />
    </DashboardShell>
  );
}
