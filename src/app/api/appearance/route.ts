/**
 * GET /api/appearance — Thông tin giao diện CÔNG KHAI (không cần đăng nhập).
 * Chỉ trả về các trường hiển thị an toàn, KHÔNG chứa mã đăng ký.
 */
import { NextResponse } from "next/server";
import { getSettings, storageMode } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    return NextResponse.json({
      appearance: {
        siteTitle: s.siteTitle,
        siteSubtitle: s.siteSubtitle,
        logoMediaId: s.logoMediaId ?? null,
        themePreset: s.themePreset ?? "navy",
        primaryColor: s.primaryColor ?? "#1a3a5c",
        heroTitle: s.heroTitle ?? "",
        heroSubtitle: s.heroSubtitle ?? "",
        orgEmail: s.orgEmail ?? "",
        orgPhone: s.orgPhone ?? "",
        orgAddress: s.orgAddress ?? "",
        footerText: s.footerText ?? "",
        showNews: s.showNews !== false,
        showVideos: s.showVideos !== false,
        showSoftware: s.showSoftware !== false,
        allowRegistration: s.allowRegistration !== false,
      },
      storageMode: storageMode(),
    });
  } catch (err) {
    console.error("[appearance]", err);
    return NextResponse.json({ error: "Không đọc được cấu hình giao diện" }, { status: 500 });
  }
}
