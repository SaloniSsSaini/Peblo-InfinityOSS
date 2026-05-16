import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_PUBLIC_SHARE_TOKEN } from "@/lib/demo-auth";
import { isDemoMode } from "@/lib/demo-mode";
import { getMockPublicNote } from "@/lib/mock-api";
import { createInitialDemoState } from "@/lib/mock-data";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type SharedNote = {
  title: string;
  content: string;
  format: string;
  updatedAt: string;
};

async function loadShared(token: string): Promise<SharedNote | null> {
  if (isDemoMode()) {
    const fromStore = getMockPublicNote(token);
    if (fromStore) return fromStore;
    const seed = createInitialDemoState().notes.find((n) => n.shareToken === token);
    if (!seed) return null;
    return {
      title: seed.title,
      content: seed.content,
      format: seed.format,
      updatedAt: seed.updatedAt,
    };
  }

  const url = `${apiBase.replace(/\/$/, "")}/api/public/notes/${encodeURIComponent(token)}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as SharedNote;
}

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await loadShared(token);
  if (!data) notFound();

  return (
    <article className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs text-muted-foreground">
          Shared read-only · Peblo InfinityOS
          {isDemoMode() ? " · portfolio demo" : ""}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{data.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Updated {new Date(data.updatedAt).toLocaleString()}
        </p>
        {data.format === "MARKDOWN" ? (
          <pre className="peblo-editor mt-6 max-w-none whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-sm leading-relaxed">
            {data.content}
          </pre>
        ) : (
          <div
            className="peblo-editor mt-6 max-w-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: data.content }}
          />
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">
          {data.format === "MARKDOWN"
            ? "Markdown source (read-only)."
            : "Rich text (read-only)."}
        </p>
        <p className="mt-6">
          <Link href="/auth/login" className="text-sm text-violet-300 hover:underline">
            Sign in to edit in your workspace
          </Link>
          {token === DEMO_PUBLIC_SHARE_TOKEN ? (
            <>
              {" "}
              ·{" "}
              <Link href="/" className="text-sm text-violet-300 hover:underline">
                Home
              </Link>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}
