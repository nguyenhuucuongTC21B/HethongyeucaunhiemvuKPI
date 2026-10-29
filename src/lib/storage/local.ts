/**
 * Local File Storage Backend (fallback)
 * =======================================
 * Dùng khi chưa cấu hình Google Drive (môi trường dev/preview).
 * Dữ liệu lưu tại thư mục data/ (không commit lên git).
 * Trên Vercel bắt buộc phải cấu hình Google Drive vì filesystem là read-only.
 */
import { promises as fs } from "fs";
import path from "path";
import type { AttachmentMeta, StorageBackend } from "./types";
import { StorageConflictError } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const ATTACH_DIR = path.join(DATA_DIR, "attachments");

const jsonPath = (name: string) => path.join(DATA_DIR, `${name}.json`);
const stampMap = new Map<string, string>();

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(ATTACH_DIR, { recursive: true });
}

export const localBackend: StorageBackend = {
  mode: "local",

  async readJson<T>(name: string): Promise<T | null> {
    try {
      const text = await fs.readFile(jsonPath(name), "utf-8");
      if (!text.trim()) return null;
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  },

  async writeJson<T>(name: string, data: T): Promise<void> {
    await ensureDirs();
    await fs.writeFile(jsonPath(name), JSON.stringify(data, null, 2), "utf-8");
    stampMap.set(name, Date.now().toString());
  },

  async stamp(name: string): Promise<string> {
    try {
      const st = await fs.stat(jsonPath(name));
      return st.mtimeMs.toString();
    } catch {
      return stampMap.get(name) ?? "absent";
    }
  },

  async ensureFresh(name: string, readStamp: string): Promise<void> {
    const current = await this.stamp(name);
    if (current !== readStamp) throw new StorageConflictError(name);
  },

  async saveAttachment(file: { name: string; mime: string; buffer: Buffer }): Promise<AttachmentMeta> {
    await ensureDirs();
    const id = crypto.randomUUID();
    await fs.writeFile(path.join(ATTACH_DIR, id), file.buffer);
    return { id, name: file.name, mime: file.mime || "application/octet-stream", size: file.buffer.length };
  },

  async getAttachment(meta: AttachmentMeta) {
    const buffer = await fs.readFile(path.join(ATTACH_DIR, meta.id));
    return { buffer, mime: meta.mime, name: meta.name };
  },
};
