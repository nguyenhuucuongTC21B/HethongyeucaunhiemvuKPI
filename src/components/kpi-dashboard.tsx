"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  Gauge,
  Printer,
  Star,
  Timer,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { api, formatDate } from "@/lib/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DEPARTMENTS, TASK_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TechnicianKpi } from "@/lib/kpi";

const CHART_COLORS = ["#1a3a5c", "#8b1a1a", "#4a7ba6", "#b08a3e", "#5e7a5e", "#7a5ea6", "#a6715e", "#5e86a6"];

interface KpiResponse {
  kpis: TechnicianKpi[];
  ranking: { rank: number; userId: string; name: string; kpiScore: number }[];
  summary: { total: number; pending: number; active: number; completed: number; overdue: number; satisfaction: number | null };
  weekly: { label: string; created: number; completed: number }[];
  byType: { name: string; value: number }[];
  heatmap: { department: string; count: number }[];
  weights: { completion: number; onTime: number; satisfaction: number; volume: number };
}

export function KpiDashboard({ scope, title, description }: { scope: "admin" | "personal"; title: string; description?: string }) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const [loadedParams, setLoadedParams] = useState<string>("__initial__");
  const [filters, setFilters] = useState({ from: "", to: "", technicianId: "", department: "", taskType: "" });

  const params = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return p;
  }, [filters]);

  useEffect(() => {
    let active = true;
    api<KpiResponse>(`/api/kpi?${params}`)
      .then((d) => {
        if (active) {
          setData(d);
          setLoadedParams(params.toString());
        }
      })
      .catch(() => {
        if (active) setLoadedParams(params.toString());
      });
    return () => {
      active = false;
    };
  }, [params]);

  const loading = data === null || loadedParams !== params.toString();

  const maxHeat = Math.max(1, ...(data?.heatmap.map((h) => h.count) ?? [1]));

  const setFilter = (key: keyof typeof filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: scope === "admin" ? "Dashboard KPI" : "KPI cá nhân" }]}
        actions={
          scope === "admin" ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <a href={`/api/kpi/export?${params}`}>
                  <Download className="mr-1.5 h-4 w-4" /> Xuất Excel
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/print/kpi-report?${params}`} target="_blank" rel="noopener">
                  <Printer className="mr-1.5 h-4 w-4" /> Xuất PDF
                </a>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Bộ lọc */}
      <div className="mb-5 grid gap-2.5 rounded-md border border-border bg-card p-3 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <Label className="text-xs text-muted-foreground">Từ ngày</Label>
          <Input type="date" className="mt-1" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Đến ngày</Label>
          <Input type="date" className="mt-1" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
        </div>
        {scope === "admin" && (
          <div>
            <Label className="text-xs text-muted-foreground">Kỹ thuật viên</Label>
            <Select value={filters.technicianId || "all"} onValueChange={(v) => setFilter("technicianId", v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kỹ thuật viên</SelectItem>
                {data?.kpis.map((k) => (
                  <SelectItem key={k.userId} value={k.userId}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="text-xs text-muted-foreground">Phòng ban</Label>
          <Select value={filters.department || "all"} onValueChange={(v) => setFilter("department", v === "all" ? "" : v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Loại nhiệm vụ</Label>
          <Select value={filters.taskType || "all"} onValueChange={(v) => setFilter("taskType", v === "all" ? "" : v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">Tất cả loại nhiệm vụ</SelectItem>
              {TASK_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="space-y-5">
          {/* Thẻ tổng quan */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { icon: Gauge, label: "Tổng nhiệm vụ", value: data.summary.total },
              { icon: Clock, label: "Chờ tiếp nhận", value: data.summary.pending },
              { icon: TrendingUp, label: "Đang thực hiện", value: data.summary.active },
              { icon: CheckCircle2, label: "Hoàn thành", value: data.summary.completed },
              { icon: XCircle, label: "Quá hạn", value: data.summary.overdue },
              {
                icon: Star,
                label: "Hài lòng chung",
                value: data.summary.satisfaction !== null ? `${data.summary.satisfaction}/5` : "—",
              },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-secondary text-primary">
                    <s.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Biểu đồ cột + đường */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b border-border/70 py-3.5">
                <CardTitle className="text-base text-primary">
                  Số nhiệm vụ theo kỹ thuật viên
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.kpis.map((k) => ({ name: k.name.split(" ").slice(-1)[0], "Hoàn thành": k.completed, "Được giao": k.assigned }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <ReTooltip />
                      <Legend />
                      <Bar dataKey="Được giao" fill="#4a7ba6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="Hoàn thành" fill="#1a3a5c" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border/70 py-3.5">
                <CardTitle className="text-base text-primary">Xu hướng 12 tuần gần nhất</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <ReTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="created" name="Mới tạo" stroke="#8b1a1a" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                      <Line type="monotone" dataKey="completed" name="Hoàn thành" stroke="#1a3a5c" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Biểu đồ tròn + heatmap */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b border-border/70 py-3.5">
                <CardTitle className="text-base text-primary">Phân bổ theo loại nhiệm vụ</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-80">
                  {data.byType.length === 0 ? (
                    <p className="pt-16 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.byType}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="46%"
                          outerRadius={90}
                          label={({ name, percent }) =>
                            `${String(name).slice(0, 22)}${percent ? ` (${Math.round(percent * 100)}%)` : ""}`
                          }
                          labelLine={false}
                        >
                          {data.byType.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border/70 py-3.5">
                <CardTitle className="text-base text-primary">
                  Cường độ nhiệm vụ theo phòng ban
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid max-h-80 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                  {data.heatmap.map((h) => (
                    <div key={h.department} className="flex items-center gap-2">
                      <span className="w-36 shrink-0 truncate text-xs" title={h.department}>
                        {h.department}
                      </span>
                      <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-muted">
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${(h.count / maxHeat) * 100}%`,
                            backgroundColor: h.count === 0 ? "#e5eaf0" : `rgba(26,58,92,${0.25 + 0.75 * (h.count / maxHeat)})`,
                          }}
                        />
                      </div>
                      <span className="w-7 text-right text-xs font-semibold">{h.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bảng xếp hạng / chi tiết KPI */}
          <Card>
            <CardHeader className="border-b border-border/70 py-3.5">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Award className="h-4 w-4 text-agency" />
                {scope === "admin" ? "Bảng xếp hạng KPI kỹ thuật viên" : "Chỉ số KPI của tôi"}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Công thức: {data.weights.completion * 100}% tỷ lệ hoàn thành + {data.weights.onTime * 100}% tỷ lệ đúng hạn + {data.weights.satisfaction * 100}% điểm hài lòng + {data.weights.volume * 100}% khối lượng
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                      <TableHead className="font-semibold text-foreground">#</TableHead>
                      <TableHead className="font-semibold text-foreground">Kỹ thuật viên</TableHead>
                      <TableHead className="font-semibold text-foreground">Được giao</TableHead>
                      <TableHead className="font-semibold text-foreground">Hoàn thành</TableHead>
                      <TableHead className="font-semibold text-foreground">Tỷ lệ HT</TableHead>
                      <TableHead className="hidden font-semibold text-foreground sm:table-cell">TB giờ xử lý</TableHead>
                      <TableHead className="hidden font-semibold text-foreground sm:table-cell">Đúng hạn</TableHead>
                      <TableHead className="hidden font-semibold text-foreground md:table-cell">Hài lòng</TableHead>
                      <TableHead className="font-semibold text-foreground">Quá hạn</TableHead>
                      <TableHead className="font-semibold text-foreground">Điểm KPI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.kpis.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                          Chưa có kỹ thuật viên nào trong hệ thống
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.kpis.map((k, i) => (
                        <TableRow key={k.userId} className={cn(i === 0 && data.kpis.length > 1 && "bg-amber-50/60")}>
                          <TableCell className="font-semibold">
                            {i === 0 && data.kpis.length > 1 ? "🥇" : i + 1}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{k.name}</p>
                            <p className="text-xs text-muted-foreground">{k.department}</p>
                          </TableCell>
                          <TableCell>{k.assigned}</TableCell>
                          <TableCell>{k.completed}</TableCell>
                          <TableCell>{Math.round(k.completionRate * 100)}%</TableCell>
                          <TableCell className="hidden sm:table-cell">{k.avgHours !== null ? `${k.avgHours}h` : "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {k.onTimeRate !== null ? `${Math.round(k.onTimeRate * 100)}%` : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {k.satisfaction !== null ? `${k.satisfaction}/5 (${k.satisfactionCount})` : "—"}
                          </TableCell>
                          <TableCell className={k.overdue > 0 ? "font-semibold text-destructive" : ""}>
                            {k.overdue}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-sm bg-primary px-2 py-0.5 text-sm font-bold text-white">
                              {k.kpiScore}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
