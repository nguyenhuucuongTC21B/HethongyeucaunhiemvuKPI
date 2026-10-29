/**
 * Audit log & Thông báo
 */
import type { AppNotification, AuditLog, Task, User } from "@/lib/storage";
import {
  getNotifications,
  getUsers,
  newId,
  updateAuditLogs,
  updateNotifications,
} from "@/lib/storage";

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "unknown"
  );
}

/** Ghi một dòng audit log (không bao giờ làm lỗi request chính) */
export async function writeAudit(entry: {
  actor?: Pick<User, "id" | "name"> | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  detail?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}): Promise<void> {
  try {
    const log: AuditLog = {
      id: newId("aud"),
      actorId: entry.actor?.id ?? "system",
      actorName: entry.actor?.name ?? entry.actorName ?? "Hệ thống",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      detail: entry.detail,
      before: entry.before ?? undefined,
      after: entry.after ?? undefined,
      ip: entry.ip,
      createdAt: new Date().toISOString(),
    };
    await updateAuditLogs((list) => {
      list.push(log);
      return true;
    });
  } catch (err) {
    console.error("[audit] ghi log thất bại:", err);
  }
}

/** Tạo thông báo in-app cho 1 người dùng */
async function pushNotification(n: Omit<AppNotification, "id" | "read" | "createdAt">) {
  const item: AppNotification = {
    ...n,
    id: newId("ntf"),
    read: false,
    createdAt: new Date().toISOString(),
  };
  await updateNotifications((list) => {
    list.push(item);
    return true;
  });
  await sendMailForNotification(item).catch(() => undefined);
}

/** Phát thông báo tới nhiều người dùng theo vai trò hoặc id */
export async function notifyUsers(
  userIds: string[],
  payload: Omit<AppNotification, "id" | "read" | "createdAt" | "userId">
) {
  await Promise.all(userIds.map((userId) => pushNotification({ ...payload, userId })));
}

export async function notifyRoles(
  roles: string[],
  payload: Omit<AppNotification, "id" | "read" | "createdAt" | "userId">,
  exclude: string[] = []
) {
  const users = await getUsers();
  const targets = users.filter((u) => roles.includes(u.role) && !exclude.includes(u.id));
  await notifyUsers(
    targets.map((u) => u.id),
    payload
  );
}

export async function notifyTaskCreated(task: Task) {
  await notifyRoles(["technician", "admin"], {
    type: "task_created",
    title: "Nhiệm vụ mới cần tiếp nhận",
    message: `${task.requesterName} (${task.department}) đã gửi đề xuất ${task.code}: ${task.title}`,
    taskId: task.id,
  });
}

export async function notifyTaskAssigned(task: Task, byName: string) {
  if (!task.assigneeId) return;
  await notifyUsers([task.assigneeId], {
    type: "task_assigned",
    title: "Bạn được phân công nhiệm vụ mới",
    message: `${byName} đã phân công nhiệm vụ ${task.code} cho bạn: ${task.title}`,
    taskId: task.id,
  });
}

export async function notifyTaskStatus(
  task: Task,
  to: string,
  byName: string,
  note?: string
) {
  const message = `Nhiệm vụ ${task.code} đã chuyển sang trạng thái "${to}" bởi ${byName}${note ? `. Ghi chú: ${note}` : ""}`;
  const targets = new Set<string>([task.requesterId]);
  if (task.assigneeId && task.assigneeId !== byName) targets.add(task.assigneeId);
  await notifyUsers([...targets], {
    type: "task_status",
    title: "Cập nhật trạng thái nhiệm vụ",
    message,
    taskId: task.id,
  });
}

export async function notifyTaskRated(task: Task) {
  if (!task.assigneeId || !task.rating) return;
  await notifyUsers([task.assigneeId], {
    type: "task_rated",
    title: "Nhiệm vụ được đánh giá",
    message: `Nhiệm vụ ${task.code} nhận ${task.rating.stars}/5 sao từ ${task.requesterName}${task.rating.comment ? `: ${task.rating.comment}` : ""}`,
    taskId: task.id,
  });
}

/* ------------------------- Email (tùy chọn SMTP) ------------------------- */

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

export function mailRecipientsEnabled(): boolean {
  return isMailConfigured() && process.env.SMTP_ENABLE !== "false";
}

async function sendMailForNotification(n: AppNotification) {
  if (!mailRecipientsEnabled()) return;
  const users = await getUsers();
  const to = users.find((u) => u.id === n.userId)?.email;
  if (!to) return;
  await sendMail({
    to,
    subject: `[Hệ thống QLNV] ${n.title}`,
    text: `${n.message}\n\nĐây là email tự động từ Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI.`,
  });
}

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  if (!isMailConfigured()) {
    console.log(`[mail:chưa cấu hình] -> ${opts.to}: ${opts.subject}`);
    return;
  }
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "hethong@vien.gov.vn",
    ...opts,
  });
}
