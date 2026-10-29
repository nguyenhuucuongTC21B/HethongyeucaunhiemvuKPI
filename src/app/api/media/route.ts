/**
 * POST /api/media — Upload ảnh (logo, ảnh bìa tin bài). Chỉ Admin.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/audit";
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_SIZE } from "@/lib/constants";
import { newId, saveAttachment, updateMediaRecords } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const admin = await getCurrentUser(req);
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Chỉ Quản trị viên được upload ảnh" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu tệp ảnh (trường 'file')" }, { status: 400 });
    }
    if (file.size > MAX_MEDIA_SIZE) {
      return NextResponse.json(
        { error: `Ảnh quá lớn (tối đa ${Math.round(MAX_MEDIA_SIZE / 1024 / 1024)}MB)` },
        { status: 400 }
      );
    }
    if (!ALLOWED_MEDIA_TYPES.split(",").includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveAttachment({
      name: file.name,
      mime: file.type,
      buffer,
    });
    const record = {
      ...saved,
      uploadedBy: admin.name,
      createdAt: new Date().toISOString(),
      // đánh dấu id hiện có trong registry
      id: saved.id || newId("med"),
    };
    await updateMediaRecords((list) => {
      list.push(record);
      return true;
    });

    await writeAudit({
      actor: admin,
      action: "media_upload",
      entityType: "media",
      entityId: record.id,
      detail: `Upload ảnh: ${file.name} (${Math.round(file.size / 1024)}KB)`,
      ip: clientIp(req),
    });

    return NextResponse.json({ media: record }, { status: 201 });
  } catch (err) {
    console.error("[media/upload]", err);
    return NextResponse.json({ error: "Lỗi máy chủ khi tải ảnh lên" }, { status: 500 });
  }
}
