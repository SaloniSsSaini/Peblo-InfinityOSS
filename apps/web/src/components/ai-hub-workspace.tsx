"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch, readApiError } from "@/lib/api-client";

type AiUsage = {
  usedLast24h: number;
  limit: number;
  remaining: number;
  windowHours: number;
};

type AiLogListItem = {
  id: string;
  model: string;
  tokens: number | null;
  createdAt: string;
  noteTitle: string | null;
  promptPreview: string;
  responsePreview: string;
};

type AiLogsPage = {
  usage: AiUsage;
  items: AiLogListItem[];
  nextCursor: string | null;
};

type AiLogDetail = {
  id: string;
  model: string;
  tokens: number | null;
  createdAt: string;
  noteTitle: string | null;
  prompt: string;
  response: string;
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function UsageCards({ usage }: { usage: AiUsage }) {
  const pct = usage.limit > 0 ? Math.min(100, (usage.usedLast24h / usage.limit) * 100) : 0;
  const nearLimit = usage.remaining <= Math.max(3, Math.floor(usage.limit * 0.1));

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="border-white/10 bg-white/[0.03]">
        <CardHeader className="pb-2">
          <CardDescription>Used (last {usage.windowHours}h)</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{usage.usedLast24h}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="border-white/10 bg-white/[0.03]">
        <CardHeader className="pb-2">
          <CardDescription>Daily limit</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{usage.limit}</CardTitle>
        </CardHeader>
      </Card>
      <Card
        className={`border-white/10 bg-white/[0.03] ${nearLimit ? "ring-1 ring-amber-500/40" : ""}`}
      >
        <CardHeader className="pb-2">
          <CardDescription>Remaining</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{usage.remaining}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${nearLimit ? "bg-amber-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogRow({ item }: { item: AiLogListItem }) {
  const [open, setOpen] = useState(false);
  const detail = useQuery({
    queryKey: ["ai-log", item.id],
    queryFn: async () => {
      const res = await apiFetch(`/ai/logs/${item.id}`);
      if (!res.ok) throw new Error(await readApiError(res));
      return (await res.json()) as AiLogDetail;
    },
    enabled: open,
  });

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        className="flex w-full items-start gap-2 px-3 py-3 text-left text-sm hover:bg-white/[0.03]"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{item.noteTitle ?? "Note summary"}</span>
            <span className="text-xs text-muted-foreground">{formatWhen(item.createdAt)}</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {item.model}
            </span>
            {item.tokens != null ? (
              <span className="text-[10px] text-muted-foreground">{item.tokens} tokens</span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.responsePreview}</p>
        </div>
      </button>
      {open ? (
        <div className="border-t border-white/10 px-3 py-3 text-xs">
          {detail.isLoading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </p>
          ) : null}
          {detail.isError ? (
            <p className="text-red-300">
              {detail.error instanceof Error ? detail.error.message : "Failed to load"}
            </p>
          ) : null}
          {detail.data ? (
            <div className="space-y-3">
              <div>
                <p className="mb-1 font-medium text-muted-foreground">Summary</p>
                <pre className="whitespace-pre-wrap rounded-lg bg-black/20 p-2 text-[11px] leading-relaxed">
                  {detail.data.response}
                </pre>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground">Prompt excerpt</p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-2 text-[11px] leading-relaxed text-muted-foreground">
                  {detail.data.prompt}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AiHubWorkspace() {
  const logs = useInfiniteQuery({
    queryKey: ["ai-logs"],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "20" });
      if (pageParam) params.set("cursor", String(pageParam));
      const res = await apiFetch(`/ai/logs?${params}`);
      if (!res.ok) throw new Error(await readApiError(res));
      return (await res.json()) as AiLogsPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const usage = logs.data?.pages[0]?.usage;
  const items = logs.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles className="size-5 text-fuchsia-400" aria-hidden />
            AI hub
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Summarize notes from{" "}
            <Link href="/dashboard/notes" className="text-violet-300 underline hover:text-violet-200">
              Notes
            </Link>
            . History and quota below (rolling 24h window).
          </p>
        </div>
        <Link
          href="/dashboard/notes"
          className="inline-flex h-9 items-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-medium text-white hover:opacity-95"
        >
          Open notes
        </Link>
      </div>

      {logs.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading usage…
        </p>
      ) : null}
      {logs.isError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
          {logs.error instanceof Error ? logs.error.message : "Failed to load AI data"}
        </p>
      ) : null}
      {usage ? <UsageCards usage={usage} /> : null}

      <Card className="border-white/10 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-base">Activity history</CardTitle>
          <CardDescription>
            Each summarize request is stored in AiLog. Expand a row for the full summary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && !logs.isLoading ? (
            <p className="text-sm text-muted-foreground">
              No AI activity yet. Run &quot;AI summarize&quot; on a note to see entries here.
            </p>
          ) : null}
          {items.map((item) => (
            <LogRow key={item.id} item={item} />
          ))}
          {logs.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full border-white/15 bg-transparent"
              disabled={logs.isFetchingNextPage}
              onClick={() => void logs.fetchNextPage()}
            >
              {logs.isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}