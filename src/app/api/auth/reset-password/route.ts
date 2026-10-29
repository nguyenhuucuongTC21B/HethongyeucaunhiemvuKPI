import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { hashPassword, validatePasswordStrength } from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/audit";
import { updateUsers, getUsers } from "@/lib/storage";

export const runtime = "nodejs";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "z-dev-secret-quanly-nhiemvu-kpi-change-me-in-production"
);

export async function POST(req: Request) {
  try {
    const { token, newPassword } = (await req.json()) as { token?: string; newPassword?: string };
    if (!token) return NextResponse.json({ error: "Liên kết không hợp lệ" }, { status: 400 });
    const strengthError = validatePasswordStrength(newPassword ?? "");
    if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

    let userId: string;
    try {
      const { payload } = await jwtVerify(token!, SECRET);
      if (payload.purpose !== "reset_password" || !payload.sub) throw new Error("bad");
      userId = String(payload.sub);
    } catch {
      return NextResponse.json(
        { error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" },
        { status: 400 }
      );
    }

    const users = await getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });

    const hash = hashPassword(newPassword!);
    await updateUsers((list) => {
      const u = list.find((x) => x.id === userId);
      if (!u) throw new Error("Không tìm thấy người dùng");
      u.passwordHash = hash;
      u.failedAttempts = 0;
      u.lockUntil = null;
      u.updatedAt = new Date().toISOString();
      return true;
    });
    await writeAudit({
      actorId: userId,
      actorName: user.name,
      action: "reset_password",
      entityType: "user",
      entityId: userId,
      detail: "Đặt lại mật khẩu qua email",
      ip: clientIp(req),
    });
    return NextResponse.json({ ok: true, message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
