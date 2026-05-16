"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckSquare2, FileText, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, readApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

type SearchNoteHit = {
  type: "note";
  id: string;
  title: string;
  snippet: string;
  tags: string[];
  updatedAt: string;
};

type SearchTaskHit = {
  type: "task";
  id: string;
  title: string;
  snippet: string;
  status: string;
  updatedAt: string;
};

type SearchResponse = {
  query: string;
  notes: SearchNoteHit[];
  tasks: SearchTaskHit[];
};

type GlobalSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const workspaceId = useAuthStore((s) => s.currentWorkspaceId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebounced("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["global-search", workspaceId, debounced],
    queryFn: async () => {
      const params = new URLSearchParams({
        workspaceId: workspaceId!,
        q: debounced,
        limit: "8",
      });
      const res = await apiFetch(`/search?${params}`);
      if (!res.ok) throw new Error(await readApiError(res));
      return (await res.json()) as SearchResponse;
    },
    enabled: open && !!workspaceId && debounced.length >= 2,
  });

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const goToNote = useCallback(
    (id: string) => {
      const q = debounced ? `&q=${encodeURIComponent(debounced)}` : "";
      close();
      router.push(`/dashboard/notes?noteId=${encodeURIComponent(id)}${q}`);
    },
    [close, router, debounced],
  );

  const goToTask = useCallback(
    (id: string) => {
      close();
      router.push(`/dashboard/tasks?taskId=${encodeURIComponent(id)}`);
    },
    [close, router],
  );

  if (!open) return null;

  const total = (data?.notes.length ?? 0) + (data?.tasks.length ?? 0);
  const showHint = debounced.length < 2;
  const showEmpty = !showHint && !isFetching && total === 0 && !isError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search workspace"
        className="flex max-h-[min(70vh,560px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes and tasks…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            aria-label="Close search"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!workspaceId ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Select a workspace to search.
            </p>
          ) : null}
          {showHint && workspaceId ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters. Shortcut: <kbd className="rounded bg-white/10 px-1">Ctrl</kbd>+
              <kbd className="rounded bg-white/10 px-1">K</kbd>
            </p>
          ) : null}
          {isFetching ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </p>
          ) : null}
          {isError ? (
            <p className="px-2 py-4 text-center text-sm text-red-300">
              {error instanceof Error ? error.message : "Search failed"}
            </p>
          ) : null}
          {showEmpty ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No results for &quot;{debounced}&quot;
            </p>
          ) : null}

          {data?.notes.length ? (
            <section className="mb-3">
              <h3 className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </h3>
              <ul className="space-y-0.5">
                {data.notes.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/10"
                      onClick={() => goToNote(hit.id)}
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-violet-400" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{hit.title}</span>
                        {hit.snippet ? (
                          <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {hit.snippet}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data?.tasks.length ? (
            <section>
              <h3 className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tasks
              </h3>
              <ul className="space-y-0.5">
                {data.tasks.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/10"
                      onClick={() => goToTask(hit.id)}
                    >
                      <CheckSquare2 className="mt-0.5 size-4 shrink-0 text-fuchsia-400" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{hit.title}</span>
                          <span className="shrink-0 rounded bg-white/10 px-1 py-0.5 text-[10px] text-muted-foreground">
                            {hit.status.replace(/_/g, " ")}
                          </span>
                        </span>
                        {hit.snippet ? (
                          <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {hit.snippet}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

