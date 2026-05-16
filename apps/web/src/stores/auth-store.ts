import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export type AuthWorkspace = {
  id: string;
  name: string;
  slug: string;
  type: string;
  role: string;
  updatedAt?: string;
};

type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  workspaces: AuthWorkspace[];
};

type AuthState = SessionPayload & {
  currentWorkspaceId: string | null;
  setSession: (p: SessionPayload) => void;
  setCurrentWorkspaceId: (id: string | null) => void;
  logout: () => void;
};

const emptyUser: AuthUser = { id: "", email: "", name: null, avatarUrl: null };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: "",
      refreshToken: "",
      user: emptyUser,
      workspaces: [],
      currentWorkspaceId: null,
      setSession: (p) =>
        set({
          accessToken: p.accessToken,
          refreshToken: p.refreshToken,
          user: p.user,
          workspaces: p.workspaces,
          currentWorkspaceId: p.workspaces[0]?.id ?? null,
        }),
      setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),
      logout: () =>
        set({
          accessToken: "",
          refreshToken: "",
          user: emptyUser,
          workspaces: [],
          currentWorkspaceId: null,
        }),
    }),
    {
      name: "peblo-infinityos-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
        workspaces: s.workspaces,
        currentWorkspaceId: s.currentWorkspaceId,
      }),
    },
  ),
);

export function useHydratedAuth() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}
