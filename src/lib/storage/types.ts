import type { KpiWeights, Role, TaskStatus, Urgency } from "@/lib/constants";

/* ========================= Models ========================= */

export interface User {
  id: string;
  username: string;
  cccd: string;
  name: string;
  role: Role;
  department: string;
  title: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  status: "active" | "locked";
  failedAttempts: number;
  lockUntil: string | null;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
}

export interface StatusEvent {
  from: TaskStatus | null;
  to: TaskStatus;
  byId: string;
  byName: string;
  note?: string;
  at: string;
}

export interface TaskRating {
  stars: number;
  comment?: string;
  at: string;
}

export interface Task {
  id: string;
  code: string;
  type: string;
  requesterId: string;
  requesterName: string;
  department: string;
  /** Chức danh người đề xuất */
  position: string;
  cccd: string;
  legalBasis?: string;
  title: string;
  description: string;
  urgency: Urgency;
  desiredDeadline?: string | null;
  location?: string;
  phone: string;
  email?: string;
  attachments: TaskAttachment[];
  notes?: string;
  status: TaskStatus;
  assigneeId?: string | null;
  assigneeName?: string;
  assignedAt?: string | null;
  assignedBy?: string | null;
  history: StatusEvent[];
  createdAt: string;
  updatedAt: string;
  receivedAt?: string | null;
  completedAt?: string | null;
  rating?: TaskRating | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | "task_created"
    | "task_assigned"
    | "task_status"
    | "task_rated"
    | "account"
    | "system";
  title: string;
  message: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  detail?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  createdAt: string;
}

export interface Counters {
  taskSeq: number;
  taskSeqYear: number;
  seq: number;
}

export interface AppSettings {
  siteTitle: string;
  siteSubtitle: string;
  allowSelfAssign: boolean;
  kpiWeights: KpiWeights;
  /* --- Giao diện & nhận diện (Admin chỉnh trong /admin/appearance) --- */
  logoMediaId?: string | null;
  themePreset?: "navy" | "crimson" | "custom";
  primaryColor?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  orgEmail?: string;
  orgPhone?: string;
  orgAddress?: string;
  footerText?: string;
  showNews?: boolean;
  showVideos?: boolean;
  showSoftware?: boolean;
  allowRegistration?: boolean;
  techRegCode?: string;
  adminRegCode?: string;
  updatedAt: string;
}

/* ========================= Nội dung công khai ========================= */

/** Tin bài / thông báo do Admin đăng */
export interface Post {
  id: string;
  title: string;
  summary: string;
  content: string;
  category?: string;
  coverMediaId?: string | null;
  pinned?: boolean;
  published: boolean;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

/** Video hướng dẫn / truyền thông (link YouTube) */
export interface VideoItem {
  id: string;
  title: string;
  description?: string;
  youtubeUrl: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Link phần mềm chuyên ngành */
export interface SoftwareLink {
  id: string;
  name: string;
  description?: string;
  url: string;
  category?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Metadata ảnh media công khai (logo, ảnh bìa) */
export interface MediaRecord extends AttachmentMeta {
  uploadedBy?: string;
  createdAt: string;
}

/* ========================= Storage backend ========================= */

export interface AttachmentMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
}

export interface StorageBackend {
  mode: "drive" | "local";
  /** Đọc toàn bộ nội dung file JSON, trả về null nếu chưa tồn tại */
  readJson<T>(name: string): Promise<T | null>;
  /** Ghi toàn bộ nội dung file JSON (tạo mới nếu chưa có) */
  writeJson<T>(name: string, data: T): Promise<void>;
  /**
   * Kiểm tra tính toàn vẹn trước khi ghi: ném StorageConflictError
   * nếu file đã bị sửa bởi tiến trình khác sau khi ta đọc (optimistic locking).
   */
  ensureFresh(name: string, readStamp: string): Promise<void>;
  /** Lấy dấu vết phiên bản hiện tại của file (revision / mtime) */
  stamp(name: string): Promise<string>;
  /** Lưu tệp đính kèm, trả về metadata */
  saveAttachment(file: { name: string; mime: string; buffer: Buffer }): Promise<AttachmentMeta>;
  /** Đọc tệp đính kèm theo metadata */
  getAttachment(meta: AttachmentMeta): Promise<{ buffer: Buffer; mime: string; name: string }>;
}

export class StorageConflictError extends Error {
  constructor(name: string) {
    super(`Conflict writing ${name}`);
    this.name = "StorageConflictError";
  }
}
