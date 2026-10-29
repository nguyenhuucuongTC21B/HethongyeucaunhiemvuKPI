"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Landmark, Printer } from "lucide-react";
import { api, formatDate } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TechnicianKpi } from "@/lib/kpi";

interface KpiResponse {
  kpis: TechnicianKpi[];
  summary: { total: number; pending: number; active: number; completed: number; overdue: number; satisfaction: number | null };
  weights: { completion: number; onTime: number; satisfaction: number; volume: number };
}

function ReportContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<KpiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    ["from", "to", "technicianId", "department", "taskType"].forEach((k) => {
      const v = searchParams.get(k);
      if (v) params.set(k, v);
    });
    api<KpiResponse>(`/api/kpi?${params}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <p className="text-center text-sm text-destructive">Không tải được dữ liệu báo cáo</p>;

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  return (
    <div className="print-page mx-auto max-w-4xl bg-white p-8 shadow-md">
      <div className="mb-6 border-b-4 border-double border-[#1a3a5c] pb-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Landmark className="h-8 w-8 text-[#1a3a5c]" />
          <div>
            <p className="font-serif text-lg font-bold uppercase text-[#1a3a5c]">
              Viện Kiểm sát nhân dân Thành phố
            </p>
            <p className="text-sm text-[#8b1a1a]">Bộ phận Kỹ thuật</p>
          </div>
        </div>
        <h1 className="mt-4 font-serif text-2xl font-bold uppercase text-[#1a3a5c]">
          Báo cáo thống kê - Đánh giá KPI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kỳ báo cáo: {from ? formatDate(from) : "toàn thời gian"} → {to ? formatDate(to) : "nay"} •
          In ngày {formatDate(new Date().toISOString())}
        </p>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 font-serif text-base font-bold text-[#1a3a5c]">I. Tổng quan</h2>
        <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
          {[
            ["Tổng nhiệm vụ", data.summary.total],
            ["Chờ tiếp nhận", data.summary.pending],
            ["Đang thực hiện", data.summary.active],
            ["Hoàn thành", data.summary.completed],
            ["Quá hạn", data.summary.overdue],
            ["Hài lòng", data.summary.satisfaction !== null ? `${data.summary.satisfaction}/5` : "—"],
          ].map(([label, value]) => (
            <div key={String(label)} className="border border-gray-300 p-2.5">
              <p className="text-xs text-gray-600">{label}</p>
              <p className="text-lg font-bold text-[#1a3a5c]">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-serif text-base font-bold text-[#1a3a5c]">
          II. KPI từng kỹ thuật viên
        </h2>
        <p className="mb-2 text-xs text-gray-600">
          Công thức KPI: {data.weights.completion * 100}% tỷ lệ hoàn thành + {data.weights.onTime * 100}% tỷ
          lệ đúng hạn + {data.weights.satisfaction * 100}% điểm hài lòng + {data.weights.volume * 100}%
          khối lượng
        </p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#1a3a5c] text-white">
              <th className="border border-gray-400 p-2">Hạng</th>
              <th className="border border-gray-400 p-2">Kỹ thuật viên</th>
              <th className="border border-gray-400 p-2">Đơn vị</th>
              <th className="border border-gray-400 p-2">Được giao</th>
              <th className="border border-gray-400 p-2">Hoàn thành</th>
              <th className="border border-gray-400 p-2">Tỷ lệ HT</th>
              <th className="border border-gray-400 p-2">TB giờ</th>
              <th className="border border-gray-400 p-2">Đúng hạn</th>
              <th className="border border-gray-400 p-2">Hài lòng</th>
              <th className="border border-gray-400 p-2">Quá hạn</th>
              <th className="border border-gray-400 p-2">Điểm KPI</th>
            </tr>
          </thead>
          <tbody>
            {data.kpis.map((k, i) => (
              <tr key={k.userId} className={i % 2 ? "bg-gray-50" : ""}>
                <td className="border border-gray-400 p-1.5 text-center">{i + 1}</td>
                <td className="border border-gray-400 p-1.5 font-medium">{k.name}</td>
                <td className="border border-gray-400 p-1.5">{k.department}</td>
                <td className="border border-gray-400 p-1.5 text-center">{k.assigned}</td>
                <td className="border border-gray-400 p-1.5 text-center">{k.completed}</td>
                <td className="border border-gray-400 p-1.5 text-center">{Math.round(k.completionRate * 100)}%</td>
                <td className="border border-gray-400 p-1.5 text-center">{k.avgHours !== null ? `${k.avgHours}h` : "—"}</td>
                <td className="border border-gray-400 p-1.5 text-center">{k.onTimeRate !== null ? `${Math.round(k.onTimeRate * 100)}%` : "—"}</td>
                <td className="border border-gray-400 p-1.5 text-center">{k.satisfaction !== null ? `${k.satisfaction}/5` : "—"}</td>
                <td className="border border-gray-400 p-1.5 text-center">{k.overdue}</td>
                <td className="border border-gray-400 p-1.5 text-center font-bold text-[#1a3a5c]">{k.kpiScore}</td>
              </tr>
            ))}
            {data.kpis.length === 0 && (
              <tr>
                <td colSpan={11} className="border border-gray-400 p-4 text-center text-gray-500">
                  Chưa có dữ liệu trong kỳ báo cáo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="mt-10 flex items-end justify-between text-sm">
        <div className="text-center text-gray-600">
          <p>NGƯỜI LẬP BÁO CÁO</p>
          <p className="mt-16 border-t border-gray-400 px-8">Ký, ghi rõ họ tên</p>
        </div>
        <div className="text-center text-gray-600">
          <p>TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
          <p className="font-semibold">NGƯỜI PHÊ DUYỆT</p>
          <p className="mt-16 border-t border-gray-400 px-8">Ký, ghi rõ họ tên, chức danh</p>
        </div>
      </div>
    </div>
  );
}

export default function KpiReportPage() {
  return (
    <div className="min-h-screen bg-gray-200 py-6">
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between px-4 no-print">
        <p className="text-sm text-gray-600">
          Xem trước bản in — chọn “In / Lưu PDF” với khổ A4, bật “Hình nền” để giữ màu biểu tượng.
        </p>
        <Button onClick={() => window.print()} className="bg-[#1a3a5c]">
          <Printer className="mr-2 h-4 w-4" /> In / Lưu PDF
        </Button>
      </div>
      <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-4xl" />}>
        <ReportContent />
      </Suspense>
    </div>
  );
}
