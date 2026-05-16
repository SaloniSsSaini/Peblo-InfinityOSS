"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthNav } from "@/components/auth-nav";
import { Button } from "@/components/ui/button";

const apiDocsBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);

const links = [
  { href: "/pricing", label: "Pricing" },
  { href: `${apiDocsBase}/docs`, label: "API", external: true },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">
            ∞
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">Peblo</span>
          <span className="hidden font-mono text-[10px] text-zinc-600 sm:inline">InfinityOS</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) =>
            l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          <AuthNav />
          <ThemeToggle />
          <Link href="/dashboard">
            <Button
              size="sm"
              className="hidden rounded-lg bg-violet-600 text-white hover:bg-violet-500 sm:inline-flex"
            >
              Workspace
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
