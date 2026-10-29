import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { getTasks } from "@/lib/storage";
import type { Task } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1A3A5C" } };

/** GET: xuất danh sách nhiệm vụ ra Excel (Admin — toàn bộ hoặc theo bộ lọc) */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "Chỉ Quản trị viên có quyền này" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const type = url.searchParams.get("type") || "";
  const department = url.searchParams.get("department") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  let tasks = await getTasks();
  if (status) tasks = tasks.filter((t) => t.status === status);
  if (type) tasks = tasks.filter((t) => t.type === type);
  if (department) tasks = tasks.filter((t) => t.department === department);
  if (from) tasks = tasks.filter((t) => t.createdAt >= new Date(`${from}T00:00:00`).toISOString());
  if (to) tasks = tasks.filter((t) => t.createdAt <= new Date(`${to}T23:59:59.999`).toISOString());
  if (q) {
    tasks = tasks.filter((t) =>
      [t.code, t.title, t.description, t.requesterName, t.department].join(" ").toLowerCase().includes(q)
    );
  }
  tasks = tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const fmt = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = "Hệ thống QLNV";
  const ws = wb.addWorksheet("Nhiệm vụ");
  ws.columns = [
    { header: "Mã NV", key: "code", width: 14 },
    { header: "Loại nhiệm vụ", key: "type", width: 32 },
    { header: "Tiêu đề", key: "title", width: 38 },
    { header: "Người đề xuất", key: "requesterName", width: 22 },
    { header: "Phòng ban", key: "department", width: 18 },
    { header: "Mức khẩn", key: "urgency", width: 12 },
    { header: "Trạng thái", key: "status", width: 15 },
    { header: "Kỹ thuật viên", key: "assigneeName", width: 20 },
    { header: "Thời gian gửi", key: "createdAt", width: 18 },
    { header: "Thời hạn mong muốn", key: "desiredDeadline", width: 18 },
    { header: "Hoàn thành", key: "completedAt", width: 18 },
    { header: "Số giờ xử lý", key: "hours", width: 13 },
    { header: "Đánh giá", key: "rating", width: 10 },
  ];
  ws.getRow(1).eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  ws.getRow(1).height = 28;

  tasks.forEach((t: Task) => {
    let hours = "";
    if (t.status === "Hoàn thành" && t.completedAt) {
      const from2 = t.receivedAt
        ? new Date(t.receivedAt).getTime()
        : new Date(t.createdAt).getTime();
      hours = ((new Date(t.completedAt).getTime() - from2) / 3_600_000).toFixed(1);
    }
    ws.addRow({
      code: t.code,
      type: t.type,
      title: t.title,
      requesterName: t.requesterName,
      department: t.department,
      urgency: t.urgency,
      status: t.status,
      assigneeName: t.assigneeName ?? "",
      createdAt: fmt(t.createdAt),
      desiredDeadline: fmt(t.desiredDeadline),
      completedAt: fmt(t.completedAt),
      hours,
      rating: t.rating ? `${t.rating.stars}/5` : "",
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `DanhSachNhiemVu_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
