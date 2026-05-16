"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiUrl } from "@/lib/api";
import { readApiError } from "@/lib/api-client";
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

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      const data = (await res.json()) as {
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
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        workspaces: data.workspaces,
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl dark:bg-black/40">
      <CardHeader>
        <CardTitle className="text-xl">Create account</CardTitle>
        <CardDescription>Personal workspace is created automatically.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="name">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className="flex h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              Password (min 8)
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
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
            {loading ? "Creating…" : "Create account"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-violet-300 hover:underline">
              Sign in
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
