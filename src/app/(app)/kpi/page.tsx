"use client";

import { useSession } from "@/hooks/use-session";
import { KpiDashboard } from "@/components/kpi-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function PersonalKpiPage() {
  const { user, loading } = useSession();
  if (loading || !user) return <Skeleton className="h-96 w-full" />;
  return (
    <KpiDashboard
      scope="personal"
      title="KPI cá nhân"
      description={`Chỉ số hiệu quả công việc của ${user.name} — số liệu cập nhật theo thời gian thực.`}
    />
  );
}
