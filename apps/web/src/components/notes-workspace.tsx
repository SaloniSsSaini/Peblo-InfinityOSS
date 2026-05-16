"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  FileText,
  Folder,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, readApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";

type NoteListItem = {
  id: string;
  title: string;
  format: string;
  folderPath: string;
  parentId: string | null;
  tags: string[];
  updatedAt: string;
};

type NoteDetail = NoteListItem & { content: string; shareToken?: string | null };

type TreeNode = { note: NoteListItem; children: TreeNode[] };

function buildTree(notes: NoteListItem[]): TreeNode[] {
  const byParent = new Map<string | null, NoteListItem[]>();
  for (const n of notes) {
    const p = n.parentId ?? null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(n);
  }
  for (const [, arr] of byParent) {
    arr.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }
  const walk = (parentId: string | null): TreeNode[] =>
    (byParent.get(parentId) ?? []).map((note) => ({
      note,
      children: walk(note.id),
    }));
  return walk(null);
}

function ancestorIds(notes: NoteListItem[], targetId: string): Set<string> {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const s = new Set<string>();
  let cur = byId.get(targetId);
  while (cur?.parentId) {
    s.add(cur.parentId);
    cur = byId.get(cur.parentId);
  }
  return s;
}

/** Descendant note ids (not including rootId). */
function collectDescendantIds(notes: NoteListItem[], rootId: string): Set<string> {
  const byParent = new Map<string | null, string[]>();
  for (const n of notes) {
    const p = n.parentId ?? null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(n.id);
  }
  const out = new Set<string>();
  const stack = [...(byParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    out.add(id);
    stack.push(...(byParent.get(id) ?? []));
  }
  return out;
}

function NoteTree({
  nodes,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  nodes: TreeNode[];
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {nodes.map(({ note, children }) => {
        const hasKids = children.length > 0;
        const isOpen = expanded.has(note.id);
        return (
          <div
            key={note.id}
            role="treeitem"
            aria-expanded={hasKids ? isOpen : undefined}
            aria-selected={note.id === selectedId}
          >
            <div
              className="flex min-h-9 items-stretch gap-0.5 rounded-lg"
              style={{ paddingLeft: depth * 10 }}
            >
              {hasKids ? (
                <button
                  type="button"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                  className="flex w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(note.id);
                  }}
                >
                  {isOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
              ) : (
                <span className="w-7 shrink-0" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => onSelect(note.id)}
                className={`flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                  note.id === selectedId
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {hasKids ? (
                  <Folder className="mt-0.5 size-3.5 shrink-0 text-amber-200/80" aria-hidden />
                ) : (
                  <FileText className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-medium">{note.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {note.folderPath}
                  </span>
                </span>
              </button>
            </div>
            {hasKids && isOpen ? (
              <NoteTree
                nodes={children}
                depth={depth + 1}
                selectedId={selectedId}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function NotesWorkspace() {
  const searchParams = useSearchParams();
  const workspaceId = useAuthStore((s) => s.currentWorkspaceId);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [lastSummary, setLastSummary] = useState<{ noteId: string; text: string } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [mdDraft, setMdDraft] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailIdRef = useRef<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const tagTrim = tagFilter.trim();
  const filterActive = Boolean(debouncedSearch || tagTrim);

  const { data: notes = [], isFetching: listLoading } = useQuery({
    queryKey: ["notes", workspaceId, debouncedSearch, tagTrim],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId: workspaceId! });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (tagTrim) params.set("tag", tagTrim);
      const res = await apiFetch(`/notes?${params.toString()}`);
      if (!res.ok) throw new Error(await readApiError(res));
      return (await res.json()) as NoteListItem[];
    },
    enabled: !!workspaceId,
  });

  useEffect(() => {
    const noteId = searchParams.get("noteId");
    const q = searchParams.get("q");
    if (q) setSearchInput(q);
    if (!noteId) return;
    setSelectedId(noteId);
    if (notes.some((n) => n.id === noteId)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const id of ancestorIds(notes, noteId)) next.add(id);
        return next;
      });
    }
  }, [searchParams, notes]);

  const tree = useMemo(() => buildTree(notes), [notes]);

  const detailId = useMemo(() => {
    if (!notes.length) return null;
    if (selectedId && notes.some((n) => n.id === selectedId)) return selectedId;
    return notes[0].id;
  }, [notes, selectedId]);

  useEffect(() => {
    detailIdRef.current = detailId;
  }, [detailId]);

  const selectNote = useCallback(
    (id: string) => {
      setSelectedId(id);
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const aid of ancestorIds(notes, id)) {
          next.add(aid);
        }
        return next;
      });
    },
    [notes],
  );

  const summaryDisplay =
    lastSummary && detailId && lastSummary.noteId === detailId ? lastSummary.text : null;

  const { data: activeNote, isFetching: noteLoading } = useQuery({
    queryKey: ["note", detailId],
    queryFn: async () => {
      const res = await apiFetch(`/notes/${detailId}`);
      if (!res.ok) throw new Error(await readApiError(res));
      return (await res.json()) as NoteDetail;
    },
    enabled: !!detailId,
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "peblo-editor min-h-[280px] max-w-none px-3 py-3 text-sm leading-relaxed text-foreground focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const id = detailIdRef.current;
      if (!id) return;
      const html = editor.getHTML();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        saveTimer.current = null;
        const res = await apiFetch(`/notes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ content: html }),
        });
        if (res.ok) {
          const ws = useAuthStore.getState().currentWorkspaceId;
          void queryClient.invalidateQueries({ queryKey: ["notes", ws] });
        }
      }, 750);
    },
  });

  useEffect(() => {
    if (!activeNote) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset title/tags when switching notes
    setTitleDraft(activeNote.title);
    setTagDraft(activeNote.tags.join(", "));
  }, [activeNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- only when note id changes

  useEffect(() => {
    if (!activeNote || activeNote.format !== "MARKDOWN") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset markdown when note or format changes
    setMdDraft(activeNote.content ?? "");
  }, [activeNote?.id, activeNote?.format]); // eslint-disable-line react-hooks/exhaustive-deps -- only when id or format changes

  useEffect(() => {
    if (!editor || !activeNote || activeNote.format === "MARKDOWN") return;
    editor.commands.setContent(activeNote.content || "<p></p>", { emitUpdate: false });
  }, [editor, activeNote]);

  const saveMarkdownDebounced = useCallback(
    (html: string) => {
      const id = detailIdRef.current;
      if (!id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        saveTimer.current = null;
        const res = await apiFetch(`/notes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ content: html }),
        });
        if (res.ok) {
          const ws = useAuthStore.getState().currentWorkspaceId;
          void queryClient.invalidateQueries({ queryKey: ["notes", ws] });
        }
      }, 750);
    },
    [queryClient],
  );

  const createNote = useCallback(
    async (parentId?: string | null) => {
      if (!workspaceId) return;
      const body: Record<string, unknown> = {
        title: "Untitled note",
        content: "<p></p>",
        format: "RICH",
      };
      if (parentId != null && parentId !== "") body.parentId = parentId;
      const res = await apiFetch(`/notes?workspaceId=${workspaceId}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert(await readApiError(res));
        return;
      }
      const created = (await res.json()) as NoteDetail;
      await queryClient.invalidateQueries({ queryKey: ["notes", workspaceId] });
      selectNote(created.id);
    },
    [workspaceId, queryClient, selectNote],
  );

  const createFolder = useCallback(
    async (parentId?: string | null) => {
      if (!workspaceId) return;
      const body: Record<string, unknown> = {
        title: "Untitled folder",
        content: "",
        format: "RICH",
      };
      if (parentId != null && parentId !== "") body.parentId = parentId;
      const res = await apiFetch(`/notes?workspaceId=${workspaceId}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert(await readApiError(res));
        return;
      }
      const created = (await res.json()) as NoteDetail;
      await queryClient.invalidateQueries({ queryKey: ["notes", workspaceId] });
      selectNote(created.id);
    },
    [workspaceId, queryClient, selectNote],
  );

  const saveTitle = useCallback(async () => {
    if (!detailId || !activeNote) return;
    if (titleDraft === activeNote.title) return;
    const res = await apiFetch(`/notes/${detailId}`, {
      method: "PATCH",
      body: JSON.stringify({ title: titleDraft }),
    });
    if (res.ok) {
      void queryClient.invalidateQueries({ queryKey: ["notes", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["note", detailId] });
    }
  }, [detailId, activeNote, titleDraft, workspaceId, queryClient]);

  const saveTags = useCallback(async () => {
    if (!detailId || !activeNote) return;
    const parseTagList = (raw: string) =>
      [...new Set(raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(
        0,
        20,
      );
    const next = parseTagList(tagDraft);
    const prevKey = [...activeNote.tags].map((t) => t.toLowerCase()).sort().join("\0");
    const nextKey = [...next].sort().join("\0");
    if (prevKey === nextKey) return;
    const res = await apiFetch(`/notes/${detailId}`, {
      method: "PATCH",
      body: JSON.stringify({ tags: next }),
    });
    if (res.ok) {
      void queryClient.invalidateQueries({ queryKey: ["notes", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["note", detailId] });
    }
  }, [detailId, activeNote, tagDraft, workspaceId, queryClient]);

  const changeFormat = useCallback(
    async (format: "RICH" | "MARKDOWN") => {
      if (!detailId || !activeNote || format === activeNote.format) return;
      const res = await apiFetch(`/notes/${detailId}`, {
        method: "PATCH",
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        alert(await readApiError(res));
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["notes", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["note", detailId] });
    },
    [detailId, activeNote, workspaceId, queryClient],
  );

  const changeParent = useCallback(
    async (nextParent: string | "") => {
      if (!detailId || !activeNote) return;
      const body =
        nextParent === "" ? { parentId: null } : { parentId: nextParent };
      const res = await apiFetch(`/notes/${detailId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert(await readApiError(res));
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["notes", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["note", detailId] });
      if (nextParent) {
        setExpanded((prev) => new Set(prev).add(nextParent));
      }
    },
    [detailId, activeNote, workspaceId, queryClient],
  );

  const forbiddenMoveTargets = useMemo(() => {
    if (!detailId) return new Set<string>();
    const d = collectDescendantIds(notes, detailId);
    d.add(detailId);
    return d;
  }, [notes, detailId]);

  const copyPublicLink = useCallback(
    async (regenerate: boolean) => {
      if (!detailId) return;
      setShareBusy(true);
      try {
        const res = await apiFetch(`/notes/${detailId}/share`, {
          method: "POST",
          body: JSON.stringify({ regenerate }),
        });
        if (!res.ok) {
          alert(await readApiError(res));
          return;
        }
        const { shareToken } = (await res.json()) as { shareToken: string };
        const url = `${window.location.origin}/p/${encodeURIComponent(shareToken)}`;
        await navigator.clipboard.writeText(url);
        alert(`Copied:\n${url}`);
        void queryClient.invalidateQueries({ queryKey: ["note", detailId] });
      } finally {
        setShareBusy(false);
      }
    },
    [detailId, queryClient],
  );

  const revokePublicLink = useCallback(async () => {
    if (!detailId || !activeNote?.shareToken) return;
    if (!window.confirm("Remove public link for this note?")) return;
    const res = await apiFetch(`/notes/${detailId}/share`, { method: "DELETE" });
    if (!res.ok) {
      alert(await readApiError(res));
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["note", detailId] });
  }, [detailId, activeNote?.shareToken, queryClient]);

  const runSummarize = useCallback(async () => {
    if (!detailId) return;
    setSummaryLoading(true);
    try {
      const res = await apiFetch("/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ noteId: detailId }),
      });
      if (!res.ok) {
        alert(await readApiError(res));
        return;
      }
      const data = (await res.json()) as {
        summary: string;
        model: string;
        tokensUsed?: number | null;
      };
      const tok = data.tokensUsed != null ? ` · tokens ${data.tokensUsed}` : "";
      setLastSummary({
        noteId: detailId,
        text: `${data.summary}\n\n— ${data.model}${tok}`,
      });
      void queryClient.invalidateQueries({ queryKey: ["ai-logs"] });
    } finally {
      setSummaryLoading(false);
    }
  }, [detailId, queryClient]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!workspaceId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No workspace selected. Log in again if this stays empty.
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:p-6">
      <aside className="flex w-full shrink-0 flex-col gap-2 sm:w-56 lg:w-72">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Notes</h2>
          <div className="flex flex-wrap justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-lg border-white/15 px-2"
              title="New note at workspace root"
              onClick={() => void createNote(null)}
            >
              <FilePlus className="size-3.5" />
              <span className="hidden sm:inline">New</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-lg border-white/15 px-2 disabled:opacity-40"
              title="New note inside the note selected in the tree"
              disabled={!selectedId}
              onClick={() => void createNote(selectedId)}
            >
              <FilePlus className="size-3.5" />
              <span className="hidden sm:inline">In</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-lg border-white/15 px-2"
              title={
                selectedId
                  ? "New folder inside the note selected in the tree"
                  : "New folder at workspace root"
              }
              onClick={() => void createFolder(selectedId)}
            >
              <Folder className="size-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground/80">New</span> = root.{" "}
          <span className="font-medium text-foreground/80">In</span> nests under the selected note.
        </p>
        <div className="flex flex-col gap-2">
          <input
            type="search"
            aria-label="Search notes"
            placeholder="Search title or body…"
            className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs outline-none ring-violet-500/30 placeholder:text-muted-foreground focus:ring-2"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <input
            aria-label="Filter by tag"
            placeholder="Tag (exact match)"
            className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs outline-none ring-violet-500/30 placeholder:text-muted-foreground focus:ring-2"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
        </div>
        <div
          className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-1"
          role="tree"
          aria-label="Notes tree"
        >
          {listLoading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </div>
          ) : notes.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">No notes yet.</p>
          ) : filterActive ? (
            notes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => selectNote(n.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  n.id === detailId
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <span className="line-clamp-2 font-medium">{n.title}</span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {n.folderPath}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {new Date(n.updatedAt).toLocaleString()}
                </span>
              </button>
            ))
          ) : (
            <NoteTree
              nodes={tree}
              depth={0}
              selectedId={detailId}
              expanded={expanded}
              onToggle={toggleExpanded}
              onSelect={selectNote}
            />
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => void saveTitle()}
            placeholder="Title"
            disabled={!detailId}
          />
          {noteLoading && (
            <RefreshCw className="size-4 animate-spin text-muted-foreground" aria-hidden />
          )}
        </div>
        {detailId && activeNote ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground" htmlFor="note-format">
                Format
              </label>
              <select
                id="note-format"
                className="h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-xs outline-none ring-violet-500/30 focus:ring-2"
                value={activeNote.format}
                onChange={(e) =>
                  void changeFormat(e.target.value as "RICH" | "MARKDOWN")
                }
              >
                <option value="RICH">Rich text</option>
                <option value="MARKDOWN">Markdown</option>
              </select>
            </div>
            <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground" htmlFor="note-parent">
                Location (parent)
              </label>
              <select
                id="note-parent"
                className="h-9 w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-2 text-xs outline-none ring-violet-500/30 focus:ring-2"
                value={activeNote.parentId ?? ""}
                onChange={(e) => void changeParent(e.target.value as string | "")}
              >
                <option value="">Workspace root</option>
                {notes
                  .filter((n) => !forbiddenMoveTargets.has(n.id))
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.folderPath === "/" ? n.title : `${n.folderPath}`}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor="note-tags">
            Tags (comma-separated, saved on blur)
          </label>
          <input
            id="note-tags"
            className="h-9 w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-3 text-xs outline-none ring-violet-500/30 focus:ring-2"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onBlur={() => void saveTags()}
            placeholder="e.g. idea, meeting"
            disabled={!detailId || !activeNote}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 rounded-lg border-white/15 text-xs"
            disabled={!detailId || shareBusy || !activeNote}
            onClick={() => void copyPublicLink(false)}
          >
            <Link2 className="size-3.5" aria-hidden />
            {activeNote?.shareToken ? "Copy public link" : "Create public link"}
          </Button>
          {activeNote?.shareToken ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-amber-500/30 text-xs text-amber-100"
                disabled={shareBusy}
                onClick={() => void copyPublicLink(true)}
              >
                New link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                disabled={shareBusy}
                onClick={() => void revokePublicLink()}
              >
                Revoke link
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1 rounded-lg bg-violet-900/40 text-xs text-violet-100 hover:bg-violet-900/60"
            disabled={!detailId || summaryLoading}
            onClick={() => void runSummarize()}
          >
            {summaryLoading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-3.5" aria-hidden />
            )}
            AI summarize
          </Button>
        </div>
        {summaryDisplay ? (
          <div className="whitespace-pre-wrap rounded-lg border border-violet-500/25 bg-violet-950/30 px-3 py-2 text-xs leading-relaxed text-violet-50/95">
            {summaryDisplay}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {!detailId || !activeNote ? (
            <p className="p-4 text-sm text-muted-foreground">Select a note to edit.</p>
          ) : activeNote.format === "MARKDOWN" ? (
            <textarea
              className="peblo-editor min-h-[280px] w-full resize-y bg-transparent px-3 py-3 font-mono text-sm leading-relaxed text-foreground outline-none"
              value={mdDraft}
              onChange={(e) => {
                const v = e.target.value;
                setMdDraft(v);
                saveMarkdownDebounced(v);
              }}
              spellCheck={false}
              aria-label="Markdown content"
            />
          ) : editor ? (
            <EditorContent editor={editor} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Loading editor…</p>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Autosave: content syncs ~0.75s after you stop typing. Title saves on blur. Folder path
          updates from the tree.
        </p>
      </section>
    </main>
  );
}
