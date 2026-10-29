"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FilePlus2, Search } from "lucide-react";
import { api } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { TaskTable } from "@/components/task-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LIST, TASK_TYPES } from "@/lib/constants";
import type { Task } from "@/lib/storage";

function MyProposals() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort: "createdAt_desc",
      });
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (q.trim()) params.set("q", q.trim());
      const data = await api<{ items: Task[]; total: number }>(`/api/tasks?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, status, type, q]);

  useEffect(() => {
    if (!sessionLoading && user) void load();
  }, [load, user, sessionLoading]);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login?next=/my-proposals");
  }, [user, sessionLoading, router]);

  useEffect(() => {
    if (searchParams.get("highlight")) {
      setPage(1);
    }
  }, [searchParams]);

  if (sessionLoading || !user) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div>
      <PageHeader
        title="Đề xuất nhiệm vụ của tôi"
        description="Theo dõi trạng thái xử lý các đề xuất bạn đã gửi."
        breadcrumbs={[{ label: "Đề xuất của tôi" }]}
        actions={
          <Button asChild className="bg-agency hover:bg-agency-dark">
            <Link href="/proposal">
              <FilePlus2 className="mr-1.5 h-4 w-4" /> Gửi đề xuất mới
            </Link>
          </Button>
        }
      />

      {/* Bộ lọc */}
      <div className="mb-4 grid gap-2.5 rounded-md border border-border bg-card p-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tìm theo mã, tiêu đề, nội dung..."
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        <Select
          value={status || "all"}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v === "all" ? "" : v);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {STATUS_LIST.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type || "all"}
          onValueChange={(v) => {
            setPage(1);
            setType(v === "all" ? "" : v);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Loại nhiệm vụ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại nhiệm vụ</SelectItem>
            {TASK_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          emptyLabel="Bạn chưa gửi đề xuất nào. Bấm “Gửi đề xuất mới” để bắt đầu."
        />
      )}
    </div>
  );
}

export default function MyProposalsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <MyProposals />
    </Suspense>
  );
}
