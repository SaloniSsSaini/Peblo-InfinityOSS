import Link from "next/link";
import {
  ArrowRight,
  FileText,
  GitBranch,
  Lock,
  Search,
  Sparkles,
  SquareCheck,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LandingWorkspacePreview } from "@/components/landing-workspace-preview";
import { Button } from "@/components/ui/button";

const apiDocsBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);

const stack = ["Next.js 16", "NestJS", "Prisma", "PostgreSQL", "JWT", "OpenAPI"];

const shipped = [
  {
    title: "Notes",
    description:
      "Rich editor, autosave, workspace search and tags, hierarchical list, public read-only share links.",
    icon: FileText,
  },
  {
    title: "Tasks",
    description: "Kanban by status, drag between columns, assignees from workspace members.",
    icon: SquareCheck,
  },
  {
    title: "AI",
    description:
      "Summarize any note (OpenAI or offline demo). Usage quota and full request history in AI hub.",
    icon: Sparkles,
  },
  {
    title: "Search & auth",
    description:
      "Global ⌘K search across notes and tasks. Email auth, workspaces, JWT API, Swagger docs.",
    icon: Search,
  },
];

const roadmap = [
  "Real-time collaboration (Yjs)",
  "Billing & Stripe tiers",
  "Learning modules (flashcards, quizzes)",
  "OAuth · SSO · enterprise controls",
];

export function LandingPage() {
  return (
    <div className="landing-shell relative flex min-h-screen flex-col">
      <div className="landing-backdrop pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <SiteHeader />

      <main className="relative flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_minmax(0,1.05fr)] lg:items-center lg:gap-10 lg:pb-24 lg:pt-16">
          <div className="max-w-xl">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              Workspace operating system
            </p>
            <h1 className="text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.03em] text-balance sm:text-5xl lg:text-[3.25rem]">
              Notes, tasks, and AI
              <span className="block text-zinc-500">in one typed stack.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-zinc-400 text-pretty sm:text-[1.05rem]">
              Peblo InfinityOS is a production monorepo — not a landing-page template. Ship
              work in workspace-scoped notes and tasks, run summarize with audit logs, and search
              everything from the shell.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="h-11 gap-2 rounded-lg bg-violet-600 px-6 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Open workspace
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
              <Link href="/auth/login?demo=1">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-lg border-zinc-700 bg-transparent text-sm text-zinc-300 hover:bg-white/5"
                >
                  Try demo
                </Button>
              </Link>
              <Link
                href={`${apiDocsBase}/docs`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
              >
                API reference
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap gap-2">
              {stack.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 font-mono text-[11px] text-zinc-400"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:justify-self-end lg:w-full lg:max-w-[540px]">
            <LandingWorkspacePreview />
            <p className="mt-3 text-center font-mono text-[10px] text-zinc-600 sm:text-left">
              Interface built from the shipping app — not a generic SaaS mockup.
            </p>
          </div>
        </section>

        {/* Shipped */}
        <section className="border-y border-zinc-800/80 bg-zinc-950/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-violet-400/90">
                  Shipping today
                </h2>
                <p className="mt-2 max-w-lg text-2xl font-semibold tracking-tight text-zinc-100">
                  Foundation you can run locally in minutes.
                </p>
              </div>
              <p className="max-w-xs text-sm text-zinc-500">
                No fake metrics. Every item below maps to code in this repository.
              </p>
            </div>

            <ul className="grid gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 sm:grid-cols-2">
              {shipped.map((item) => (
                <li
                  key={item.title}
                  className="flex gap-4 bg-zinc-950/90 p-6 transition-colors hover:bg-zinc-900/80"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-violet-400">
                    <item.icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Architecture */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
                Architecture
              </h2>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
                Monorepo shaped for teams who ship.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                  apps/web
                </code>{" "}
                talks to{" "}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                  apps/api
                </code>{" "}
                over REST with Prisma on PostgreSQL. Optional Redis backs cache and async mail.
                GraphQL and WebSockets are wired for extension — product routes come next.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono text-[11px] leading-relaxed text-zinc-500">
              <p className="text-zinc-600"># run locally</p>
              <p className="mt-2 text-zinc-400">npm run dev:all</p>
              <p className="mt-4 text-zinc-600"># deploy (Docker)</p>
              <p className="text-zinc-400">npm run deploy</p>
              <p className="mt-4 text-zinc-600"># health</p>
              <p>
                <span className="text-violet-400">GET</span> /api/health ·{" "}
                <span className="text-violet-400">GET</span> /api/notes ·{" "}
                <span className="text-violet-400">POST</span> /api/ai/summarize
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-xl border border-dashed border-zinc-800 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <GitBranch className="mt-0.5 size-4 shrink-0 text-zinc-600" aria-hidden />
              <div>
                <h3 className="text-sm font-medium text-zinc-300">On the roadmap</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {roadmap.map((item) => (
                    <li key={item} className="text-sm text-zinc-500">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-violet-950/40 to-zinc-950 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
            <div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Lock className="size-4" aria-hidden />
                <span className="text-sm">Self-host or run on your machine</span>
              </div>
              <p className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">
                Start with the demo workspace.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Register for your own space, or sign in with the seeded demo account.
              </p>
            </div>
            <Link href="/auth/register">
              <Button
                size="lg"
                className="h-11 shrink-0 rounded-lg bg-white px-6 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
              >
                Create account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
