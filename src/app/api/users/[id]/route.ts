import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, validatePasswordStrength } from "@/lib/auth";
import { clientIp, notifyUsers, writeAudit } from "@/lib/audit";
import { getUsers, updateUsers } from "@/lib/storage";
import type { User } from "@/lib/storage";
import { fieldErrors, userUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPublic(u: User) {
  const { passwordHash, ...rest } = u;
  return rest;
}

const ACTIONS = ["lock", "unlock", "reset_password", "set_role"] as const;

/** POST: thao tác quản trị trên một tài khoản (khóa/mở khóa/đặt lại mật khẩu/đổi vai trò) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser(req);
  if (!admin) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên có quyền này" }, { status: 403 });
  const { id } = await params;
  const ip = clientIp(req);

  const body = (await req.json()) as {
    action?: (typeof ACTIONS)[number];
    role?: string;
    password?: string;
  };
  const action = body.action;
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  }

  let before: User | undefined;
  let error: string | null = null;
  let detail = "";

  await updateUsers((list) => {
    const u = list.find((x) => x.id === id);
    if (!u) {
      error = "Không tìm thấy người dùng";
      return false;
    }
    before = structuredClone(u);

    const adminCount = list.filter((x) => x.role === "admin" && x.status === "active").length;

    switch (action) {
      case "lock":
        if (u.id === admin.id) {
          error = "Không thể tự khóa tài khoản của chính mình";
          return false;
        }
        if (u.role === "admin" && adminCount <= 1) {
          error = "Phải còn ít nhất 1 Quản trị viên hoạt động";
          return false;
        }
        u.status = "locked";
        detail = `Khóa tài khoản ${u.username}`;
        break;
      case "unlock":
        u.status = "active";
        u.failedAttempts = 0;
        u.lockUntil = null;
        detail = `Mở khóa tài khoản ${u.username}`;
        break;
      case "reset_password": {
        const pw = body.password ?? "";
        const strengthError = validatePasswordStrength(pw);
        if (strengthError) {
          error = strengthError;
          return false;
        }
        u.passwordHash = hashPassword(pw);
        u.failedAttempts = 0;
        u.lockUntil = null;
        u.mustChangePassword = true;
        detail = `Đặt lại mật khẩu cho ${u.username}`;
        break;
      }
      case "set_role": {
        const role = body.role ?? "";
        if (!["user", "technician", "admin"].includes(role)) {
          error = "Vai trò không hợp lệ";
          return false;
        }
        if (u.id === admin.id && role !== "admin") {
          error = "Không thể tự hạ vai trò của mình";
          return false;
        }
        if (u.role === "admin" && role !== "admin" && adminCount <= 1) {
          error = "Phải còn ít nhất 1 Quản trị viên hoạt động";
          return false;
        }
        u.role = role as User["role"];
        detail = `Đổi vai trò ${u.username} → ${role}`;
        break;
      }
    }
    u.updatedAt = new Date().toISOString();
    return true;
  }).catch(() => undefined);

  if (error) return NextResponse.json({ error }, { status: 400 });

  const after = (await getUsers()).find((x) => x.id === id);
  await writeAudit({
    actor: admin,
    action: `user_${action}`,
    entityType: "user",
    entityId: id,
    detail,
    before: before ? toPublic(before) : undefined,
    after: after ? toPublic(after) : undefined,
    ip,
  });

  if (action === "lock" || action === "unlock") {
    void notifyUsers([id], {
      type: "account",
      title: action === "lock" ? "Tài khoản bị khóa" : "Tài khoản được mở khóa",
      message:
        action === "lock"
          ? `Tài khoản của bạn đã bị Quản trị viên khóa. Vui lòng liên hệ Quản trị viên.`
          : `Tài khoản của bạn đã được mở khóa, bạn có thể đăng nhập bình thường.`,
    });
  }
  if (action === "reset_password" && after) {
    void notifyUsers([id], {
      type: "account",
      title: "Mật khẩu đã được đặt lại",
      message: `Quản trị viên ${admin.name} đã đặt lại mật khẩu cho tài khoản ${after.username}. Vui lòng đăng nhập và đổi mật khẩu mới.`,
    });
  }
  return NextResponse.json({ ok: true, user: after ? toPublic(after) : null });
}

/** PATCH: sửa thông tin tài khoản (Admin) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser(req);
  if (!admin) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên có quyền này" }, { status: 403 });
  const { id } = await params;
  const ip = clientIp(req);

  const body = await req.json();
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  let before: User | undefined;
  let error: string | null = null;

  await updateUsers((list) => {
    const u = list.find((x) => x.id === id);
    if (!u) {
      error = "Không tìm thấy người dùng";
      return false;
    }
    before = structuredClone(u);
    if (
      parsed.data.username &&
      list.some(
        (x) => x.id !== id && x.username.toLowerCase() === parsed.data.username!.toLowerCase()
      )
    ) {
      error = "Tên đăng nhập đã tồn tại";
      return false;
    }
    if (parsed.data.cccd && list.some((x) => x.id !== id && x.cccd === parsed.data.cccd)) {
      error = "CCCD này đã được dùng cho tài khoản khác";
      return false;
    }
    const d = parsed.data;
    if (d.username) u.username = d.username;
    if (d.name) u.name = d.name;
    if (d.cccd) u.cccd = d.cccd;
    if (d.department) u.department = d.department;
    if (d.title) u.title = d.title;
    if (d.email !== undefined) u.email = d.email || undefined;
    if (d.phone !== undefined) u.phone = d.phone || undefined;
    if (d.role && (admin.id !== id || d.role === "admin")) u.role = d.role as User["role"];
    u.updatedAt = new Date().toISOString();
    return true;
  }).catch(() => undefined);

  if (error) return NextResponse.json({ error }, { status: 400 });

  const after = (await getUsers()).find((x) => x.id === id);
  await writeAudit({
    actor: admin,
    action: "user_update",
    entityType: "user",
    entityId: id,
    detail: `Cập nhật thông tin tài khoản ${before?.username ?? id}`,
    before: before ? toPublic(before) : undefined,
    after: after ? toPublic(after) : undefined,
    ip,
  });
  return NextResponse.json({ ok: true, user: after ? toPublic(after) : null });
}

/** DELETE: xóa tài khoản (Admin; không tự xóa; giữ ít nhất 1 Admin) */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser(req);
  if (!admin) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên có quyền này" }, { status: 403 });
  const { id } = await params;
  const ip = clientIp(req);

  if (id === admin.id) {
    return NextResponse.json({ error: "Không thể tự xóa tài khoản của chính mình" }, { status: 400 });
  }

  let removed: User | undefined;
  let error: string | null = null;

  await updateUsers((list) => {
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1) {
      error = "Không tìm thấy người dùng";
      return false;
    }
    const u = list[idx];
    const adminCount = list.filter((x) => x.role === "admin" && x.status === "active").length;
    if (u.role === "admin" && adminCount <= 1) {
      error = "Phải còn ít nhất 1 Quản trị viên hoạt động";
      return false;
    }
    removed = u;
    list.splice(idx, 1);
    return true;
  }).catch(() => undefined);

  if (error) return NextResponse.json({ error }, { status: 400 });

  await writeAudit({
    actor: admin,
    action: "user_delete",
    entityType: "user",
    entityId: id,
    detail: `Xóa tài khoản ${removed?.username ?? id} (${removed?.name ?? ""})`,
    before: removed ? toPublic(removed) : undefined,
    ip,
  });
  return NextResponse.json({ ok: true });
}
