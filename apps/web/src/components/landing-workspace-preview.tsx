/**
 * Static product frame — mirrors the real dashboard shell (not a stock mockup).
 */
export function LandingWorkspacePreview() {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_-20px_rgba(88,28,135,0.35)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/40 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-500/80" />
        <span className="size-2.5 rounded-full bg-amber-500/80" />
        <span className="size-2.5 rounded-full bg-emerald-500/80" />
        <span className="ml-2 font-mono text-[10px] text-zinc-500">localhost:3000/dashboard</span>
      </div>

      <div className="flex h-[min(340px,52vw)] min-h-[280px]">
        <aside className="hidden w-[148px] shrink-0 border-r border-white/10 bg-black/30 p-2 sm:block">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="flex size-7 items-center justify-center rounded-lg bg-violet-600 text-[10px] font-bold text-white">
              ∞
            </span>
            <span className="text-[11px] font-medium text-zinc-300">Demo space</span>
          </div>
          <nav className="space-y-0.5 text-[11px]">
            {["Notes", "Tasks", "AI hub"].map((item, i) => (
              <div
                key={item}
                className={`rounded-md px-2 py-1.5 ${i === 0 ? "bg-white/10 text-white" : "text-zinc-500"}`}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 items-center gap-2 border-b border-white/10 px-3">
            <div className="h-6 max-w-[200px] flex-1 rounded-md bg-white/5 px-2 font-mono text-[10px] leading-6 text-zinc-500">
              ⌘K search…
            </div>
            <span className="rounded bg-violet-600/90 px-2 py-0.5 text-[10px] font-medium text-white">
              + Note
            </span>
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="w-[38%] shrink-0 border-r border-white/10 p-2">
              <p className="mb-2 px-1 text-[9px] font-medium uppercase tracking-wider text-zinc-600">
                Notes
              </p>
              {["Q2 planning", "API design", "Investor memo"].map((title, i) => (
                <div
                  key={title}
                  className={`mb-1 rounded-md px-2 py-1.5 text-[11px] ${i === 0 ? "bg-violet-500/15 text-violet-100" : "text-zinc-500"}`}
                >
                  {title}
                </div>
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col p-3">
              <p className="text-sm font-semibold tracking-tight text-zinc-100">Q2 planning</p>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                Workspace-scoped notes with TipTap, tag filters, public read-only links, and
                per-note AI summarize.
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                <span className="rounded border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] text-violet-200">
                  #planning
                </span>
                <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                  #product
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
