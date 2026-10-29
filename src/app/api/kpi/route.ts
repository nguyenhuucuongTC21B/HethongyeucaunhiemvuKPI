import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { computeTechnicianKpis, weeklyTrend, byTaskType, overallSummary, departmentHeatmap } from "@/lib/kpi";
import { DEPARTMENTS } from "@/lib/constants";
import { getSettings, getTasks, getUsers } from "@/lib/storage";
import type { KpiFilter } from "@/lib/kpi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: dữ liệu KPI — Admin xem toàn bộ, Kỹ thuật viên xem cá nhân */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const url = new URL(req.url);
  const filter: KpiFilter = {
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    technicianId: url.searchParams.get("technicianId") || undefined,
    department: url.searchParams.get("department") || undefined,
    taskType: url.searchParams.get("taskType") || undefined,
  };

  const settings = await getSettings();
  const users = await getUsers();
  const tasks = await getTasks();

  // KPI cho danh sách kỹ thuật viên
  let technicians = users.filter((u) => u.role === "technician" || u.role === "admin");
  if (user.role !== "admin") {
    // Kỹ thuật viên chỉ xem KPI cá nhân
    technicians = technicians.filter((t) => t.id === user.id);
    filter.technicianId = user.id;
  } else if (filter.technicianId) {
    technicians = technicians.filter((t) => t.id === filter.technicianId);
  }

  const kpis = computeTechnicianKpis(
    tasks,
    technicians.map((t) => ({ id: t.id, name: t.name, department: t.department })),
    filter,
    settings.kpiWeights
  ).sort((a, b) => b.kpiScore - a.kpiScore);

  // Nhiệm vụ dùng cho biểu đồ tổng quan (theo bộ lọc thời gian/phòng ban/loại)
  let filteredTasks = tasks;
  if (filter.from) filteredTasks = filteredTasks.filter((t) => t.createdAt >= new Date(`${filter.from}T00:00:00`).toISOString());
  if (filter.to) filteredTasks = filteredTasks.filter((t) => t.createdAt <= new Date(`${filter.to}T23:59:59.999`).toISOString());
  if (filter.department) filteredTasks = filteredTasks.filter((t) => t.department === filter.department);
  if (filter.taskType) filteredTasks = filteredTasks.filter((t) => t.type === filter.taskType);
  if (user.role !== "admin" && filter.technicianId) {
    filteredTasks = filteredTasks.filter((t) => t.assigneeId === user.id);
  }

  const ranking = kpis.map((k, i) => ({ rank: i + 1, userId: k.userId, name: k.name, kpiScore: k.kpiScore }));

  return NextResponse.json({
    kpis,
    ranking,
    summary: overallSummary(filteredTasks),
    weekly: weeklyTrend(filteredTasks),
    byType: byTaskType(filteredTasks),
    heatmap: departmentHeatmap(filteredTasks, DEPARTMENTS),
    weights: settings.kpiWeights,
  });
}
