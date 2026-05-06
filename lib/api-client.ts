export type ApiEnvelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  requestId: string;
};

export async function postApi<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      if (!response.ok) throw new Error(text);
    }
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Request failed");
  }

  if (!payload) {
    throw new Error("Empty API response");
  }

  if (payload.error) {
    throw new Error(payload.error.message || "Request failed");
  }

  if (payload.data === null) {
    throw new Error("Missing data in API response");
  }

  return payload.data;
}
