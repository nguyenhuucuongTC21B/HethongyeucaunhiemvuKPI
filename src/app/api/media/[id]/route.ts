/**
 * GET /api/media/[id] — Phục vụ ảnh công khai (logo, ảnh bìa tin bài).
 * CHỈ trả về tệp nằm trong danh sách public (settings.logoMediaId, posts.coverMediaId)
 * — tệp đính kèm nhiệm vụ KHÔNG truy cập được từ endpoint công khai này.
 */
import { NextResponse } from "next/server";
import { findMediaRecord, getAttachment, publicMediaIds } from "@/lib/storage";
import type { AttachmentMeta } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allowed = await publicMediaIds();
    if (!allowed.has(id)) {
      return NextResponse.json(
        { error: "Không tìm thấy ảnh hoặc ảnh không được công khai" },
        { status: 404 }
      );
    }

    const record = await findMediaRecord(id);
    const meta: AttachmentMeta =
      record ?? { id, name: `media-${id}`, mime: "image/png", size: 0 };

    const { buffer } = await getAttachment(meta);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": record?.mime || meta.mime,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("[media/get]", err);
    return NextResponse.json({ error: "Lỗi khi đọc ảnh" }, { status: 500 });
  }
}
