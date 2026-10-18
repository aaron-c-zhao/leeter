export interface SyncErrorBody {
  error: { kind?: string; message: string };
}

export class ApiError extends Error {
  kind?: string;
  status: number;
  constructor(status: number, body: SyncErrorBody) {
    super(body.error.message);
    this.kind = body.error.kind;
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    let body: SyncErrorBody = { error: { message: `HTTP ${res.status}` } };
    try {
      body = (await res.json()) as SyncErrorBody;
    } catch {
      // keep default
    }
    throw new ApiError(res.status, body);
  }
  return (await res.json()) as T;
}
