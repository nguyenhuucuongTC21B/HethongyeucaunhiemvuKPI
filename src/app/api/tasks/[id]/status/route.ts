import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, notifyTaskStatus, writeAudit } from "@/lib/audit";
import { STATUS_TRANSITIONS, TASK_STATUS } from "@/lib/constants";
import { getTasks, updateTasks } from "@/lib/storage";
import type { StatusEvent, Task, TaskStatus } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST: đổi trạng thái nhiệm vụ (Kỹ thuật viên phụ trách hoặc Admin) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const { id } = await params;
  const ip = clientIp(req);

  const body = (await req.json()) as { to?: string; note?: string };
  const to = body.to as TaskStatus | undefined;
  const note = (body.note ?? "").trim();

  if (!to || !Object.values(TASK_STATUS).includes(to)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }
  if ((to === TASK_STATUS.TU_CHOI || to === TASK_STATUS.TAM_HOAN) && !note) {
    return NextResponse.json(
      { error: `Khi chuyển sang "${to}" bắt buộc phải nhập lý do / ghi chú` },
      { status: 400 }
    );
  }

  let result: { task: Task } | null = null;
  let error: string | null = null;

  await updateTasks((list) => {
    const task = list.find((t) => t.id === id);
    if (!task) {
      error = "Không tìm thấy nhiệm vụ";
      return false;
    }
    const isAssignee = task.assigneeId === user.id;
    const isAdmin = user.role === "admin";
    if (!isAdmin && !isAssignee) {
      // Kỹ thuật viên chưa được phân công chỉ được "Tiếp nhận" nhiệm vụ chưa ai nhận
      if (!(user.role === "technician" && to === TASK_STATUS.DA_TIEP_NHAN && !task.assigneeId)) {
        error = "Bạn không có quyền cập nhật nhiệm vụ này";
        return false;
      }
    }
    const allowed = STATUS_TRANSITIONS[task.status] ?? [];
    if (!allowed.includes(to)) {
      error = `Không thể chuyển từ "${task.status}" sang "${to}"`;
      return false;
    }

    const now = new Date().toISOString();
    const event: StatusEvent = {
      from: task.status,
      to,
      byId: user.id,
      byName: user.name,
      note: note || undefined,
      at: now,
    };
    task.history.push(event);
    task.status = to;
    task.updatedAt = now;

    // Nhận nhiệm vụ lần đầu: tự gán người xử lý nếu chưa có
    if (to === TASK_STATUS.DA_TIEP_NHAN && !task.assigneeId) {
      task.assigneeId = user.id;
      task.assigneeName = user.name;
      task.assignedAt = now;
      task.assignedBy = user.id;
    }
    if (to === TASK_STATUS.DA_TIEP_NHAN) task.receivedAt = now;
    if (to === TASK_STATUS.HOAN_THANH) task.completedAt = now;
    if (to === TASK_STATUS.CHO_TIEP_NHAN) {
      task.receivedAt = null;
      task.completedAt = null;
    }
    result = { task: structuredClone(task) };
    return true;
  }).catch(() => undefined);

  if (error || !result) {
    return NextResponse.json({ error: error ?? "Không thể cập nhật trạng thái" }, { status: 400 });
  }

  const task = result.task;
  await writeAudit({
    actor: user,
    action: "task_status_change",
    entityType: "task",
    entityId: id,
    detail: `${task.code}: ${task.history.at(-1)?.from ?? ""} → ${to}${note ? ` (${note})` : ""}`,
    after: { status: to, note },
    ip,
  });
  void notifyTaskStatus(task, to, user.name, note);

  return NextResponse.json({ ok: true, task });
}
