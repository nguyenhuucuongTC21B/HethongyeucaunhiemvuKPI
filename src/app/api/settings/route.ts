import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/audit";
import { DEFAULT_KPI_WEIGHTS } from "@/lib/constants";
import { getSettings, storageMode, updateSettings } from "@/lib/storage";
import type { KpiWeights } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: cài đặt hệ thống (mọi người dùng đã đăng nhập đều đọc được) */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const s = await getSettings();
  return NextResponse.json({
    settings: s,
    storageMode: storageMode(),
  });
}

/** PUT: cập nhật cài đặt (chỉ Admin) — trọng số KPI, tự nhận nhiệm vụ, tiêu đề trang */
export async function PUT(req: Request) {
  const admin = await getCurrentUser(req);
  if (!admin) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên có quyền này" }, { status: 403 });
  const ip = clientIp(req);

  const body = (await req.json()) as {
    siteTitle?: string;
    siteSubtitle?: string;
    allowSelfAssign?: boolean;
    kpiWeights?: Partial<KpiWeights>;
  };

  const weights: KpiWeights = {
    completion: Number(body.kpiWeights?.completion ?? DEFAULT_KPI_WEIGHTS.completion),
    onTime: Number(body.kpiWeights?.onTime ?? DEFAULT_KPI_WEIGHTS.onTime),
    satisfaction: Number(body.kpiWeights?.satisfaction ?? DEFAULT_KPI_WEIGHTS.satisfaction),
    volume: Number(body.kpiWeights?.volume ?? DEFAULT_KPI_WEIGHTS.volume),
  };
  const sum = weights.completion + weights.onTime + weights.satisfaction + weights.volume;
  if (Math.abs(sum - 1) > 0.001) {
    return NextResponse.json(
      { error: `Tổng 4 trọng số KPI phải bằng 1 (hiện tại = ${sum.toFixed(2)})` },
      { status: 400 }
    );
  }
  for (const v of Object.values(weights)) {
    if (!Number.isFinite(v) || v < 0 || v > 1) {
      return NextResponse.json({ error: "Trọng số phải nằm trong khoảng 0 → 1" }, { status: 400 });
    }
  }

  const before = await getSettings();
  const after = await updateSettings((s) => {
    if (body.siteTitle !== undefined) s.siteTitle = body.siteTitle.trim() || s.siteTitle;
    if (body.siteSubtitle !== undefined) s.siteSubtitle = body.siteSubtitle.trim() || s.siteSubtitle;
    if (body.allowSelfAssign !== undefined) s.allowSelfAssign = Boolean(body.allowSelfAssign);
    s.kpiWeights = weights;
    s.updatedAt = new Date().toISOString();
    return s;
  });

  await writeAudit({
    actor: admin,
    action: "settings_update",
    entityType: "settings",
    detail: "Cập nhật cài đặt hệ thống",
    before,
    after,
    ip,
  });

  return NextResponse.json({ ok: true, settings: after });
}
