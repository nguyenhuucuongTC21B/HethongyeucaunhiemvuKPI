"use client";

/** Helper gọi API phía client — ném lỗi tiếng Việt rõ ràng */
export async function api<T = unknown>(
  url: string,
  options?: RequestInit & { json?: unknown; form?: FormData }
): Promise<T> {
  const { json, form, ...rest } = options ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest?.headers ?? {}),
    },
    body:
      json !== undefined
        ? JSON.stringify(json)
        : form instanceof FormData
          ? form
          : rest?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as { error?: string; fields?: Record<string, string> }).error ||
        `Lỗi máy chủ (HTTP ${res.status})`
    ) as Error & { status?: number; fields?: Record<string, string> };
    err.status = res.status;
    err.fields = (data as { fields?: Record<string, string> }).fields;
    throw err;
  }
  return data as T;
}

// Định dạng ngày/giá trị — dùng chung với server component (nguồn thật ở lib/format)
export { formatDateTime, formatDate, formatBytes, toLocalInputValue } from "@/lib/format";
