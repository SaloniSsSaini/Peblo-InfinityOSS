"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, readApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";

type MemberRow = {
  userId: string;
  name: string | null;
  email: string;
  role: string;
};

type TaskRow = {
  id: string;
  workspaceId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string | null; email: string } | null;
};

const COLUMNS: { status: TaskStatus; label: string; hint: string }[] = [
  { status: "TODO", label: "To do", hint: "New work" },
  { status: "IN_PROGRESS", label: "In progress", hint: "Active" },
  { status: "DONE", label: "Done", hint: "Shipped" },
  { status: "BLOCKED", label: "Blocked", hint: "Waiting" },
];

export function TasksWorkspace() {
  const searchParams = useSearchParams();
  const highlightTaskId = searchParams.get("taskId");
  const workspaceId = useAuthStore((s) => s.currentWorkspaceId);
  const currentUserId = useAuthStore((s) => s.user.id);
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: async () => {
      const res = await apiFetch(`/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error(await readApiError(res));
      return (await res.json()) as MemberRow[];
    },
    enabled: !!workspaceId,
  });

  const { data: tasks = [], isFetching } = useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: async () => {
      const res = await apiFetch(`/tasks?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error(await readApiError(res));
      return (await res.json()) as TaskRow[];
    },
    enabled: !!workspaceId,
  });

  const tasksByStatus = useMemo(() => {
    const map = new Map<TaskStatus, TaskRow[]>();
    for (const c of COLUMNS) {
      map.set(
        c.status,
        tasks
          .filter((t) => t.status === c.status)
          .sort((a, b) => a.position - b.position || b.createdAt.localeCompare(a.createdAt)),
      );
    }
    const known = new Set<TaskStatus>(COLUMNS.map((c) => c.status));
    const orphans = tasks.filter((t) => !known.has(t.status));
    if (orphans.length) {
      const todo = map.get("TODO") ?? [];
      map.set("TODO", [...orphans, ...todo]);
    }
    return map;
  }, [tasks]);

  const createMut = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiFetch(`/tasks?workspaceId=${workspaceId}`, {
        method: "POST",
        body: JSON.stringify({ title, status: "TODO" }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });

  const patchMut = useMutation({
    mutationFn: async (payload: { id: string; body: Record<string, unknown> }) => {
      const res = await apiFetch(`/tasks/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload.body),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readApiError(res));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });

  const onAdd = useCallback(() => {
    const t = newTitle.trim();
    if (!t || !workspaceId) return;
    createMut.mutate(t);
    setNewTitle("");
  }, [newTitle, workspaceId, createMut]);

  useEffect(() => {
    if (!highlightTaskId || !tasks.length) return;
    const el = document.getElementById(`task-${highlightTaskId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightTaskId, tasks]);

  const moveTaskToColumn = useCallback(
    (taskId: string, targetStatus: TaskStatus) => {
      const task = tasks.find((x) => x.id === taskId);
      if (!task || task.status === targetStatus) return;
      const inCol = tasks.filter((x) => x.status === targetStatus);
      const maxPos = inCol.reduce((m, x) => Math.max(m, x.position), -1);
      patchMut.mutate({
        id: taskId,
        body: { status: targetStatus, position: maxPos + 1 },
      });
    },
    [tasks, patchMut],
  );

  if (!workspaceId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No workspace selected. Log in again if this stays empty.
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kanban by status. Drag cards between columns, set assignees from workspace members, and
          edit inline.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            New task
          </label>
          <input
            className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
            placeholder="Title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
          />
        </div>
        <Button
          type="button"
          className="h-10 gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
          disabled={createMut.isPending || !newTitle.trim()}
          onClick={onAdd}
        >
          {createMut.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          Add to To do
        </Button>
      </div>

      <div className="flex min-h-[420px] gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <section
            key={col.status}
            className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-white/10 bg-white/[0.02]"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("application/task-id");
              if (id) moveTaskToColumn(id, col.status);
            }}
          >
            <header className="border-b border-white/10 px-3 py-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {col.label}
              </h2>
              <p className="text-[10px] text-muted-foreground">{col.hint}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {(tasksByStatus.get(col.status) ?? []).length} tasks
              </p>
            </header>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {isFetching && !tasks.length ? (
                <div className="flex flex-1 items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" aria-hidden />
                </div>
              ) : (
                (tasksByStatus.get(col.status) ?? []).map((task) => (
                  <article
                    key={task.id}
                    id={`task-${task.id}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/task-id", task.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingId(task.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={`rounded-lg border border-white/10 bg-white/[0.04] p-2 shadow-sm transition-opacity ${
                      draggingId === task.id ? "opacity-60" : "opacity-100"
                    } ${highlightTaskId === task.id ? "ring-2 ring-violet-500/80" : ""}`}
                  >
                    <div className="flex items-start gap-1">
                      <span
                        className="mt-1 cursor-grab text-muted-foreground active:cursor-grabbing"
                        title="Drag to another column"
                      >
                        <GripVertical className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <input
                          className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium outline-none focus:border-white/15 focus:bg-white/5"
                          defaultValue={task.title}
                          key={`${task.id}-t-${task.updatedAt}`}
                          onBlur={(ev) => {
                            const v = ev.target.value.trim();
                            if (v && v !== task.title) {
                              patchMut.mutate({ id: task.id, body: { title: v } });
                            }
                          }}
                        />
                        {task.description ? (
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                            {task.description}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-col gap-1.5">
                          <label className="text-[10px] font-medium text-muted-foreground">
                            Assignee
                          </label>
                          <select
                            className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-[11px] outline-none focus:ring-2 focus:ring-violet-500/30"
                            value={task.assigneeId ?? ""}
                            onChange={(ev) => {
                              const v = ev.target.value;
                              patchMut.mutate({
                                id: task.id,
                                body: { assigneeId: v === "" ? null : v },
                              });
                            }}
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={m.userId} value={m.userId}>
                                {m.name?.trim() ? m.name : m.email}
                                {m.userId === currentUserId ? " (you)" : ""}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="size-3 shrink-0" aria-hidden />
                            <input
                              type="datetime-local"
                              className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-1 text-[10px] outline-none focus:ring-2 focus:ring-violet-500/30"
                              defaultValue={
                                task.dueAt
                                  ? new Date(task.dueAt).toISOString().slice(0, 16)
                                  : ""
                              }
                              key={`${task.id}-due-${task.dueAt ?? ""}`}
                              onBlur={(ev) => {
                                const v = ev.target.value;
                                const iso = v ? new Date(v).toISOString() : null;
                                const prev = task.dueAt
                                  ? new Date(task.dueAt).toISOString().slice(0, 16)
                                  : "";
                                if (v !== prev) {
                                  patchMut.mutate({
                                    id: task.id,
                                    body: { dueAt: iso },
                                  });
                                }
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-end gap-1 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-red-300"
                              aria-label="Delete task"
                              disabled={deleteMut.isPending}
                              onClick={() => {
                                if (window.confirm("Delete this task?")) deleteMut.mutate(task.id);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
              {!isFetching && (tasksByStatus.get(col.status) ?? []).length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted-foreground">
                  Drop tasks here or add above.
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
