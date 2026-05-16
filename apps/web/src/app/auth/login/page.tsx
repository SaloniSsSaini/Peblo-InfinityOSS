"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { readApiError } from "@/lib/api-client";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  isDemoLoginUiEnabled,
} from "@/lib/demo-credentials";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string | null; avatarUrl: string | null };
  workspaces: {
    id: string;
    name: string;
    slug: string;
    type: string;
    role: string;
    updatedAt?: string;
  }[];
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function completeLogin(payload: { email: string; password: string }) {
    const res = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return await readApiError(res);
    }
    const data = (await res.json()) as LoginResponse;
    setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      workspaces: data.workspaces,
    });
    router.push("/dashboard");
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const err = await completeLogin({ email, password });
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function onDemoSignIn() {
    setError(null);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setLoading(true);
    try {
      const err = await completeLogin({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  }

  function onFillDemo() {
    setError(null);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  }

  useEffect(() => {
    if (!isDemoLoginUiEnabled()) return;
    const d = searchParams.get("demo");
    if (d !== "1" && d !== "fill") return;
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  }, [searchParams]);

  return (
    <Card className="w-full max-w-md border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl dark:bg-black/40">
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Peblo InfinityOS — production-ready stack.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {isDemoLoginUiEnabled() && (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-50/95">
              <p className="font-medium text-emerald-100">Demo account (try the app)</p>
              <p className="mt-1 font-mono text-xs leading-relaxed text-emerald-100/90">
                <span className="text-emerald-200/80">Email</span> {DEMO_EMAIL}
                <br />
                <span className="text-emerald-200/80">Password</span> {DEMO_PASSWORD}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-md border border-white/15 bg-white/10 text-emerald-50 hover:bg-white/15"
                  onClick={onFillDemo}
                  disabled={loading}
                >
                  Fill credentials
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => void onDemoSignIn()}
                  disabled={loading}
                >
                  Sign in as demo
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-emerald-100/70">
                Tip: <span className="font-mono">/auth/login?demo=1</span> pre-fills this form (after DB seed). Use{" "}
                <strong>Sign in as demo</strong> to continue.
              </p>
            </div>
          )}
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="flex h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="flex h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Continue"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/auth/forgot-password" className="text-violet-300 hover:underline">
              Forgot password?
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            No account?{" "}
            <Link href="/auth/register" className="text-violet-300 hover:underline">
              Register
            </Link>
          </p>
          <Link href="/" className="text-center text-xs text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl dark:bg-black/40">
          <CardHeader>
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
