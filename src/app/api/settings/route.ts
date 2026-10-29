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
    logoMediaId?: string | null;
    themePreset?: "navy" | "crimson" | "custom";
    primaryColor?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    orgEmail?: string;
    orgPhone?: string;
    orgAddress?: string;
    footerText?: string;
    showNews?: boolean;
    showVideos?: boolean;
    showSoftware?: boolean;
    allowRegistration?: boolean;
    techRegCode?: string;
    adminRegCode?: string;
  };

  /* --- Kiểm tra màu tùy chỉnh --- */
  let primaryColor: string | undefined;
  if (body.primaryColor !== undefined) {
    const hex = String(body.primaryColor).trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      return NextResponse.json({ error: "Màu chủ đạo phải đúng định dạng #RRGGBB" }, { status: 400 });
    }
    primaryColor = hex.toLowerCase();
  }
  if (body.themePreset !== undefined && !["navy", "crimson", "custom"].includes(body.themePreset)) {
    return NextResponse.json({ error: "Chủ đề màu không hợp lệ" }, { status: 400 });
  }

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
    if (body.kpiWeights !== undefined) s.kpiWeights = weights;
    /* --- Giao diện --- */
    if (body.logoMediaId !== undefined) s.logoMediaId = body.logoMediaId || null;
    if (body.themePreset !== undefined) s.themePreset = body.themePreset;
    if (primaryColor !== undefined) s.primaryColor = primaryColor;
    if (body.heroTitle !== undefined) s.heroTitle = body.heroTitle.trim();
    if (body.heroSubtitle !== undefined) s.heroSubtitle = body.heroSubtitle.trim();
    if (body.orgEmail !== undefined) s.orgEmail = body.orgEmail.trim();
    if (body.orgPhone !== undefined) s.orgPhone = body.orgPhone.trim();
    if (body.orgAddress !== undefined) s.orgAddress = body.orgAddress.trim();
    if (body.footerText !== undefined) s.footerText = body.footerText.trim();
    if (body.showNews !== undefined) s.showNews = Boolean(body.showNews);
    if (body.showVideos !== undefined) s.showVideos = Boolean(body.showVideos);
    if (body.showSoftware !== undefined) s.showSoftware = Boolean(body.showSoftware);
    if (body.allowRegistration !== undefined) s.allowRegistration = Boolean(body.allowRegistration);
    if (body.techRegCode !== undefined) s.techRegCode = body.techRegCode.trim();
    if (body.adminRegCode !== undefined) s.adminRegCode = body.adminRegCode.trim();
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
