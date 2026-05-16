"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore, useHydratedAuth } from "@/stores/auth-store";

export function DashboardAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useHydratedAuth();
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/auth/login");
    }
  }, [hydrated, token, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return <>{children}</>;
}
