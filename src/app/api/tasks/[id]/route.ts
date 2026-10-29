import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/audit";
import { TASK_STATUS, STATUS_TRANSITIONS } from "@/lib/constants";
import { getSettings, getTasks, updateTasks } from "@/lib/storage";
import type { Task } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: chi tiết nhiệm vụ */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const { id } = await params;
  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "Không tìm thấy nhiệm vụ" }, { status: 404 });

  const settings = await getSettings();
  const allowed =
    user.role === "admin" ||
    task.requesterId === user.id ||
    task.assigneeId === user.id ||
    (user.role === "technician" && settings.allowSelfAssign && !task.assigneeId);
  if (!allowed) return NextResponse.json({ error: "Không có quyền xem nhiệm vụ này" }, { status: 403 });

  // Các trạng thái chuyển đổi được cho phép với người dùng hiện tại
  let transitions: string[] = [];
  if (user.role === "admin" || (user.role === "technician" && task.assigneeId === user.id)) {
    transitions = STATUS_TRANSITIONS[task.status] ?? [];
  }
  return NextResponse.json({ task, transitions, allowSelfAssign: settings.allowSelfAssign });
}

/** PATCH: sửa nhiệm vụ (chỉ Admin) — có audit log */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên được sửa nhiệm vụ" }, { status: 403 });
  const { id } = await params;
  const ip = clientIp(req);

  const body = (await req.json()) as Partial<Task>;
  const editable = [
    "type", "title", "description", "urgency", "department", "location",
    "phone", "email", "desiredDeadline", "legalBasis", "notes",
  ] as const;

  let before: Task | undefined;
  let after: Task | undefined;

  const result = await updateTasks<{ ok: boolean }>((list) => {
    const task = list.find((t) => t.id === id);
    if (!task) throw new Error("Không tìm thấy nhiệm vụ");
    before = structuredClone(task);
    for (const key of editable) {
      if (body[key] !== undefined) {
        (task as unknown as Record<string, unknown>)[key] = body[key];
      }
    }
    task.updatedAt = new Date().toISOString();
    after = structuredClone(task);
    return { ok: true };
  });

  await writeAudit({
    actor: user,
    action: "task_update",
    entityType: "task",
    entityId: id,
    detail: `Sửa nhiệm vụ ${before?.code ?? id}`,
    before,
    after,
    ip,
  });
  return NextResponse.json(result);
}

/** DELETE: xóa nhiệm vụ (chỉ Admin) — có audit log */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên được xóa nhiệm vụ" }, { status: 403 });
  const { id } = await params;
  const ip = clientIp(req);

  let removed: Task | undefined;
  await updateTasks((list) => {
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Không tìm thấy nhiệm vụ");
    removed = list[idx];
    list.splice(idx, 1);
    return true;
  });

  await writeAudit({
    actor: user,
    action: "task_delete",
    entityType: "task",
    entityId: id,
    detail: `Xóa nhiệm vụ ${removed?.code ?? id}: ${removed?.title ?? ""}`,
    before: removed,
    ip,
  });
  return NextResponse.json({ ok: true });
}
