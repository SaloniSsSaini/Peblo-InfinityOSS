/** Frontend-only portfolio demo — no backend or database required when enabled. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "0";
}
