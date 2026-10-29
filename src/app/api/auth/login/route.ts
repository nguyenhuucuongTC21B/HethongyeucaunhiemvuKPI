import { NextResponse } from "next/server";
import {
  createSessionToken,
  isUserLocked,
  registerFailedLogin,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/audit";
import { updateUsers, getUsers } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { identifier?: string; password?: string };
    const identifier = (body.identifier ?? "").trim();
    const password = body.password ?? "";
    const ip = clientIp(req);

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập (hoặc CCCD) và mật khẩu" },
        { status: 400 }
      );
    }

    const idLower = identifier.toLowerCase();
    const users = await getUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === idLower || u.cccd === identifier.replace(/\s/g, "")
    );

    if (!user) {
      await writeAudit({
        action: "login_failed",
        entityType: "auth",
        actorName: identifier,
        detail: "Không tồn tại tài khoản",
        ip,
      });
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    if (user.status === "locked") {
      return NextResponse.json(
        { error: "Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên." },
        { status: 403 }
      );
    }

    if (isUserLocked(user)) {
      const minutes = Math.ceil((new Date(user.lockUntil!).getTime() - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: `Tài khoản tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
        },
        { status: 423 }
      );
    }

    if (!verifyPassword(password, user.passwordHash)) {
      const result = registerFailedLogin(user);
      await updateUsers((list) => {
        const u = list.find((x) => x.id === user.id);
        if (u) {
          u.failedAttempts = user.failedAttempts;
          u.lockUntil = user.lockUntil;
          u.updatedAt = new Date().toISOString();
        }
        return true;
      });
      await writeAudit({
        action: "login_failed",
        entityType: "auth",
        actor: user,
        detail: `Sai mật khẩu (còn ${result.remainingAttempts} lần thử)`,
        ip,
      });
      if (result.locked) {
        return NextResponse.json(
          {
            error: `Bạn đã nhập sai quá số lần cho phép. Tài khoản tạm khóa ${result.lockMinutesLeft} phút.`,
          },
          { status: 423 }
        );
      }
      return NextResponse.json(
        {
          error: `Tên đăng nhập hoặc mật khẩu không đúng. Còn ${result.remainingAttempts} lần thử.`,
        },
        { status: 401 }
      );
    }

    // Đăng nhập thành công — reset bộ đếm
    await updateUsers((list) => {
      const u = list.find((x) => x.id === user.id);
      if (u) {
        u.failedAttempts = 0;
        u.lockUntil = null;
        u.updatedAt = new Date().toISOString();
      }
      return true;
    });

    const token = await createSessionToken({
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);
    await writeAudit({
      actor: user,
      action: "login",
      entityType: "auth",
      detail: "Đăng nhập thành công",
      ip,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
        title: user.title,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Lỗi máy chủ khi đăng nhập" }, { status: 500 });
  }
}
