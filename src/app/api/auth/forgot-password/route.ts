import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { mailRecipientsEnabled, sendMail } from "@/lib/audit";
import { getUsers } from "@/lib/storage";

export const runtime = "nodejs";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "z-dev-secret-quanly-nhiemvu-kpi-change-me-in-production"
);

export async function POST(req: Request) {
  try {
    const { identifier } = (await req.json()) as { identifier?: string };
    const id = (identifier ?? "").trim().toLowerCase();
    if (!id) {
      return NextResponse.json({ error: "Vui lòng nhập tên đăng nhập hoặc CCCD" }, { status: 400 });
    }
    const users = await getUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === id || u.cccd === identifier!.replace(/\s/g, "")
    );

    // Không tiết lộ tài khoản có tồn tại hay không
    const genericMsg =
      "Nếu tài khoản tồn tại và có email liên kết, hệ thống đã gửi hướng dẫn đặt lại mật khẩu. Trường hợp chưa cấu hình email, vui lòng liên hệ Quản trị viên để được đặt lại mật khẩu.";

    if (!user) return NextResponse.json({ message: genericMsg });

    if (!mailRecipientsEnabled() || !user.email) {
      return NextResponse.json({ message: genericMsg });
    }

    const token = await new SignJWT({ sub: user.id, purpose: "reset_password" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 30 * 60)
      .sign(SECRET);

    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

    await sendMail({
      to: user.email,
      subject: "[Hệ thống QLNV] Đặt lại mật khẩu",
      text:
        `Kính gửi ${user.name},\n\n` +
        `Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản ${user.username}.\n` +
        `Liên kết đặt lại mật khẩu (hiệu lực 30 phút):\n${link}\n\n` +
        `Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này.`,
    });

    return NextResponse.json({ message: genericMsg });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
