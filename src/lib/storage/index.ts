/**
 * Storage Facade
 * ===============
 * Lớp trung gian truy cập dữ liệu JSON (Google Drive hoặc Local).
 * - Tự chọn backend theo biến môi trường (ưu tiên Google Drive).
 * - Mutex trong bộ nhớ cho từng collection (chống ghi đồng thời trong 1 instance).
 * - Optimistic locking + retry (chống mất dữ liệu giữa các instance serverless).
 * - Cache đọc ngắn hạn để giảm số lần gọi Drive API.
 */
import {
  COLLECTIONS,
  DEFAULT_KPI_WEIGHTS,
  DEFAULT_SITE_SUBTITLE,
  DEFAULT_SITE_TITLE,
  MAX_LOGIN_ATTEMPTS,
} from "@/lib/constants";
import type {
  AppNotification,
  AppSettings,
  AuditLog,
  Counters,
  MediaRecord,
  Post,
  SoftwareLink,
  Task,
  User,
  VideoItem,
} from "./types";
import { isDriveConfigured, driveBackend } from "./drive";
import { localBackend } from "./local";
import type { StorageBackend } from "./types";

export * from "./types";

/* ------------------------- Backend selection ------------------------- */

function pickBackend(): StorageBackend {
  try {
    if (isDriveConfigured()) return driveBackend;
  } catch {
    /* ignore */
  }
  return localBackend;
}

export function storageMode(): "drive" | "local" {
  return pickBackend().mode;
}

const backend: StorageBackend = pickBackend();

/* ------------------------- Mutex + Cache ------------------------- */

const mutexes = new Map<string, Promise<unknown>>();
function acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = mutexes.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  mutexes.set(
    key,
    next.catch(() => undefined)
  );
  return next;
}

interface CacheEntry {
  data: unknown;
  stamp: string;
  at: number;
}
const CACHE_TTL = 10_000; // 10 giây
const cache = new Map<string, CacheEntry>();

function invalidate(name: string) {
  cache.delete(name);
}

/* ------------------------- Core read / write ------------------------- */

/** Đọc collection (có cache ngắn) — không ghi */
export async function readCollection<T>(name: string): Promise<T | null> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data as T;
  const data = await backend.readJson<T>(name);
  if (data !== null) {
    const stamp = await backend.stamp(name);
    cache.set(name, { data, stamp, at: Date.now() });
  }
  return data;
}

/**
 * Cập nhật collection một cách an toàn (read → mutate → write với optimistic lock).
 * Mutator nhận object hiện tại (hoặc default nếu chưa tồn tại) và trả về giá trị cần trả.
 * Mutator có thể trả về symbol ABORT để chỉ đọc mà không ghi.
 */
export const ABORT = Symbol("abort");

export async function mutateCollection<T, R>(
  name: string,
  defaultValue: T,
  mutator: (current: T) => R | typeof ABORT
): Promise<R> {
  return acquire(name, async () => {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const cached = cache.get(name);
      let data: T;
      let stamp: string;
      if (cached && Date.now() - cached.at < CACHE_TTL) {
        data = cached.data as T;
        stamp = cached.stamp;
      } else {
        data = (await backend.readJson<T>(name)) ?? structuredClone(defaultValue);
        stamp = await backend.stamp(name);
        cache.set(name, { data, stamp, at: Date.now() });
      }
      const result = mutator(data);
      if (result === ABORT) {
        return undefined as unknown as R;
      }
      try {
        await backend.ensureFresh(name, stamp);
        await backend.writeJson(name, data);
        cache.set(name, { data, stamp: await backend.stamp(name), at: Date.now() });
        return result;
      } catch (err) {
        if (err instanceof StorageConflictError) {
          invalidate(name);
          lastErr = err;
          await new Promise((r) => setTimeout(r, 120 + Math.random() * 300));
          continue;
        }
        throw err;
      }
    }
    throw lastErr ?? new Error("Không ghi được dữ liệu sau nhiều lần thử");
  });
}

/* ------------------------- Defaults + Seed ------------------------- */

function defaultCounters(): Counters {
  return { taskSeq: 0, taskSeqYear: new Date().getFullYear(), seq: 0 };
}

export function defaultSettings(): AppSettings {
  return {
    siteTitle: process.env.SITE_TITLE || DEFAULT_SITE_TITLE,
    siteSubtitle: process.env.SITE_SUBTITLE || DEFAULT_SITE_SUBTITLE,
    allowSelfAssign: true,
    kpiWeights: { ...DEFAULT_KPI_WEIGHTS },
    logoMediaId: null,
    themePreset: "navy",
    primaryColor: "#1a3a5c",
    heroTitle: "HỆ THỐNG QUẢN LÝ PHÂN CÔNG NHIỆM VỤ KỸ THUẬT",
    heroSubtitle:
      "Tiếp nhận, phân công và theo dõi tiến độ các đề xuất nhiệm vụ kỹ thuật của cán bộ, công chức trong toàn Viện. Đánh giá KPI minh bạch, công bằng theo số liệu thực tế.",
    orgEmail: "admin@vien.gov.vn",
    orgPhone: "",
    orgAddress: "",
    footerText: "Bộ phận Kỹ thuật — Chỉ dùng cho mục đích công vụ",
    showNews: true,
    showVideos: true,
    showSoftware: true,
    allowRegistration: true,
    techRegCode: "KYTHUAT-2026",
    adminRegCode: "ADMIN-2026",
    updatedAt: new Date().toISOString(),
  };
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
export { newId };

let seeded = false;

export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  await acquire("seed", async () => {
    const users = await readCollection<User[]>(COLLECTIONS.USERS);
    if (users && users.length > 0) {
      seeded = true;
      return;
    }
    const bcrypt = (await import("bcryptjs")).default;
    const now = new Date().toISOString();
    const mkUser = (
      username: string,
      name: string,
      role: User["role"],
      department: string,
      title: string,
      password: string,
      cccd: string,
      email?: string
    ): User => ({
      id: newId("usr"),
      username,
      cccd,
      name,
      role,
      department,
      title,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      status: "active",
      failedAttempts: 0,
      lockUntil: null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    });

    const seedUsers: User[] = [
      mkUser("admin", "Quản trị viên hệ thống", "admin", "Văn phòng", "Chuyên viên", "Admin@123", "000000000001", "admin@vien.gov.vn"),
      mkUser("kythuat", "Nguyễn Văn Kỹ thuật", "technician", "Văn phòng", "Chuyên viên", "KyThuat@123", "000000000002", "kythuat@vien.gov.vn"),
      mkUser("kythuat2", "Trần Văn Bảo trì", "technician", "Văn phòng", "Chuyên viên", "KyThuat@123", "000000000003", "kythuat2@vien.gov.vn"),
      mkUser("nguoidung", "Lê Thị Công chức", "user", "Phòng 1", "Chuyên viên", "NguoiDung@123", "000000000004", "nguoidung@vien.gov.vn"),
    ];

    await backend.writeJson(COLLECTIONS.USERS, seedUsers);
    await backend.writeJson(COLLECTIONS.TASKS, [] as Task[]);
    await backend.writeJson(COLLECTIONS.NOTIFICATIONS, [] as AppNotification[]);
    await backend.writeJson(COLLECTIONS.AUDIT_LOGS, [] as AuditLog[]);
    await backend.writeJson(COLLECTIONS.COUNTERS, defaultCounters());
    await backend.writeJson(COLLECTIONS.SETTINGS, defaultSettings());
    Object.values(COLLECTIONS).forEach((c) => invalidate(c));
    seeded = true;
  });
}

/* ------------------------- Typed helpers ------------------------- */

// Users
export async function getUsers(): Promise<User[]> {
  await ensureSeed();
  return (await readCollection<User[]>(COLLECTIONS.USERS)) ?? [];
}
export async function updateUsers<R>(fn: (users: User[]) => R | typeof ABORT): Promise<R> {
  return mutateCollection<User[], R>(COLLECTIONS.USERS, [], fn);
}

// Tasks
export async function getTasks(): Promise<Task[]> {
  await ensureSeed();
  return (await readCollection<Task[]>(COLLECTIONS.TASKS)) ?? [];
}
export async function updateTasks<R>(fn: (tasks: Task[]) => R | typeof ABORT): Promise<R> {
  return mutateCollection<Task[], R>(COLLECTIONS.TASKS, [], fn);
}

// Notifications
export async function getNotifications(): Promise<AppNotification[]> {
  await ensureSeed();
  return (await readCollection<AppNotification[]>(COLLECTIONS.NOTIFICATIONS)) ?? [];
}
export async function updateNotifications<R>(
  fn: (list: AppNotification[]) => R | typeof ABORT
): Promise<R> {
  return mutateCollection<AppNotification[], R>(COLLECTIONS.NOTIFICATIONS, [], (list) => {
    const result = fn(list);
    // Giới hạn dung lượng: giữ tối đa 3000 thông báo mới nhất
    if (result !== ABORT && list.length > 3000) {
      list.splice(0, list.length - 3000);
    }
    return result;
  });
}

// Audit logs
export async function getAuditLogs(): Promise<AuditLog[]> {
  await ensureSeed();
  return (await readCollection<AuditLog[]>(COLLECTIONS.AUDIT_LOGS)) ?? [];
}
export async function updateAuditLogs<R>(
  fn: (list: AuditLog[]) => R | typeof ABORT
): Promise<R> {
  return mutateCollection<AuditLog[], R>(COLLECTIONS.AUDIT_LOGS, [], (list) => {
    const result = fn(list);
    if (result !== ABORT && list.length > 5000) {
      list.splice(0, list.length - 5000);
    }
    return result;
  });
}

// Counters — sinh mã nhiệm vụ CV-YYYY-NNNN
export async function nextTaskCode(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await mutateCollection<Counters, number>(
    COLLECTIONS.COUNTERS,
    defaultCounters(),
    (c) => {
      if (c.taskSeqYear !== year) {
        c.taskSeqYear = year;
        c.taskSeq = 0;
      }
      c.taskSeq += 1;
      c.seq += 1;
      return c.taskSeq;
    }
  );
  return `CV-${year}-${String(seq).padStart(4, "0")}`;
}

export async function nextSeq(): Promise<number> {
  return mutateCollection<Counters, number>(COLLECTIONS.COUNTERS, defaultCounters(), (c) => {
    c.seq += 1;
    return c.seq;
  });
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  await ensureSeed();
  const s = await readCollection<AppSettings>(COLLECTIONS.SETTINGS);
  if (!s) return defaultSettings();
  return {
    ...defaultSettings(),
    ...s,
    kpiWeights: { ...DEFAULT_KPI_WEIGHTS, ...(s.kpiWeights ?? {}) },
  };
}
export async function updateSettings<R>(
  fn: (s: AppSettings) => R | typeof ABORT
): Promise<R> {
  return mutateCollection<AppSettings, R>(COLLECTIONS.SETTINGS, defaultSettings(), fn);
}

/** Thời điểm đọc gần nhất (dùng cho optimistic update trong 1 lần gọi API) */
export async function readStamp(name: string): Promise<string> {
  return backend.stamp(name);
}

/* ------------------------- Nội dung công khai (tin/video/phần mềm) ------------------------- */

// Tin bài
export async function getPosts(): Promise<Post[]> {
  return (await readCollection<Post[]>(COLLECTIONS.POSTS)) ?? [];
}
export async function updatePosts<R>(fn: (list: Post[]) => R | typeof ABORT): Promise<R> {
  return mutateCollection<Post[], R>(COLLECTIONS.POSTS, [], fn);
}

// Video
export async function getVideos(): Promise<VideoItem[]> {
  return (await readCollection<VideoItem[]>(COLLECTIONS.VIDEOS)) ?? [];
}
export async function updateVideos<R>(fn: (list: VideoItem[]) => R | typeof ABORT): Promise<R> {
  return mutateCollection<VideoItem[], R>(COLLECTIONS.VIDEOS, [], fn);
}

// Phần mềm chuyên ngành
export async function getSoftware(): Promise<SoftwareLink[]> {
  return (await readCollection<SoftwareLink[]>(COLLECTIONS.SOFTWARE)) ?? [];
}
export async function updateSoftware<R>(fn: (list: SoftwareLink[]) => R | typeof ABORT): Promise<R> {
  return mutateCollection<SoftwareLink[], R>(COLLECTIONS.SOFTWARE, [], fn);
}

/**
 * Danh sách id media được phép truy cập công khai (logo, ảnh bìa tin bài).
 * Dùng để bảo vệ /api/media/[id]: không rò rỉ tệp đính kèm nhiệm vụ.
 */
export async function publicMediaIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    const s = await getSettings();
    if (s.logoMediaId) ids.add(s.logoMediaId);
  } catch { /* ignore */ }
  try {
    const posts = await getPosts();
    for (const p of posts) if (p.coverMediaId) ids.add(p.coverMediaId);
  } catch { /* ignore */ }
  return ids;
}

// Media registry (metadata ảnh upload)
export async function getMediaRecords(): Promise<MediaRecord[]> {
  return (await readCollection<MediaRecord[]>(COLLECTIONS.MEDIA)) ?? [];
}
export async function updateMediaRecords<R>(
  fn: (list: MediaRecord[]) => R | typeof ABORT
): Promise<R> {
  return mutateCollection<MediaRecord[], R>(COLLECTIONS.MEDIA, [], fn);
}
export async function findMediaRecord(id: string): Promise<MediaRecord | null> {
  const list = await getMediaRecords();
  return list.find((m) => m.id === id) ?? null;
}

/* ------------------------- Attachments ------------------------- */

export async function saveAttachment(file: {
  name: string;
  mime: string;
  buffer: Buffer;
}): Promise<AttachmentMeta> {
  return backend.saveAttachment(file);
}

export async function getAttachment(meta: AttachmentMeta) {
  return backend.getAttachment(meta);
}

/** Trạng thái backend hiện tại (dùng hiển thị) */
export function currentBackendMode(): "drive" | "local" {
  return backend.mode;
}
