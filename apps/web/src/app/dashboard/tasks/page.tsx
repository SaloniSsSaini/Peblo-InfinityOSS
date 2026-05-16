"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { TasksWorkspace } from "@/components/tasks-workspace";

export default function TasksPage() {
  return (
    <DashboardShell>
      <TasksWorkspace />
    </DashboardShell>
  );
}
