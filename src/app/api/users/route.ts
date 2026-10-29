import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, validatePasswordStrength } from "@/lib/auth";
import { clientIp, notifyUsers, writeAudit } from "@/lib/audit";
import { DEPARTMENTS, TITLES } from "@/lib/constants";
import { getUsers, newId, updateUsers } from "@/lib/storage";
import type { User } from "@/lib/storage";
import { fieldErrors, userCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPublic(u: User) {
  const { passwordHash, ...rest } = u;
  return rest;
}

/** GET: danh sách người dùng (Admin) — hỗ trợ tìm kiếm theo tên/CCCD/phòng ban/chức danh */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên có quyền này" }, { status: 403 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const role = url.searchParams.get("role") || "";
  const department = url.searchParams.get("department") || "";

  let users = await getUsers();
  if (q) {
    users = users.filter((u) =>
      [u.name, u.username, u.cccd, u.department, u.title, u.email]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }
  if (role) users = users.filter((u) => u.role === role);
  if (department) users = users.filter((u) => u.department === department);

  return NextResponse.json({
    items: users.map(toPublic),
    total: users.length,
    departments: DEPARTMENTS,
    titles: TITLES,
  });
}

/** POST: tạo tài khoản mới (Admin) */
export async function POST(req: Request) {
  const admin = await getCurrentUser(req);
  if (!admin) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên có quyền này" }, { status: 403 });
  const ip = clientIp(req);

  try {
    const body = await req.json();
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu chưa hợp lệ", fields: fieldErrors(parsed.error) },
        { status: 400 }
      );
    }
    const strengthError = validatePasswordStrength(body.password);
    if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

    let exists = "";
    await updateUsers((list) => {
      if (list.some((u) => u.username.toLowerCase() === parsed.data.username.toLowerCase())) {
        exists = "Tên đăng nhập đã tồn tại";
        return false;
      }
      if (list.some((u) => u.cccd === parsed.data.cccd)) {
        exists = "CCCD này đã được dùng cho tài khoản khác";
        return false;
      }
      return true;
    });
    if (exists) return NextResponse.json({ error: exists }, { status: 400 });

    const now = new Date().toISOString();
    const newUser: User = {
      id: newId("usr"),
      username: parsed.data.username,
      name: parsed.data.name,
      cccd: parsed.data.cccd,
      role: parsed.data.role,
      department: parsed.data.department,
      title: parsed.data.title,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      passwordHash: hashPassword(parsed.data.password),
      status: "active",
      failedAttempts: 0,
      lockUntil: null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    };

    await updateUsers((list) => {
      list.push(newUser);
      return true;
    });

    await writeAudit({
      actor: admin,
      action: "user_create",
      entityType: "user",
      entityId: newUser.id,
      detail: `Tạo tài khoản ${newUser.username} (${newUser.name})`,
      after: toPublic(newUser),
      ip,
    });
    void notifyUsers([newUser.id], {
      type: "account",
      title: "Tài khoản đã được tạo",
      message: `Quản trị viên ${admin.name} đã tạo tài khoản cho bạn. Vui lòng đổi mật khẩu sau khi đăng nhập.`,
    });

    return NextResponse.json({ ok: true, user: toPublic(newUser) });
  } catch (err) {
    console.error("[users/create]", err);
    return NextResponse.json({ error: "Không thể tạo tài khoản" }, { status: 500 });
  }
}
