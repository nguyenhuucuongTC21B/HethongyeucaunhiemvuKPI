"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import { api, formatDateTime } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@/lib/storage";

const ACTION_LABELS: Record<string, string> = {
  login: "Đăng nhập",
  login_failed: "Đăng nhập thất bại",
  logout: "Đăng xuất",
  task_create: "Tạo nhiệm vụ",
  task_update: "Sửa nhiệm vụ",
  task_delete: "Xóa nhiệm vụ",
  task_status_change: "Đổi trạng thái",
  task_assign: "Phân công",
  task_unassign: "Thu hồi phân công",
  task_rate: "Đánh giá",
  user_create: "Tạo tài khoản",
  user_update: "Sửa tài khoản",
  user_delete: "Xóa tài khoản",
  user_lock: "Khóa tài khoản",
  user_unlock: "Mở khóa",
  user_reset_password: "Đặt lại mật khẩu",
  user_set_role: "Đổi vai trò",
  settings_update: "Cập nhật cài đặt",
};

function AuditPage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [actors, setActors] = useState<{ id: string; name: string }[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({ q: "", actor: "", action: "", from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const data = await api<{ items: AuditLog[]; total: number; actors: { id: string; name: string }[]; actions: string[] }>(
        `/api/audit-logs?${params}`
      );
      setItems(data.items);
      setTotal(data.total);
      setActors(data.actors);
      setActions(data.actions);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (!sessionLoading && me?.role === "admin") void load();
  }, [load, me, sessionLoading]);

  useEffect(() => {
    if (!sessionLoading && me?.role !== "admin") router.push("/");
  }, [me, sessionLoading, router]);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  if (sessionLoading || !me) return <Skeleton className="h-96 w-full" />;
  if (me.role !== "admin") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-8 text-center text-destructive">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title="Nhật ký hoạt động"
        description="Mọi thao tác quan trọng đều được ghi lại: người thực hiện, thời gian, IP và dữ liệu trước/sau."
        breadcrumbs={[{ label: "Nhật ký hoạt động" }]}
      />

      <div className="mb-4 grid gap-2.5 rounded-md border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Tìm trong nhật ký..." value={filters.q} onChange={(e) => setFilter("q", e.target.value)} />
        </div>
        <Select value={filters.actor || "all"} onValueChange={(v) => setFilter("actor", v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Người thực hiện" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả người thực hiện</SelectItem>
            {actors.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.action || "all"} onValueChange={(v) => setFilter("action", v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Hành động" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả hành động</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] ?? a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <Label className="sr-only" htmlFor="audit-from">Từ ngày</Label>
          <Input id="audit-from" type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} aria-label="Từ ngày" />
        </div>
        <div>
          <Label className="sr-only" htmlFor="audit-to">Đến ngày</Label>
          <Input id="audit-to" type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} aria-label="Đến ngày" />
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                  <TableHead className="font-semibold text-foreground">Thời gian</TableHead>
                  <TableHead className="font-semibold text-foreground">Người thực hiện</TableHead>
                  <TableHead className="font-semibold text-foreground">Hành động</TableHead>
                  <TableHead className="hidden font-semibold text-foreground md:table-cell">Chi tiết</TableHead>
                  <TableHead className="hidden font-semibold text-foreground lg:table-cell">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      <ScrollText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      Không có bản ghi nào phù hợp
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((l) => (
                    <TableRow
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setDetail(l)}
                    >
                      <TableCell className="whitespace-nowrap text-xs">{formatDateTime(l.createdAt)}</TableCell>
                      <TableCell className="text-sm">{l.actorName}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-sm border px-1.5 py-0.5 text-xs font-medium",
                            l.action.includes("failed") || l.action.includes("delete")
                              ? "border-red-200 bg-red-50 text-red-800"
                              : l.action.includes("create")
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-sky-200 bg-sky-50 text-sky-800"
                          )}
                        >
                          {ACTION_LABELS[l.action] ?? l.action}
                        </span>
                      </TableCell>
                      <TableCell className="hidden max-w-72 truncate text-sm text-muted-foreground md:table-cell">
                        {l.detail ?? "—"}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                        {l.ip ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Trang {page}/{totalPages} — {total} bản ghi
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Trước
                </Button>
                <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Sau <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết bản ghi nhật ký</DialogTitle>
            <DialogDescription>
              {detail ? formatDateTime(detail.createdAt) : ""} — {detail?.ip}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <p><strong>Người thực hiện:</strong> {detail.actorName} ({detail.actorId})</p>
              <p><strong>Hành động:</strong> {ACTION_LABELS[detail.action] ?? detail.action}</p>
              <p><strong>Đối tượng:</strong> {detail.entityType} {detail.entityId ? `(${detail.entityId})` : ""}</p>
              {detail.detail && <p><strong>Chi tiết:</strong> {detail.detail}</p>}
              {detail.before !== undefined && (
                <div>
                  <p className="mb-1 font-semibold">Dữ liệu trước:</p>
                  <pre className="max-h-44 overflow-auto rounded-sm bg-muted p-2 text-xs">{JSON.stringify(detail.before, null, 2)}</pre>
                </div>
              )}
              {detail.after !== undefined && (
                <div>
                  <p className="mb-1 font-semibold">Dữ liệu sau:</p>
                  <pre className="max-h-44 overflow-auto rounded-sm bg-muted p-2 text-xs">{JSON.stringify(detail.after, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AuditPage />
    </Suspense>
  );
}
