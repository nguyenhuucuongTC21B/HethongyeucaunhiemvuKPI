"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";
import { api } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { TaskTable } from "@/components/task-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DEPARTMENTS, STATUS_LIST, TASK_TYPES, URGENCY_LEVELS } from "@/lib/constants";
import type { Task } from "@/lib/storage";

export default function TasksPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    type: "",
    department: "",
    urgency: "",
    assignee: "",
    from: "",
    to: "",
  });
  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort: "createdAt_desc",
      });
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const data = await api<{ items: Task[]; total: number }>(`/api/tasks?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (!sessionLoading && user) void load();
  }, [load, user, sessionLoading]);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login?next=/tasks");
  }, [user, sessionLoading, router]);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  if (sessionLoading || !user) return <Skeleton className="h-96 w-full" />;

  const exportUrl = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/api/tasks/export?${params}`;
  };

  return (
    <div>
      <PageHeader
        title={user.role === "admin" ? "Quản lý nhiệm vụ" : "Nhiệm vụ của tôi"}
        description={
          user.role === "admin"
            ? "Toàn bộ nhiệm vụ trong hệ thống. Phân công, theo dõi và xuất báo cáo."
            : "Danh sách nhiệm vụ được phân công và nhiệm vụ chưa phân công (nếu được cho phép nhận)."
        }
        breadcrumbs={[{ label: user.role === "admin" ? "Quản lý nhiệm vụ" : "Nhiệm vụ" }]}
        actions={
          user.role === "admin" ? (
            <Button variant="outline" asChild>
              <a href={exportUrl()}>
                <Download className="mr-1.5 h-4 w-4" /> Xuất Excel
              </a>
            </Button>
          ) : undefined
        }
      />

      {/* Bộ lọc nâng cao */}
      <div className="mb-4 rounded-md border border-border bg-card p-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Tìm theo mã, tiêu đề, người đề xuất..."
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
            />
          </div>
          <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.type || "all"} onValueChange={(v) => setFilter("type", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Loại nhiệm vụ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {TASK_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.department || "all"} onValueChange={(v) => setFilter("department", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Phòng ban" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.urgency || "all"} onValueChange={(v) => setFilter("urgency", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Mức khẩn cấp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mức khẩn</SelectItem>
              {URGENCY_LEVELS.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {user.role === "admin" ? (
            <Select value={filters.assignee || "all"} onValueChange={(v) => setFilter("assignee", v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Người phụ trách" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả người phụ trách</SelectItem>
                <SelectItem value="unassigned">Chưa phân công</SelectItem>
                <SelectItem value="me">Do tôi tạo</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select value={filters.assignee || "all"} onValueChange={(v) => setFilter("assignee", v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Phạm vi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhiệm vụ của tôi</SelectItem>
                <SelectItem value="me">Được giao cho tôi</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="sr-only" htmlFor="from">Từ ngày</Label>
              <Input
                id="from"
                type="date"
                value={filters.from}
                onChange={(e) => setFilter("from", e.target.value)}
                aria-label="Từ ngày"
              />
            </div>
            <div>
              <Label className="sr-only" htmlFor="to">Đến ngày</Label>
              <Input
                id="to"
                type="date"
                value={filters.to}
                onChange={(e) => setFilter("to", e.target.value)}
                aria-label="Đến ngày"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <TaskTable
          items={items}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          emptyLabel="Không có nhiệm vụ phù hợp bộ lọc"
        />
      )}
    </div>
  );
}
