import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <p className="font-mono text-[11px] text-zinc-600">
          Peblo InfinityOS · TypeScript monorepo · {new Date().getFullYear()}
        </p>
        <nav className="flex flex-wrap justify-center gap-5 text-xs text-zinc-500">
          <Link href="/pricing" className="hover:text-zinc-300">
            Pricing
          </Link>
          <Link href="/dashboard" className="hover:text-zinc-300">
            App
          </Link>
          <Link href="/auth/login" className="hover:text-zinc-300">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
