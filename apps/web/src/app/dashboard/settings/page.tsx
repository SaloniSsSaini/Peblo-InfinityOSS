"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch, readApiError } from "@/lib/api-client";
import { useAuthStore, type AuthWorkspace } from "@/stores/auth-store";

function ProfileCard({
  userId,
  initialName,
  initialAvatar,
  onSaved,
}: {
  userId: string;
  initialName: string;
  initialAvatar: string;
  onSaved: (data: {
    user: { id: string; email: string; name: string | null; avatarUrl: string | null };
    workspaces: AuthWorkspace[];
  }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    setProfileBusy(true);
    try {
      const res = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name, avatarUrl }),
      });
      if (!res.ok) {
        setProfileErr(await readApiError(res));
        return;
      }
      const data = (await res.json()) as {
        user: { id: string; email: string; name: string | null; avatarUrl: string | null };
        workspaces: AuthWorkspace[];
      };
      onSaved(data);
      setProfileMsg("Profile saved.");
    } finally {
      setProfileBusy(false);
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>Display name and optional avatar URL (https).</CardDescription>
      </CardHeader>
      <form onSubmit={saveProfile}>
        <CardContent className="space-y-4">
          {profileErr ? (
            <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
              {profileErr}
            </p>
          ) : null}
          {profileMsg ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">
              {profileMsg}
            </p>
          ) : null}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`name-${userId}`}>
              Name
            </label>
            <input
              id={`name-${userId}`}
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`avatar-${userId}`}>
              Avatar URL
            </label>
            <input
              id={`avatar-${userId}`}
              type="url"
              placeholder="https://…"
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={profileBusy} className="rounded-lg">
            {profileBusy ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [pwdBusy, setPwdBusy] = useState(false);

  function onProfileSaved(data: {
    user: { id: string; email: string; name: string | null; avatarUrl: string | null };
    workspaces: AuthWorkspace[];
  }) {
    setSession({
      accessToken,
      refreshToken,
      user: data.user,
      workspaces: data.workspaces,
    });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    setPwdErr(null);
    if (newPassword !== confirmPassword) {
      setPwdErr("New passwords do not match");
      return;
    }
    setPwdBusy(true);
    try {
      const res = await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        setPwdErr(await readApiError(res));
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdMsg("Password updated.");
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <DashboardShell>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profile and password for {user.email}
          </p>
        </div>

        <ProfileCard
          key={`${user.id}-${user.name ?? ""}-${user.avatarUrl ?? ""}`}
          userId={user.id}
          initialName={user.name ?? ""}
          initialAvatar={user.avatarUrl ?? ""}
          onSaved={onProfileSaved}
        />

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-base">Password</CardTitle>
            <CardDescription>Change your password while signed in.</CardDescription>
          </CardHeader>
          <form onSubmit={changePassword}>
            <CardContent className="space-y-4">
              {pwdErr ? (
                <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
                  {pwdErr}
                </p>
              ) : null}
              {pwdMsg ? (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">
                  {pwdMsg}
                </p>
              ) : null}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="current">
                  Current password
                </label>
                <input
                  id="current"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="new">
                  New password
                </label>
                <input
                  id="new"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="confirm">
                  Confirm new password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm outline-none ring-violet-500/30 focus:ring-2"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={pwdBusy} variant="secondary" className="rounded-lg">
                {pwdBusy ? "Updating…" : "Change password"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </main>
    </DashboardShell>
  );
}
