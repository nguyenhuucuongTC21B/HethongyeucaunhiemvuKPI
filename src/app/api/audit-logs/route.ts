import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAuditLogs, getUsers } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: nhật ký hoạt động (chỉ Admin) — lọc theo người thực hiện / hành động / thời gian */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên có quyền này" }, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 20)));
  const actor = url.searchParams.get("actor") || "";
  const action = url.searchParams.get("action") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  let logs = await getAuditLogs();
  logs = logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (actor) logs = logs.filter((l) => l.actorId === actor || l.actorName === actor);
  if (action) logs = logs.filter((l) => l.action === action);
  if (from) logs = logs.filter((l) => l.createdAt >= new Date(`${from}T00:00:00`).toISOString());
  if (to) logs = logs.filter((l) => l.createdAt <= new Date(`${to}T23:59:59.999`).toISOString());
  if (q) {
    logs = logs.filter((l) =>
      [l.actorName, l.action, l.entityType, l.entityId, l.detail ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  const total = logs.length;
  const items = logs.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
  const users = await getUsers();
  const actors = users.map((u) => ({ id: u.id, name: u.name, username: u.username }));
  const actions = [...new Set((await getAuditLogs()).map((l) => l.action))].sort();

  return NextResponse.json({ items, total, page, pageSize, actors, actions });
}
