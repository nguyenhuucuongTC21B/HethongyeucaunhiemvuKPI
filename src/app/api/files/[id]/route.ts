import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAttachment, getTasks } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: tải tệp đính kèm của nhiệm vụ (yêu cầu đăng nhập) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const tasks = await getTasks();
  let meta = null;
  let allowed = false;

  for (const task of tasks) {
    const found = task.attachments?.find((a) => a.id === id);
    if (found) {
      meta = found;
      allowed =
        user.role === "admin" ||
        task.requesterId === user.id ||
        task.assigneeId === user.id ||
        user.role === "technician";
      break;
    }
  }

  if (!meta) return NextResponse.json({ error: "Không tìm thấy tệp" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Không có quyền tải tệp này" }, { status: 403 });

  try {
    const { buffer, mime, name } = await getAttachment(meta);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[files]", err);
    return NextResponse.json({ error: "Không thể đọc tệp từ kho lưu trữ" }, { status: 500 });
  }
}
