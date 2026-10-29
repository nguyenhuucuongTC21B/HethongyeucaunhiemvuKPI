import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, validatePasswordStrength } from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/audit";
import { updateUsers } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { oldPassword, newPassword } = (await req.json()) as {
    oldPassword?: string;
    newPassword?: string;
  };
  const { verifyPassword } = await import("@/lib/auth");
  if (!verifyPassword(oldPassword ?? "", user.passwordHash)) {
    return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });
  }
  const strengthError = validatePasswordStrength(newPassword ?? "");
  if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

  const hash = hashPassword(newPassword!);
  await updateUsers((list) => {
    const u = list.find((x) => x.id === user.id);
    if (!u) throw new Error("Không tìm thấy người dùng");
    u.passwordHash = hash;
    u.mustChangePassword = false;
    u.updatedAt = new Date().toISOString();
    return true;
  });
  await writeAudit({
    actor: user,
    action: "change_password",
    entityType: "user",
    entityId: user.id,
    ip: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
