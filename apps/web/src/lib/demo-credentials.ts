/** Defaults must stay in sync with `apps/api/prisma/seed.js` for local dev. */
export const DEMO_EMAIL =
  process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "demo@peblo.infinityos.app";

export const DEMO_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "DemoInfinity2026!";

export function isDemoLoginUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HIDE_DEMO_LOGIN !== "1";
}
