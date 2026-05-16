import { apiUrl } from "./api";
import { isDemoMode } from "./demo-mode";
import { handleMockApi } from "./mock-api";
import { useAuthStore } from "@/stores/auth-store";

export async function apiFetch(path: string, init: RequestInit = {}) {
  if (isDemoMode()) {
    return handleMockApi(path.replace(/^\/?api\/?/, "").replace(/^\//, ""), init);
  }

  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    init.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(apiUrl(path), { ...init, headers });
  return res;
}

export async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(", ");
    if (typeof data.message === "string") return data.message;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}
