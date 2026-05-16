"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { NotesWorkspace } from "@/components/notes-workspace";

export default function NotesPage() {
  return (
    <DashboardShell>
      <NotesWorkspace />
    </DashboardShell>
  );
}
