import Link from "next/link";
import { notFound } from "next/navigation";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type SharedNote = {
  title: string;
  content: string;
  format: string;
  updatedAt: string;
};

async function loadShared(token: string): Promise<SharedNote | null> {
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
        <p className="text-xs text-muted-foreground">Shared read-only · Peblo InfinityOS</p>
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
            : "Content is rendered as stored HTML (trusted workspace authors only). Public pages are read-only."}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-violet-400 hover:underline">
          ← Home
        </Link>
      </div>
    </article>
  );
}
