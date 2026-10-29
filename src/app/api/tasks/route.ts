import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, notifyTaskCreated, writeAudit } from "@/lib/audit";
import {
  ALLOWED_FILE_EXTENSIONS,
  MAX_ATTACHMENTS,
  MAX_FILE_SIZE,
  TASK_STATUS,
  TASK_TYPES,
  URGENCY_LEVELS,
} from "@/lib/constants";
import { newId, nextTaskCode, saveAttachment, updateTasks, getSettings, getTasks, storageMode } from "@/lib/storage";
import { fieldErrors, taskProposalSchema } from "@/lib/validation";
import type { Task, TaskAttachment } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/* --------------------------- GET: danh sách nhiệm vụ --------------------------- */

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get("pageSize") || 10)));
  const status = url.searchParams.get("status") || "";
  const type = url.searchParams.get("type") || "";
  const department = url.searchParams.get("department") || "";
  const urgency = url.searchParams.get("urgency") || "";
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const assignee = url.searchParams.get("assignee") || "";
  const sort = url.searchParams.get("sort") || "createdAt_desc";
  const settings = await getSettings();

  let items = await getTasks();

  // Phạm vi theo vai trò
  if (user.role === "user") {
    items = items.filter((t) => t.requesterId === user.id);
  } else if (user.role === "technician") {
    items = items.filter(
      (t) =>
        t.assigneeId === user.id ||
        (settings.allowSelfAssign && !t.assigneeId && t.status === TASK_STATUS.CHO_TIEP_NHAN)
    );
  }

  // Bộ lọc
  if (status) items = items.filter((t) => t.status === status);
  if (type) items = items.filter((t) => t.type === type);
  if (department) items = items.filter((t) => t.department === department);
  if (urgency) items = items.filter((t) => t.urgency === urgency);
  if (assignee === "me") items = items.filter((t) => t.assigneeId === user.id);
  else if (assignee === "unassigned") items = items.filter((t) => !t.assigneeId);
  else if (assignee) items = items.filter((t) => t.assigneeId === assignee);
  if (from) items = items.filter((t) => t.createdAt >= new Date(`${from}T00:00:00`).toISOString());
  if (to) items = items.filter((t) => t.createdAt <= new Date(`${to}T23:59:59.999`).toISOString());
  if (q) {
    items = items.filter((t) =>
      [t.code, t.title, t.description, t.requesterName, t.department]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  // Sắp xếp
  const [field, dir] = sort.split("_");
  items = [...items].sort((a, b) => {
    const va = (a as unknown as Record<string, unknown>)[field] as string;
    const vb = (b as unknown as Record<string, unknown>)[field] as string;
    const cmp = String(va ?? "").localeCompare(String(vb ?? ""), "vi");
    return dir === "asc" ? cmp : -cmp;
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return NextResponse.json({
    items: paged,
    total,
    page,
    pageSize,
    allowSelfAssign: settings.allowSelfAssign,
  });
}

/* --------------------------- POST: gửi đề xuất nhiệm vụ --------------------------- */

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const ip = clientIp(req);

  try {
    const form = await req.formData();
    const raw = {
      type: String(form.get("type") ?? ""),
      requesterName: String(form.get("requesterName") ?? ""),
      department: String(form.get("department") ?? ""),
      position: String(form.get("position") ?? ""),
      cccd: String(form.get("cccd") ?? ""),
      legalBasis: String(form.get("legalBasis") ?? ""),
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      urgency: String(form.get("urgency") ?? ""),
      desiredDeadline: String(form.get("desiredDeadline") ?? ""),
      location: String(form.get("location") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };

    const parsed = taskProposalSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(parsed.error) },
        { status: 400 }
      );
    }
    if (!TASK_TYPES.includes(raw.type)) {
      return NextResponse.json({ error: "Loại nhiệm vụ không hợp lệ" }, { status: 400 });
    }
    if (!URGENCY_LEVELS.includes(raw.urgency as (typeof URGENCY_LEVELS)[number])) {
      return NextResponse.json({ error: "Mức độ khẩn cấp không hợp lệ" }, { status: 400 });
    }

    // Xử lý tệp đính kèm
    const files = form.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS} tệp` },
        { status: 400 }
      );
    }
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Tệp "${f.name}" vượt quá giới hạn 10MB` },
          { status: 400 }
        );
      }
      const lower = f.name.toLowerCase();
      if (!ALLOWED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        return NextResponse.json(
          { error: `Tệp "${f.name}" không đúng định dạng cho phép (ảnh, PDF, Word, Excel)` },
          { status: 400 }
        );
      }
    }

    const attachments: TaskAttachment[] = [];
    for (const f of files) {
      const buffer = Buffer.from(await f.arrayBuffer());
      const meta = await saveAttachment({
        name: f.name,
        mime: f.type || "application/octet-stream",
        buffer,
      });
      attachments.push(meta);
    }

    const code = await nextTaskCode();
    const now = new Date().toISOString();
    const task: Task = {
      id: newId("tsk"),
      code,
      type: raw.type,
      requesterId: user.id,
      requesterName: raw.requesterName,
      department: raw.department,
      position: raw.position,
      cccd: raw.cccd,
      legalBasis: raw.legalBasis || undefined,
      title: raw.title,
      description: raw.description,
      urgency: raw.urgency as Task["urgency"],
      desiredDeadline: raw.desiredDeadline || null,
      location: raw.location || undefined,
      phone: raw.phone,
      email: raw.email || undefined,
      attachments,
      notes: raw.notes || undefined,
      status: TASK_STATUS.CHO_TIEP_NHAN,
      assigneeId: null,
      history: [
        {
          from: null,
          to: TASK_STATUS.CHO_TIEP_NHAN,
          byId: user.id,
          byName: user.name,
          note: "Gửi đề xuất mới",
          at: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
      receivedAt: null,
      completedAt: null,
      rating: null,
    };

    await updateTasks((list) => {
      list.push(task);
      return true;
    });

    await writeAudit({
      actor: user,
      action: "task_create",
      entityType: "task",
      entityId: task.id,
      detail: `Gửi đề xuất ${code}: ${task.title}`,
      after: { code, title: task.title, type: task.type, urgency: task.urgency },
      ip,
    });

    // Không chờ thông báo làm chậm phản hồi
    void notifyTaskCreated(task);

    return NextResponse.json({
      ok: true,
      code,
      id: task.id,
      message: `Gửi đề xuất thành công! Mã nhiệm vụ của bạn là ${code}.`,
    });
  } catch (err) {
    console.error("[tasks/create]", err);
    return NextResponse.json(
      { error: `Không thể lưu đề xuất (${storageMode()}). Vui lòng thử lại.` },
      { status: 500 }
    );
  }
}
