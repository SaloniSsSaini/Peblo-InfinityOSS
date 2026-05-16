"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckSquare2,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AtmosphereBackground } from "@/components/atmosphere-background";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

const nav = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: FileText, label: "Notes", href: "/dashboard/notes" },
  { icon: CheckSquare2, label: "Tasks", href: "/dashboard/tasks" },
  { icon: Sparkles, label: "AI hub", href: "/dashboard/ai" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const workspaces = useAuthStore((s) => s.workspaces);
  const currentWorkspaceId = useAuthStore((s) => s.currentWorkspaceId);
  const setWorkspace = useAuthStore((s) => s.setCurrentWorkspaceId);
  const logout = useAuthStore((s) => s.logout);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative flex min-h-screen bg-background">
      <AtmosphereBackground variant="app" />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-black/30 backdrop-blur-xl dark:bg-black/40 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-bold text-white">
            ∞
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold">{user.name || user.email}</p>
            <p className="text-[10px] text-muted-foreground">Workspace</p>
          </div>
        </div>

        <div className="border-b border-white/10 px-3 py-2">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Space
          </label>
          <select
            className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-xs outline-none focus:ring-2 focus:ring-violet-500/40"
            value={currentWorkspaceId ?? ""}
            onChange={(e) => setWorkspace(e.target.value || null)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {nav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <item.icon className="size-4 opacity-80" />
                {item.label}
                {active && <ChevronRight className="ml-auto size-4 opacity-50" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/auth/login");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <LogOut className="size-4" />
            Log out
          </button>
          <Link
            href="/"
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <Settings className="size-4" />
            Marketing site
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-background/80 px-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="relative hidden h-10 max-w-md flex-1 items-center rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-16 text-left text-sm text-muted-foreground outline-none ring-violet-500/30 hover:bg-white/[0.07] focus:ring-2 md:flex"
            aria-label="Search notes and tasks"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            Search notes and tasks…
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              Ctrl K
            </kbd>
          </button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="md:hidden border-white/15 bg-white/5"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard/notes">
              <Button
                size="sm"
                className="gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
              >
                <Plus className="size-3.5" />
                Note
              </Button>
            </Link>
          </div>
        </header>
        {children}
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
