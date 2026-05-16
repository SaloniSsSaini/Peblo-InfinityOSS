"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, CheckSquare2, FileText, Loader2, Sparkles, Users, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch, readApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

type WorkspaceInsights = {
  workspaceId: string;
  generatedAt: string;
  notes: { total: number; shared: number; updatedLast7Days: number };
  tasks: {
    total: number;
    open: number;
    done: number;
    blocked: number;
    overdue: number;
    dueNext7Days: number;
    byStatus: Record<string, number>;
  };
  members: { total: number };
  workload: {
    userId: string | null;
    name: string;
    email: string | null;
    open: number;
    done: number;
    blocked: number;
    total: number;
  }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const workspaceId = useAuthStore((s) => s.currentWorkspaceId);

  const { data: insights, isFetching, isError, error } = useQuery({
    queryKey: ["workspaceInsights", workspaceId],
    queryFn: async () => {
      const res = await apiFetch(`/workspaces/${workspaceId}/insights`);
      if (!res.ok) throw new Error(await readApiError(res));
      return (await res.json()) as WorkspaceInsights;
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const metrics = insights
    ? [
        {
          label: "Notes",
          value: String(insights.notes.total),
          hint: `${insights.notes.updatedLast7Days} updated this week · ${insights.notes.shared} shared`,
          icon: FileText,
        },
        {
          label: "Open tasks",
          value: String(insights.tasks.open),
          hint: `${insights.tasks.done} done · ${insights.tasks.blocked} blocked`,
          icon: CheckSquare2,
        },
        {
          label: "Due soon",
          value: String(insights.tasks.dueNext7Days),
          hint:
            insights.tasks.overdue > 0
              ? `${insights.tasks.overdue} overdue — review Tasks`
              : "Next 7 days (not done)",
          icon: insights.tasks.overdue > 0 ? AlertTriangle : Zap,
        },
      ]
    : [
        { label: "Notes", value: "—", hint: "Select a workspace", icon: FileText },
        { label: "Open tasks", value: "—", hint: "Select a workspace", icon: CheckSquare2 },
        { label: "Due soon", value: "—", hint: "Select a workspace", icon: Zap },
      ];

  return (
    <DashboardShell>
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live workspace metrics from notes and tasks.{" "}
            {insights?.generatedAt
              ? `Updated ${new Date(insights.generatedAt).toLocaleString()}.`
              : null}
          </p>
        </motion.div>

        {isError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
            {error instanceof Error ? error.message : "Could not load insights."}
          </p>
        ) : null}

        <motion.div
          className="grid gap-3 sm:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent dark:from-white/[0.04]">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <m.icon className="size-4 text-violet-400" aria-hidden />
                    <CardDescription className="text-[11px] uppercase tracking-wider">
                      {m.label}
                    </CardDescription>
                  </div>
                  <CardTitle className="flex items-center gap-2 text-2xl tabular-nums">
                    {isFetching && !insights ? (
                      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
                    ) : (
                      m.value
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{m.hint}</CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {insights && insights.workload.length > 0 ? (
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Users className="size-4 text-sky-400" aria-hidden />
                <CardTitle className="text-base">Task workload</CardTitle>
              </motion.div>
              <CardDescription>
                Open / done / blocked per assignee · {insights.members.total} member
                {insights.members.total === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-white/5 text-sm">
                {insights.workload.map((w) => (
                  <li
                    key={w.userId ?? "unassigned"}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="font-medium">{w.name}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      <span className="text-foreground">{w.open}</span> open ·{" "}
                      <span className="text-emerald-400/90">{w.done}</span> done
                      {w.blocked > 0 ? (
                        <>
                          {" "}
                          · <span className="text-amber-400/90">{w.blocked}</span> blocked
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-emerald-400" />
                <CardTitle>Tasks</CardTitle>
              </div>
              <CardDescription>
                Kanban · {insights ? `${insights.tasks.total} total` : "status & due dates"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="secondary"
                className="rounded-lg"
                onClick={() => router.push("/dashboard/tasks")}
              >
                Open tasks
              </Button>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-400" />
                <CardTitle>Notes</CardTitle>
              </div>
              <CardDescription>
                Tree, tags, share links
                {insights ? ` · ${insights.notes.total} notes` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="secondary"
                className="rounded-lg"
                onClick={() => router.push("/dashboard/notes")}
              >
                Open notes
              </Button>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <motion.div className="flex items-center gap-2">
                <Sparkles className="size-4 text-fuchsia-400" />
                <CardTitle>AI summaries</CardTitle>
              </motion.div>
              <CardDescription>Use “AI summarize” on a note; optional OpenAI key on API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="secondary"
                className="rounded-lg"
                onClick={() => router.push("/dashboard/ai")}
              >
                AI hub
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </DashboardShell>
  );
}
