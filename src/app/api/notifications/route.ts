import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications, updateNotifications } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: thông báo của tôi + số chưa đọc */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));

  const all = await getNotifications();
  const mine = all.filter((n) => n.userId === user.id);
  const unread = mine.filter((n) => !n.read).length;
  const items = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

  return NextResponse.json({ items, unread, total: mine.length });
}

/** POST: đánh dấu đã đọc (1 thông báo hoặc tất cả) */
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { id?: string; all?: boolean };

  await updateNotifications((list) => {
    for (const n of list) {
      if (n.userId !== user.id) continue;
      if (body.all || n.id === body.id) n.read = true;
    }
    return true;
  });

  return NextResponse.json({ ok: true });
}
