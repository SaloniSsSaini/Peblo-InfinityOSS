import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-credentials";
import type { AuthUser, AuthWorkspace } from "@/stores/auth-store";

export const DEMO_WORKSPACE_ID = "ws-demo-infinity";
export const DEMO_USER_ID = "user-demo-1";
export const DEMO_ACCESS_TOKEN = "demo-portfolio-session";
export const DEMO_PUBLIC_SHARE_TOKEN = "peblo-demo-public-welcome";

export function isValidDemoCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase() && password === DEMO_PASSWORD
  );
}

export function createDemoSession(): {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  workspaces: AuthWorkspace[];
} {
  return {
    accessToken: DEMO_ACCESS_TOKEN,
    refreshToken: "demo-portfolio-refresh",
    user: {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      name: "Demo visitor",
      avatarUrl: null,
    },
    workspaces: [
      {
        id: DEMO_WORKSPACE_ID,
        name: "Infinity Demo Workspace",
        slug: "infinity-demo",
        type: "STARTUP",
        role: "OWNER",
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}
