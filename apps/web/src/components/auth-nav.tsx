"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isDemoLoginUiEnabled } from "@/lib/demo-credentials";
import { useAuthStore, useHydratedAuth } from "@/stores/auth-store";

export function AuthNav() {
  const hydrated = useHydratedAuth();
  const token = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  if (!hydrated) {
    return <span className="inline-block w-20" />;
  }

  if (token) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button size="sm" variant="outline" className="rounded-lg border-white/15">
            Dashboard
          </Button>
        </Link>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-lg text-muted-foreground"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          Log out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isDemoLoginUiEnabled() && (
        <Link href="/auth/login?demo=1">
          <Button size="sm" variant="outline" className="rounded-lg border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10">
            Demo
          </Button>
        </Link>
      )}
      <Link href="/auth/login">
        <Button size="sm" variant="ghost" className="rounded-lg text-muted-foreground">
          Sign in
        </Button>
      </Link>
      <Link href="/auth/register">
        <Button size="sm" variant="outline" className="rounded-lg border-white/15">
          Register
        </Button>
      </Link>
    </div>
  );
}
