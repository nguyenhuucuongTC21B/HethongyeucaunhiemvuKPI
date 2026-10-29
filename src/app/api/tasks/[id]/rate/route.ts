import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, notifyTaskRated, writeAudit } from "@/lib/audit";
import { TASK_STATUS } from "@/lib/constants";
import { updateTasks } from "@/lib/storage";
import type { Task, TaskRating } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST: đánh giá nhiệm vụ của người gửi (1–5 sao + nhận xét) sau khi hoàn thành */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const { id } = await params;
  const ip = clientIp(req);

  const body = (await req.json()) as { stars?: number; comment?: string };
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Đánh giá phải từ 1 đến 5 sao" }, { status: 400 });
  }

  let error: string | null = null;
  let rated: Task | null = null;

  await updateTasks((list) => {
    const task = list.find((t) => t.id === id);
    if (!task) {
      error = "Không tìm thấy nhiệm vụ";
      return false;
    }
    if (task.requesterId !== user.id) {
      error = "Chỉ người gửi đề xuất mới được đánh giá";
      return false;
    }
    if (task.status !== TASK_STATUS.HOAN_THANH) {
      error = "Chỉ có thể đánh giá khi nhiệm vụ đã hoàn thành";
      return false;
    }
    const rating: TaskRating = {
      stars,
      comment: (body.comment ?? "").trim() || undefined,
      at: new Date().toISOString(),
    };
    task.rating = rating;
    task.updatedAt = new Date().toISOString();
    rated = structuredClone(task);
    return true;
  }).catch(() => undefined);

  if (error || !rated) {
    return NextResponse.json({ error: error ?? "Không thể đánh giá" }, { status: 400 });
  }

  await writeAudit({
    actor: user,
    action: "task_rate",
    entityType: "task",
    entityId: id,
    detail: `${rated.code}: đánh giá ${stars}/5 sao`,
    after: { stars, comment: body.comment },
    ip,
  });
  void notifyTaskRated(rated);

  return NextResponse.json({ ok: true, task: rated });
}
