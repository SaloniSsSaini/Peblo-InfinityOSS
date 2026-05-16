import {
  createDemoSession,
  DEMO_USER_ID,
  DEMO_WORKSPACE_ID,
} from "@/lib/demo-auth";
import { DEMO_MEMBERS, type MockNote, type MockTask } from "@/lib/mock-data";
import { getDemoState, useDemoStore } from "@/stores/demo-store";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400): Response {
  return json({ message, statusCode: status }, status);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function snippet(text: string, q: string, radius = 60): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const idx = normalized.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) {
    return normalized.length > 140 ? `${normalized.slice(0, 139)}…` : normalized;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(normalized.length, idx + q.length + radius);
  return `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${end < normalized.length ? "…" : ""}`;
}

function parseBody(init?: RequestInit): Record<string, unknown> {
  if (!init?.body || typeof init.body !== "string") return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function noteToListItem(n: MockNote) {
  return {
    id: n.id,
    title: n.title,
    format: n.format,
    folderPath: n.folderPath,
    parentId: n.parentId,
    tags: n.tags,
    updatedAt: n.updatedAt,
  };
}

function computeInsights() {
  const { notes, tasks } = getDemoState();
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86_400_000;
  const sevenAhead = now + 7 * 86_400_000;

  const byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0, BLOCKED: 0 };
  for (const t of tasks) {
    if (t.status in byStatus) byStatus[t.status as keyof typeof byStatus] += 1;
  }

  const open = tasks.filter((t) => t.status !== "DONE").length;
  const overdue = tasks.filter(
    (t) => t.dueAt && new Date(t.dueAt).getTime() < now && t.status !== "DONE",
  ).length;
  const dueSoon = tasks.filter((t) => {
    if (!t.dueAt || t.status === "DONE") return false;
    const d = new Date(t.dueAt).getTime();
    return d >= now && d <= sevenAhead;
  }).length;

  const workloadMap = new Map<
    string,
    { userId: string | null; name: string; email: string | null; open: number; done: number; blocked: number; total: number }
  >();

  for (const t of tasks) {
    const key = t.assigneeId ?? "__unassigned__";
    const name =
      t.assignee?.name ??
      (t.assigneeId ? "Member" : "Unassigned");
    const email = t.assignee?.email ?? null;
    if (!workloadMap.has(key)) {
      workloadMap.set(key, {
        userId: t.assigneeId,
        name,
        email,
        open: 0,
        done: 0,
        blocked: 0,
        total: 0,
      });
    }
    const row = workloadMap.get(key)!;
    row.total += 1;
    if (t.status === "DONE") row.done += 1;
    else if (t.status === "BLOCKED") row.blocked += 1;
    else row.open += 1;
  }

  return {
    workspaceId: DEMO_WORKSPACE_ID,
    generatedAt: new Date().toISOString(),
    notes: {
      total: notes.length,
      shared: notes.filter((n) => n.shareToken).length,
      updatedLast7Days: notes.filter((n) => new Date(n.updatedAt).getTime() >= sevenDaysAgo).length,
    },
    tasks: {
      total: tasks.length,
      open,
      done: byStatus.DONE,
      blocked: byStatus.BLOCKED,
      overdue,
      dueNext7Days: dueSoon,
      byStatus,
    },
    members: { total: DEMO_MEMBERS.length },
    workload: [...workloadMap.values()],
  };
}

function aiUsage() {
  const { aiLogs } = getDemoState();
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const usedLast24h = aiLogs.filter((l) => new Date(l.createdAt).getTime() >= since).length;
  const limit = 50;
  return { usedLast24h, limit, remaining: Math.max(0, limit - usedLast24h), windowHours: 24 };
}

export async function handleMockApi(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const normalized = path.replace(/^\//, "");
  const qIndex = normalized.indexOf("?");
  const pathOnly = qIndex === -1 ? normalized : normalized.slice(0, qIndex);
  const qs = new URLSearchParams(qIndex === -1 ? "" : normalized.slice(qIndex + 1));

  const store = useDemoStore.getState();

  // --- Auth ---
  if (pathOnly === "auth/me" && method === "PATCH") {
    const body = parseBody(init);
    const session = createDemoSession();
    const name =
      body.name !== undefined
        ? String(body.name).trim() || null
        : store.profile.name;
    const avatarUrl =
      body.avatarUrl !== undefined
        ? String(body.avatarUrl).trim() || null
        : store.profile.avatarUrl;
    if (avatarUrl && !/^https:\/\/.+/i.test(avatarUrl)) {
      return err("Avatar URL must be https", 400);
    }
    store.setProfile({ name, avatarUrl });
    return json({
      user: { ...session.user, name, avatarUrl },
      workspaces: session.workspaces,
    });
  }

  if (pathOnly === "auth/change-password" && method === "POST") {
    return json({ ok: true });
  }

  // --- Workspaces ---
  if (pathOnly.startsWith("workspaces/") && pathOnly.endsWith("/members") && method === "GET") {
    return json(DEMO_MEMBERS);
  }

  if (pathOnly.startsWith("workspaces/") && pathOnly.endsWith("/insights") && method === "GET") {
    return json(computeInsights());
  }

  // --- Notes ---
  if (pathOnly === "notes" && method === "GET") {
    const workspaceId = qs.get("workspaceId");
    const q = (qs.get("q") ?? "").trim().toLowerCase();
    const tag = (qs.get("tag") ?? "").trim().toLowerCase();
    let list = store.notes.filter((n) => n.workspaceId === workspaceId);
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          stripHtml(n.content).toLowerCase().includes(q),
      );
    }
    if (tag) {
      list = list.filter((n) => n.tags.some((t) => t.toLowerCase() === tag));
    }
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return json(list.map(noteToListItem));
  }

  if (pathOnly === "notes" && method === "POST") {
    const workspaceId = qs.get("workspaceId");
    const body = parseBody(init);
    const now = new Date().toISOString();
    const note: MockNote = {
      id: `note-${Date.now()}`,
      workspaceId: workspaceId ?? DEMO_WORKSPACE_ID,
      authorId: DEMO_USER_ID,
      parentId: (body.parentId as string | null) ?? null,
      title: String(body.title ?? "Untitled note"),
      content: String(body.content ?? "<p></p>"),
      format: (body.format as MockNote["format"]) ?? "RICH",
      folderPath: "/",
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
      shareToken: null,
      createdAt: now,
      updatedAt: now,
    };
    store.upsertNote(note);
    return json(note);
  }

  const noteShareMatch = pathOnly.match(/^notes\/([^/]+)\/share$/);
  if (noteShareMatch) {
    const id = noteShareMatch[1]!;
    const note = store.notes.find((n) => n.id === id);
    if (!note) return err("Note not found", 404);
    if (method === "POST") {
      const token = note.shareToken ?? `share-${Date.now().toString(36)}`;
      const updated = { ...note, shareToken: token, updatedAt: new Date().toISOString() };
      store.upsertNote(updated);
      return json({ shareToken: token });
    }
    if (method === "DELETE") {
      store.upsertNote({ ...note, shareToken: null, updatedAt: new Date().toISOString() });
      return json({ ok: true });
    }
  }

  const noteIdMatch = pathOnly.match(/^notes\/([^/]+)$/);
  if (noteIdMatch) {
    const id = noteIdMatch[1]!;
    const note = store.notes.find((n) => n.id === id);
    if (!note) return err("Note not found", 404);
    if (method === "GET") return json(note);
    if (method === "PATCH") {
      const body = parseBody(init);
      const updated: MockNote = {
        ...note,
        title: body.title !== undefined ? String(body.title) : note.title,
        content: body.content !== undefined ? String(body.content) : note.content,
        format: (body.format as MockNote["format"]) ?? note.format,
        tags: body.tags !== undefined ? (body.tags as string[]) : note.tags,
        parentId:
          body.parentId !== undefined
            ? (body.parentId as string | null)
            : note.parentId,
        updatedAt: new Date().toISOString(),
      };
      store.upsertNote(updated);
      return json(updated);
    }
  }

  // --- Tasks ---
  if (pathOnly === "tasks" && method === "GET") {
    const workspaceId = qs.get("workspaceId");
    const list = store.tasks
      .filter((t) => t.workspaceId === workspaceId)
      .sort((a, b) => a.position - b.position || b.updatedAt.localeCompare(a.updatedAt));
    return json(list);
  }

  if (pathOnly === "tasks" && method === "POST") {
    const workspaceId = qs.get("workspaceId");
    const body = parseBody(init);
    const now = new Date().toISOString();
    const assigneeId = (body.assigneeId as string | null) ?? null;
    const member = DEMO_MEMBERS.find((m) => m.userId === assigneeId);
    const task: MockTask = {
      id: `task-${Date.now()}`,
      workspaceId: workspaceId ?? DEMO_WORKSPACE_ID,
      assigneeId,
      title: String(body.title ?? "New task"),
      description: body.description != null ? String(body.description) : null,
      status: (body.status as MockTask["status"]) ?? "TODO",
      dueAt: (body.dueAt as string | null) ?? null,
      position: store.tasks.filter((t) => t.status === (body.status ?? "TODO")).length,
      createdAt: now,
      updatedAt: now,
      assignee: member
        ? { id: member.userId, name: member.name, email: member.email }
        : null,
    };
    store.upsertTask(task);
    return json(task);
  }

  const taskIdMatch = pathOnly.match(/^tasks\/([^/]+)$/);
  if (taskIdMatch) {
    const id = taskIdMatch[1]!;
    const task = store.tasks.find((t) => t.id === id);
    if (!task) return err("Task not found", 404);
    if (method === "GET") return json(task);
    if (method === "PATCH") {
      const body = parseBody(init);
      const assigneeId =
        body.assigneeId !== undefined ? (body.assigneeId as string | null) : task.assigneeId;
      const member = assigneeId ? DEMO_MEMBERS.find((m) => m.userId === assigneeId) : null;
      const updated: MockTask = {
        ...task,
        title: body.title !== undefined ? String(body.title) : task.title,
        description:
          body.description !== undefined
            ? body.description
              ? String(body.description)
              : null
            : task.description,
        status: (body.status as MockTask["status"]) ?? task.status,
        dueAt: body.dueAt !== undefined ? (body.dueAt as string | null) : task.dueAt,
        position: body.position !== undefined ? Number(body.position) : task.position,
        updatedAt: new Date().toISOString(),
        assignee: member
          ? { id: member.userId, name: member.name, email: member.email }
          : assigneeId
            ? task.assignee
            : null,
      };
      store.upsertTask(updated);
      return json(updated);
    }
    if (method === "DELETE") {
      store.removeTask(id);
      return json({ ok: true });
    }
  }

  // --- Search ---
  if (pathOnly === "search" && method === "GET") {
    const q = (qs.get("q") ?? "").trim();
    const limit = Math.min(Number(qs.get("limit") ?? 8), 20);
    const workspaceId = qs.get("workspaceId");
    if (!q) return json({ query: "", notes: [], tasks: [] });

    const notes = store.notes
      .filter(
        (n) =>
          n.workspaceId === workspaceId &&
          (n.title.toLowerCase().includes(q.toLowerCase()) ||
            stripHtml(n.content).toLowerCase().includes(q.toLowerCase())),
      )
      .slice(0, limit)
      .map((n) => ({
        type: "note" as const,
        id: n.id,
        title: n.title,
        snippet: snippet(stripHtml(n.content), q),
        tags: n.tags,
        updatedAt: n.updatedAt,
      }));

    const tasks = store.tasks
      .filter(
        (t) =>
          t.workspaceId === workspaceId &&
          (t.title.toLowerCase().includes(q.toLowerCase()) ||
            (t.description ?? "").toLowerCase().includes(q.toLowerCase())),
      )
      .slice(0, limit)
      .map((t) => ({
        type: "task" as const,
        id: t.id,
        title: t.title,
        snippet: snippet(t.description ?? "", q),
        status: t.status,
        updatedAt: t.updatedAt,
      }));

    return json({ query: q, notes, tasks });
  }

  // --- AI ---
  if (pathOnly === "ai/usage" && method === "GET") {
    return json(aiUsage());
  }

  if (pathOnly === "ai/logs" && method === "GET") {
    const limit = Math.min(Number(qs.get("limit") ?? 20), 50);
    const usage = aiUsage();
    const items = store.aiLogs.slice(0, limit).map((row) => ({
      id: row.id,
      model: row.model,
      tokens: row.tokens,
      createdAt: row.createdAt,
      noteTitle: row.noteTitle,
      promptPreview: row.prompt.slice(0, 160),
      responsePreview: row.response.slice(0, 280),
    }));
    return json({
      usage,
      items,
      nextCursor: store.aiLogs.length > limit ? items[items.length - 1]?.id ?? null : null,
    });
  }

  const aiLogMatch = pathOnly.match(/^ai\/logs\/([^/]+)$/);
  if (aiLogMatch && method === "GET") {
    const log = store.aiLogs.find((l) => l.id === aiLogMatch[1]);
    if (!log) return err("AI log not found", 404);
    return json({
      id: log.id,
      model: log.model,
      tokens: log.tokens,
      createdAt: log.createdAt,
      noteTitle: log.noteTitle,
      prompt: log.prompt,
      response: log.response,
    });
  }

  if (pathOnly === "ai/summarize" && method === "POST") {
    const body = parseBody(init);
    const noteId = String(body.noteId ?? "");
    const note = store.notes.find((n) => n.id === noteId);
    if (!note) return err("Note not found", 404);
    const plain = stripHtml(note.content);
    const summary = `**Portfolio demo summary** — "${note.title}": ${plain.slice(0, 400)}${plain.length > 400 ? "…" : ""}\n\n*(Generated locally — no OpenAI or backend required.)*`;
    const log = {
      id: `ailog-${Date.now()}`,
      model: "demo-offline",
      tokens: Math.min(512, Math.ceil(plain.length / 4)),
      createdAt: new Date().toISOString(),
      noteId: note.id,
      noteTitle: note.title,
      prompt: `Summarize note: ${note.title}`,
      response: summary.replace(/\*\*/g, ""),
    };
    store.addAiLog(log);
    return json({ summary: log.response, model: log.model, tokensUsed: log.tokens });
  }

  return err(`Mock API: ${method} ${pathOnly} not implemented`, 404);
}

/** Public shared note (no auth). */
export function getMockPublicNote(token: string) {
  const note = getDemoState().notes.find((n) => n.shareToken === token);
  if (!note) return null;
  return {
    title: note.title,
    content: note.content,
    format: note.format,
    updatedAt: note.updatedAt,
  };
}
