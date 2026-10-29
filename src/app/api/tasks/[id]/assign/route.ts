import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, notifyTaskAssigned, writeAudit } from "@/lib/audit";
import { TASK_STATUS } from "@/lib/constants";
import { getSettings, getUsers, getTasks, updateTasks } from "@/lib/storage";
import type { Task } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: phân công / đổi người xử lý / thu hồi
 * - Admin: phân công bất kỳ kỹ thuật viên, thu hồi (bỏ phân công)
 * - Kỹ thuật viên: tự nhận nhiệm vụ chưa phân công (nếu Admin cho phép)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const { id } = await params;
  const ip = clientIp(req);

  const body = (await req.json()) as { assigneeId?: string | null; action?: string };
  const action = body.action ?? "assign";
  const settings = await getSettings();
  const users = await getUsers();

  let error: string | null = null;
  let assigneeName: string | null = null;
  let updated: Task | null = null;
  let unassigned = false;

  await updateTasks((list) => {
    const task = list.find((t) => t.id === id);
    if (!task) {
      error = "Không tìm thấy nhiệm vụ";
      return false;
    }
    const now = new Date().toISOString();

    /* ---------- Thu hồi phân công (chỉ Admin) ---------- */
    if (action === "unassign") {
      if (user.role !== "admin") {
        error = "Chỉ Quản trị viên được thu hồi nhiệm vụ";
        return false;
      }
      task.assigneeId = null;
      task.assigneeName = undefined;
      task.assignedAt = null;
      task.assignedBy = null;
      task.updatedAt = now;
      const revertable = [
        TASK_STATUS.DA_TIEP_NHAN,
        TASK_STATUS.DANG_XU_LY,
        TASK_STATUS.TAM_HOAN,
      ].includes(task.status);
      if (revertable) {
        task.history.push({
          from: task.status,
          to: TASK_STATUS.CHO_TIEP_NHAN,
          byId: user.id,
          byName: user.name,
          note: "Thu hồi phân công, nhiệm vụ chờ tiếp nhận lại",
          at: now,
        });
        task.status = TASK_STATUS.CHO_TIEP_NHAN;
        task.receivedAt = null;
      }
      unassigned = true;
      updated = structuredClone(task);
      return true;
    }

    /* ---------- Phân công / đổi người xử lý ---------- */
    const assigneeId = body.assigneeId;
    if (!assigneeId) {
      error = "Vui lòng chọn kỹ thuật viên";
      return false;
    }
    const assignee = users.find((u) => u.id === assigneeId && u.role === "technician");
    if (!assignee) {
      error = "Kỹ thuật viên không tồn tại";
      return false;
    }

    if (user.role !== "admin") {
      if (user.role !== "technician") {
        error = "Bạn không có quyền phân công nhiệm vụ";
        return false;
      }
      if (!settings.allowSelfAssign) {
        error = "Hệ thống hiện không cho phép kỹ thuật viên tự nhận nhiệm vụ";
        return false;
      }
      if (task.assigneeId) {
        error = "Nhiệm vụ đã có người phụ trách";
        return false;
      }
      if (assigneeId !== user.id) {
        error = "Kỹ thuật viên chỉ được tự nhận nhiệm vụ cho chính mình";
        return false;
      }
      if (task.status !== TASK_STATUS.CHO_TIEP_NHAN) {
        error = "Chỉ nhận nhiệm vụ ở trạng thái Chờ tiếp nhận";
        return false;
      }
    }

    const isReassign = Boolean(task.assigneeId) && task.assigneeId !== assigneeId;
    task.assigneeId = assigneeId;
    task.assigneeName = assignee.name;
    task.assignedAt = now;
    task.assignedBy = user.id;
    task.updatedAt = now;
    task.history.push({
      from: null,
      to: task.status,
      byId: user.id,
      byName: user.name,
      note: isReassign
        ? `Đổi người xử lý → ${assignee.name}`
        : `Phân công cho ${assignee.name}`,
      at: now,
    });
    assigneeName = assignee.name;
    updated = structuredClone(task);
    return true;
  }).catch(() => undefined);

  if (error || !updated) {
    return NextResponse.json({ error: error ?? "Không thể phân công" }, { status: 400 });
  }

  const task = updated;
  await writeAudit({
    actor: user,
    action: unassigned ? "task_unassign" : "task_assign",
    entityType: "task",
    entityId: id,
    detail: `${task.code}: ${unassigned ? "Thu hồi phân công" : `Phân công cho ${assigneeName}`}`,
    after: { assigneeId: task.assigneeId, assigneeName },
    ip,
  });

  if (!unassigned && task.assigneeId) {
    void notifyTaskAssigned(task, user.name);
  }
  return NextResponse.json({ ok: true, task });
}
