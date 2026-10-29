/**
 * Google Drive Storage Backend
 * =============================
 * Lưu trữ toàn bộ dữ liệu phẳng (file JSON) vĩnh viễn trên Google Drive.
 *
 * Hỗ trợ 2 phương thức xác thực (chọn qua biến môi trường):
 *  1. Service Account  : GOOGLE_SERVICE_ACCOUNT_JSON (JSON nguyên bản hoặc base64)
 *                        + GOOGLE_DRIVE_FOLDER_ID (thư mục được chia sẻ cho email của SA)
 *  2. OAuth Refresh    : GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN
 *                        + GOOGLE_DRIVE_FOLDER_ID
 *
 * Drive REST API v3 — không cần SDK, chỉ dùng fetch + jose (ký JWT RS256).
 */
import { SignJWT, importPKCS8 } from "jose";
import type { AttachmentMeta, StorageBackend } from "./types";
import { StorageConflictError } from "./types";

const SCOPE = "https://www.googleapis.com/auth/drive";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/* ------------------------- Token quản lý ------------------------- */

interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

function getServiceAccountJson(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const decoded = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf-8");
    const obj = JSON.parse(decoded);
    if (obj.client_email && obj.private_key) {
      return { client_email: obj.client_email, private_key: String(obj.private_key).replace(/\\n/g, "\n") };
    }
    return null;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  let body: URLSearchParams;

  const sa = getServiceAccountJson();
  if (sa) {
    // Service Account: JWT bearer grant
    const now = Math.floor(Date.now() / 1000);
    const pk = await importPKCS8(sa.private_key, "RS256");
    const assertion = await new SignJWT({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .sign(pk);
    body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });
  } else if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  ) {
    body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    });
  } else {
    throw new Error(
      "Chưa cấu hình Google Drive: cần GOOGLE_SERVICE_ACCOUNT_JSON hoặc (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN)"
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lỗi lấy Google access token: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return tokenCache.token;
}

export function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID) &&
    (Boolean(getServiceAccountJson()) ||
      Boolean(
        process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_SECRET &&
          process.env.GOOGLE_REFRESH_TOKEN
      ));
}

/* ------------------------- Drive REST helpers ------------------------- */

const FOLDER_ID = () => process.env.GOOGLE_DRIVE_FOLDER_ID as string;

async function driveFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

interface DriveFileMeta {
  id: string;
  name: string;
  headRevisionId?: string;
  modifiedTime?: string;
}

/** Tìm file theo tên trong thư mục (trả về null nếu chưa có) */
async function findFile(name: string): Promise<DriveFileMeta | null> {
  const q = encodeURIComponent(
    `name = '${name}.json' and '${FOLDER_ID()}' in parents and trashed = false`
  );
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,headRevisionId,modifiedTime)&pageSize=5&orderBy=modifiedTime desc`
  );
  if (!res.ok) throw new Error(`Drive search lỗi: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { files?: DriveFileMeta[] };
  return json.files && json.files.length > 0 ? json.files[0] : null;
}

export const driveBackend: StorageBackend = {
  mode: "drive",

  async readJson<T>(name: string): Promise<T | null> {
    const meta = await findFile(name);
    if (!meta) return null;
    const res = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${meta.id}?alt=media`
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Drive read lỗi: ${res.status} ${await res.text()}`);
    const text = await res.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`File ${name}.json trên Drive bị hỏng định dạng JSON`);
    }
  },

  async writeJson<T>(name: string, data: T): Promise<void> {
    const meta = await findFile(name);
    const bodyText = JSON.stringify(data, null, 2);
    if (meta) {
      const res = await driveFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${meta.id}?uploadType=media`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json; charset=UTF-8" },
          body: bodyText,
        }
      );
      if (!res.ok) throw new Error(`Drive write lỗi: ${res.status} ${await res.text()}`);
    } else {
      // Tạo file mới với metadata + media (multipart)
      const boundary = "zboundary" + Date.now();
      const metadata = JSON.stringify({
        name: `${name}.json`,
        parents: [FOLDER_ID()],
        mimeType: "application/json",
      });
      const payload =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${bodyText}\r\n--${boundary}--`;
      const res = await driveFetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
          body: payload,
        }
      );
      if (!res.ok) throw new Error(`Drive create lỗi: ${res.status} ${await res.text()}`);
    }
  },

  async stamp(name: string): Promise<string> {
    const meta = await findFile(name);
    return meta ? meta.headRevisionId ?? meta.modifiedTime ?? meta.id : "absent";
  },

  async ensureFresh(name: string, readStamp: string): Promise<void> {
    const current = await this.stamp(name);
    if (current !== readStamp) throw new StorageConflictError(name);
  },

  async saveAttachment(file: { name: string; mime: string; buffer: Buffer }): Promise<AttachmentMeta> {
    const id = crypto.randomUUID();
    const safeName = `${id}_${file.name}`.replace(/[\r\n"\\]/g, "_");
    const boundary = "zboundary" + Date.now();
    const metadata = JSON.stringify({ name: safeName, parents: [FOLDER_ID()] });
    const payload =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${file.mime || "application/octet-stream"}\r\n\r\n`;
    const tail = `\r\n--${boundary}--`;
    const body = Buffer.concat([
      Buffer.from(payload, "utf-8"),
      file.buffer,
      Buffer.from(tail, "utf-8"),
    ]);
    const res = await driveFetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: new Uint8Array(body),
      }
    );
    if (!res.ok) throw new Error(`Drive upload lỗi: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { id: string };
    return {
      id: json.id,
      name: file.name,
      mime: file.mime || "application/octet-stream",
      size: file.buffer.length,
    };
  },

  async getAttachment(meta: AttachmentMeta) {
    const res = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${meta.id}?alt=media`
    );
    if (!res.ok) throw new Error(`Drive download lỗi: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, mime: meta.mime, name: meta.name };
  },
};
