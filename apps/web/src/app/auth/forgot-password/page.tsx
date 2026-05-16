"use client";

import Link from "next/link";
import { useState } from "react";
import { apiUrl } from "@/lib/api";
import { readApiError } from "@/lib/api-client";
import { isDemoMode } from "@/lib/demo-mode";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetUrl(null);
    if (isDemoMode()) {
      setMessage(
        "Password reset is not available in portfolio demo mode. Use the demo login on the sign-in page.",
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      const data = (await res.json()) as { message: string; resetUrl?: string };
      setMessage(data.message);
      if (data.resetUrl) setDevResetUrl(data.resetUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl dark:bg-black/40">
      <CardHeader>
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>
          Enter your email. We will send a reset link when email is configured; in local dev you
          may see a link on this page instead.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}
          {devResetUrl ? (
            <p className="break-all rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
              Dev reset link:{" "}
              <Link href={devResetUrl} className="text-violet-300 underline">
                open reset page
              </Link>
            </p>
          ) : null}
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
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            disabled={loading}
          >
            {loading ? "Sending…" : "Send reset link"}
          </Button>
          <Link
            href="/auth/login"
            className="text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to sign in
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
