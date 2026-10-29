"use client";

import { KpiDashboard } from "@/components/kpi-dashboard";

export default function AdminKpiPage() {
  return (
    <KpiDashboard
      scope="admin"
      title="Dashboard thống kê - KPI"
      description="Thống kê khối lượng công việc và đánh giá KPI theo kỹ thuật viên, phòng ban, loại nhiệm vụ và khoảng thời gian."
    />
  );
}
