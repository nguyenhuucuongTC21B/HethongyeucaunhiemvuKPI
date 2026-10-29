/**
 * POST /api/auth/register — Đăng ký tài khoản công khai
 * Tham khảo pattern hệ thống OES: đăng ký xong tự cấp phiên đăng nhập.
 * - Người dùng (cán bộ, công chức): đăng ký tự do
 * - Kỹ thuật viên: yêu cầu Mã đăng ký do Admin cấp (settings.techRegCode)
 * - Quản trị viên: yêu cầu Mã quản trị (settings.adminRegCode)
 */
import { NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  setSessionCookie,
  validatePasswordStrength,
} from "@/lib/auth";
import { clientIp, notifyUsers, writeAudit } from "@/lib/audit";
import { DEPARTMENTS, ROLES, TITLES } from "@/lib/constants";
import { getUsers, getSettings, newId, updateUsers } from "@/lib/storage";
import type { User } from "@/lib/storage";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9._]{3,32}$/;
const CCCD_RE = /^\d{12}$/;
const PHONE_RE = /^0\d{9,10}$/;

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const settings = await getSettings();
    if (settings.allowRegistration === false) {
      return NextResponse.json(
        { error: "Hệ thống đang tắt chế độ tự đăng ký tài khoản. Vui lòng liên hệ Quản trị viên." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const role = String(body.role ?? "user");
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const cccd = String(body.cccd ?? "").replace(/\s/g, "");
    const department = String(body.department ?? "");
    const title = String(body.title ?? "");
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");
    const confirm = String(body.confirmPassword ?? "");
    const regCode = String(body.regCode ?? "").trim();
    const commit = Boolean(body.commitment);

    /* --------- Kiểm tra dữ liệu --------- */
    if (!["user", "technician", "admin"].includes(role)) {
      return NextResponse.json({ error: "Loại tài khoản không hợp lệ" }, { status: 400 });
    }
    if (name.length < 3 || name.length > 80) {
      return NextResponse.json({ error: "Họ và tên phải từ 3 đến 80 ký tự" }, { status: 400 });
    }
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: "Tên đăng nhập 3–32 ký tự, chỉ gồm chữ cái, số, dấu chấm hoặc gạch dưới" },
        { status: 400 }
      );
    }
    if (!CCCD_RE.test(cccd)) {
      return NextResponse.json({ error: "Số CCCD phải gồm đúng 12 chữ số" }, { status: 400 });
    }
    if (!DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: "Vui lòng chọn Đơn vị công tác" }, { status: 400 });
    }
    if (!TITLES.includes(title)) {
      return NextResponse.json({ error: "Vui lòng chọn Chức danh" }, { status: 400 });
    }
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Địa chỉ email không hợp lệ" }, { status: 400 });
    }
    if (phone && !PHONE_RE.test(phone)) {
      return NextResponse.json(
        { error: "Số điện thoại phải bắt đầu bằng số 0 và dài 10–11 chữ số" },
        { status: 400 }
      );
    }
    const pwError = validatePasswordStrength(password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
    if (password !== confirm) {
      return NextResponse.json({ error: "Nhập lại mật khẩu chưa khớp" }, { status: 400 });
    }
    if (!commit) {
      return NextResponse.json(
        { error: "Vui lòng xác nhận cam kết khai báo thông tin chính xác" },
        { status: 400 }
      );
    }

    /* --------- Kiểm tra mã đăng ký theo vai trò --------- */
    if (role === ROLES.TECHNICIAN) {
      if (!regCode || regCode !== (settings.techRegCode ?? "").trim()) {
        return NextResponse.json(
          { error: "Mã đăng ký Kỹ thuật viên không đúng. Vui lòng liên hệ Quản trị viên để được cấp mã." },
          { status: 403 }
        );
      }
    }
    if (role === ROLES.ADMIN) {
      if (!regCode || regCode !== (settings.adminRegCode ?? "").trim()) {
        return NextResponse.json(
          { error: "Mã đăng ký Quản trị viên không đúng." },
          { status: 403 }
        );
      }
    }

    /* --------- Kiểm tra trùng lặp --------- */
    const users = await getUsers();
    const dupMsg =
      users.find((u) => u.username.toLowerCase() === username.toLowerCase())
        ? "Tên đăng nhập này đã tồn tại. Vui lòng chọn tên khác."
        : users.find((u) => u.cccd === cccd)
          ? "Số CCCD này đã được đăng ký tài khoản."
          : email && users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase())
            ? "Email này đã được sử dụng bởi tài khoản khác."
            : null;
    if (dupMsg) return NextResponse.json({ error: dupMsg }, { status: 409 });

    /* --------- Tạo tài khoản --------- */
    const now = new Date().toISOString();
    const user: User = {
      id: newId("usr"),
      username,
      cccd,
      name,
      role: role as User["role"],
      department,
      title,
      email: email || undefined,
      phone: phone || undefined,
      passwordHash: hashPassword(password),
      status: "active",
      failedAttempts: 0,
      lockUntil: null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    };

    await updateUsers((list) => {
      list.push(user);
      return true;
    });

    /* --------- Audit + thông báo cho Admin --------- */
    await writeAudit({
      actorName: name,
      action: "register",
      entityType: "auth",
      entityId: user.id,
      detail: `Tự đăng ký tài khoản mới: ${username} (${department} — ${title})`,
      ip,
    });
    try {
      if (role !== ROLES.USER) {
        const admins = users.filter((u) => u.role === ROLES.ADMIN);
        await notifyUsers(
          admins.map((a) => a.id),
          {
            type: "account",
            title: "Đăng ký tài khoản mới cần lưu ý",
            message: `${name} (${department}) vừa tự đăng ký tài khoản ${role === ROLES.ADMIN ? "QUẢN TRỊ VIÊN" : "Kỹ thuật viên"} "${username}". Vui lòng kiểm tra tính xác thực.`,
          }
        );
      }
    } catch { /* không làm lỗi request chính */ }

    /* --------- Tự cấp phiên đăng nhập (pattern OES) --------- */
    const token = await createSessionToken({
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json(
      {
        message: "Đăng ký tài khoản thành công!",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department,
          title: user.title,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Lỗi máy chủ khi đăng ký tài khoản" }, { status: 500 });
  }
}
