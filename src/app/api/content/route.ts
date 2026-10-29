/**
 * /api/content — Quản lý nội dung công khai: tin bài, video, phần mềm chuyên ngành.
 * GET    ?type=posts|videos|software[&all=1]  — công khai (all=1 chỉ Admin)
 * POST   { type, data }                        — Admin tạo mới
 * PUT    { type, id, data }                    — Admin cập nhật
 * DELETE ?type=&id=                            — Admin xóa
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/audit";
import { newId } from "@/lib/storage";
import {
  getPosts,
  getSoftware,
  getVideos,
  updatePosts,
  updateSoftware,
  updateVideos,
} from "@/lib/storage";
import type { Post, SoftwareLink, VideoItem } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContentType = "posts" | "videos" | "software";

function isType(v: string | null): v is ContentType {
  return v === "posts" || v === "videos" || v === "software";
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/(embed|shorts|live)\/([^/]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  if (!isType(type)) {
    return NextResponse.json({ error: "Thiếu hoặc sai tham số type" }, { status: 400 });
  }
  const wantAll = url.searchParams.get("all") === "1";
  if (wantAll) {
    const admin = await getCurrentUser(req);
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Chỉ Quản trị viên xem được bản nháp" }, { status: 403 });
    }
  }

  const sortFn = <T extends { pinned?: boolean; createdAt: string }>(list: T[]): T[] =>
    [...list].sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      return b.createdAt.localeCompare(a.createdAt);
    });

  if (type === "posts") {
    const list = await getPosts();
    return NextResponse.json({ items: sortFn(wantAll ? list : list.filter((p) => p.published)) });
  }
  if (type === "videos") {
    const list = await getVideos();
    return NextResponse.json({ items: wantAll ? list : list.filter((v) => v.published) });
  }
  const list = await getSoftware();
  return NextResponse.json({ items: wantAll ? list : list.filter((s) => s.published) });
}

export async function POST(req: Request) {
  const admin = await getCurrentUser(req);
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Chỉ Quản trị viên được đăng nội dung" }, { status: 403 });
  }
  const ip = clientIp(req);
  const body = (await req.json()) as { type?: string; data?: Record<string, unknown> };
  const type = body.type ?? "";
  if (!["posts", "videos", "software"].includes(type)) {
    return NextResponse.json({ error: "Loại nội dung không hợp lệ" }, { status: 400 });
  }
  const d = body.data ?? {};
  const now = new Date().toISOString();
  const id = newId("cnt");

  if (type === "posts") {
    const title = String(d.title ?? "").trim();
    if (title.length < 5 || title.length > 200) {
      return NextResponse.json({ error: "Tiêu đề tin bài phải từ 5 đến 200 ký tự" }, { status: 400 });
    }
    const content = String(d.content ?? "").trim();
    if (content.length < 10) {
      return NextResponse.json({ error: "Nội dung tin bài quá ngắn (tối thiểu 10 ký tự)" }, { status: 400 });
    }
    const post: Post = {
      id,
      title,
      summary: String(d.summary ?? "").trim().slice(0, 500),
      content,
      category: String(d.category ?? "").trim() || undefined,
      coverMediaId: d.coverMediaId ? String(d.coverMediaId) : null,
      pinned: Boolean(d.pinned),
      published: d.published === undefined ? true : Boolean(d.published),
      authorName: admin.name,
      createdAt: now,
      updatedAt: now,
    };
    await updatePosts((list) => {
      list.push(post);
      return true;
    });
    await writeAudit({ actor: admin, action: "post_create", entityType: "post", entityId: id, detail: `Đăng tin bài: ${title}`, ip });
    return NextResponse.json({ item: post }, { status: 201 });
  }

  if (type === "videos") {
    const title = String(d.title ?? "").trim();
    const url = safeUrl(String(d.youtubeUrl ?? "").trim());
    if (title.length < 3) {
      return NextResponse.json({ error: "Tiêu đề video quá ngắn" }, { status: 400 });
    }
    if (!url || !extractYouTubeId(url)) {
      return NextResponse.json(
        { error: "Link video phải là đường dẫn YouTube hợp lệ (youtube.com/watch?v=... hoặc youtu.be/...)" },
        { status: 400 }
      );
    }
    const video: VideoItem = {
      id,
      title,
      description: String(d.description ?? "").trim() || undefined,
      youtubeUrl: url,
      published: d.published === undefined ? true : Boolean(d.published),
      createdAt: now,
      updatedAt: now,
    };
    await updateVideos((list) => {
      list.push(video);
      return true;
    });
    await writeAudit({ actor: admin, action: "video_create", entityType: "video", entityId: id, detail: `Đăng video: ${title}`, ip });
    return NextResponse.json({ item: video }, { status: 201 });
  }

  const name = String(d.name ?? "").trim();
  const url = safeUrl(String(d.url ?? "").trim());
  if (name.length < 2) {
    return NextResponse.json({ error: "Tên phần mềm quá ngắn" }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: "Link phần mềm phải là URL hợp lệ bắt đầu bằng http(s)://" }, { status: 400 });
  }
  const sw: SoftwareLink = {
    id,
    name,
    description: String(d.description ?? "").trim() || undefined,
    url,
    category: String(d.category ?? "").trim() || undefined,
    published: d.published === undefined ? true : Boolean(d.published),
    createdAt: now,
    updatedAt: now,
  };
  await updateSoftware((list) => {
    list.push(sw);
    return true;
  });
  await writeAudit({ actor: admin, action: "software_create", entityType: "software", entityId: id, detail: `Thêm phần mềm: ${name}`, ip });
  return NextResponse.json({ item: sw }, { status: 201 });
}

export async function PUT(req: Request) {
  const admin = await getCurrentUser(req);
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Chỉ Quản trị viên được sửa nội dung" }, { status: 403 });
  }
  const ip = clientIp(req);
  const body = (await req.json()) as { type?: string; id?: string; data?: Record<string, unknown> };
  const type = body.type ?? "";
  const id = body.id ?? "";
  if (!["posts", "videos", "software"].includes(type) || !id) {
    return NextResponse.json({ error: "Thiếu tham số type/id" }, { status: 400 });
  }
  const d = body.data ?? {};
  const now = new Date().toISOString();
  let updated = false;

  if (type === "posts") {
    await updatePosts((list) => {
      const p = list.find((x) => x.id === id);
      if (!p) return false;
      if (d.title !== undefined) p.title = String(d.title).trim() || p.title;
      if (d.summary !== undefined) p.summary = String(d.summary).trim().slice(0, 500);
      if (d.content !== undefined) p.content = String(d.content).trim() || p.content;
      if (d.category !== undefined) p.category = String(d.category).trim() || undefined;
      if (d.coverMediaId !== undefined) p.coverMediaId = d.coverMediaId ? String(d.coverMediaId) : null;
      if (d.pinned !== undefined) p.pinned = Boolean(d.pinned);
      if (d.published !== undefined) p.published = Boolean(d.published);
      p.updatedAt = now;
      updated = true;
      return true;
    });
  } else if (type === "videos") {
    await updateVideos((list) => {
      const v = list.find((x) => x.id === id);
      if (!v) return false;
      if (d.title !== undefined) v.title = String(d.title).trim() || v.title;
      if (d.description !== undefined) v.description = String(d.description).trim() || undefined;
      if (d.youtubeUrl !== undefined) {
        const url = safeUrl(String(d.youtubeUrl).trim());
        if (!url || !extractYouTubeId(url)) {
          return false;
        }
        v.youtubeUrl = url;
      }
      if (d.published !== undefined) v.published = Boolean(d.published);
      v.updatedAt = now;
      updated = true;
      return true;
    });
  } else {
    await updateSoftware((list) => {
      const s = list.find((x) => x.id === id);
      if (!s) return false;
      if (d.name !== undefined) s.name = String(d.name).trim() || s.name;
      if (d.description !== undefined) s.description = String(d.description).trim() || undefined;
      if (d.url !== undefined) {
        const url = safeUrl(String(d.url).trim());
        if (!url) return false;
        s.url = url;
      }
      if (d.category !== undefined) s.category = String(d.category).trim() || undefined;
      if (d.published !== undefined) s.published = Boolean(d.published);
      s.updatedAt = now;
      updated = true;
      return true;
    });
  }

  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy nội dung cần sửa" }, { status: 404 });
  }
  await writeAudit({ actor: admin, action: "content_update", entityType: type, entityId: id, detail: "Cập nhật nội dung công khai", ip });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await getCurrentUser(req);
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Chỉ Quản trị viên được xóa nội dung" }, { status: 403 });
  }
  const ip = clientIp(req);
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id") ?? "";
  if (!isType(type) || !id) {
    return NextResponse.json({ error: "Thiếu tham số type/id" }, { status: 400 });
  }
  let deleted = false;
  if (type === "posts") {
    await updatePosts((list) => {
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return false;
      list.splice(idx, 1);
      deleted = true;
      return true;
    });
  } else if (type === "videos") {
    await updateVideos((list) => {
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return false;
      list.splice(idx, 1);
      deleted = true;
      return true;
    });
  } else {
    await updateSoftware((list) => {
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return false;
      list.splice(idx, 1);
      deleted = true;
      return true;
    });
  }
  if (!deleted) {
    return NextResponse.json({ error: "Không tìm thấy nội dung cần xóa" }, { status: 404 });
  }
  await writeAudit({ actor: admin, action: "content_delete", entityType: type, entityId: id, detail: "Xóa nội dung công khai", ip });
  return NextResponse.json({ ok: true });
}
