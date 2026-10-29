import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { computeTechnicianKpis } from "@/lib/kpi";
import { getSettings, getTasks, getUsers } from "@/lib/storage";
import type { KpiFilter } from "@/lib/kpi";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1A3A5C" } };

/** GET: xuất báo cáo KPI ra Excel (Admin) */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên có quyền này" }, { status: 403 });

  const url = new URL(req.url);
  const filter: KpiFilter = {
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    department: url.searchParams.get("department") || undefined,
    taskType: url.searchParams.get("taskType") || undefined,
  };

  const settings = await getSettings();
  const users = await getUsers();
  const tasks = await getTasks();
  const technicians = users
    .filter((u) => u.role === "technician" || u.role === "admin")
    .map((t) => ({ id: t.id, name: t.name, department: t.department }));

  const kpis = computeTechnicianKpis(tasks, technicians, filter, settings.kpiWeights)
    .sort((a, b) => b.kpiScore - a.kpiScore);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Hệ thống QLNV - KPI";
  wb.created = new Date();

  const ws = wb.addWorksheet("Báo cáo KPI");
  ws.columns = [
    { header: "Hạng", key: "rank", width: 8 },
    { header: "Kỹ thuật viên", key: "name", width: 26 },
    { header: "Đơn vị", key: "department", width: 20 },
    { header: "Được giao", key: "assigned", width: 12 },
    { header: "Đã tiếp nhận", key: "received", width: 14 },
    { header: "Hoàn thành", key: "completed", width: 12 },
    { header: "Đang xử lý", key: "inProgress", width: 12 },
    { header: "Từ chối", key: "rejected", width: 10 },
    { header: "Quá hạn", key: "overdue", width: 10 },
    { header: "Tỷ lệ HT (%)", key: "completionRate", width: 12 },
    { header: "TB giờ xử lý", key: "avgHours", width: 14 },
    { header: "Tỷ lệ đúng hạn (%)", key: "onTimeRate", width: 16 },
    { header: "Hài lòng (5*)", key: "satisfaction", width: 14 },
    { header: "Điểm KPI", key: "kpiScore", width: 12 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  ws.getRow(1).height = 30;

  kpis.forEach((k, i) => {
    ws.addRow({
      rank: i + 1,
      name: k.name,
      department: k.department,
      assigned: k.assigned,
      received: k.received,
      completed: k.completed,
      inProgress: k.inProgress,
      rejected: k.rejected,
      overdue: k.overdue,
      completionRate: Math.round(k.completionRate * 1000) / 10,
      avgHours: k.avgHours ?? "-",
      onTimeRate: k.onTimeRate !== null ? Math.round(k.onTimeRate * 1000) / 10 : "-",
      satisfaction: k.satisfaction ?? "-",
      kpiScore: k.kpiScore,
    });
  });

  // Ghi chú công thức
  const w = settings.kpiWeights;
  ws.addRow({});
  ws.addRow([
    `Công thức KPI: ${w.completion * 100}% Tỷ lệ hoàn thành + ${w.onTime * 100}% Tỷ lệ đúng hạn + ${w.satisfaction * 100}% Điểm hài lòng + ${w.volume * 100}% Khối lượng`,
  ]);
  ws.addRow([`Kỳ báo cáo: ${filter.from ?? "toàn thời gian"} → ${filter.to ?? "nay"}`]);

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `BaoCaoKPI_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
