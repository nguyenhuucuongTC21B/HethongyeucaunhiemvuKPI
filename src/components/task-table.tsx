"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, UrgencyBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Task } from "@/lib/storage";

export function TaskTable({
  items,
  total,
  page,
  pageSize,
  onPageChange,
  showAssignee = true,
  emptyLabel = "Không có nhiệm vụ nào",
}: {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  showAssignee?: boolean;
  emptyLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-14 text-muted-foreground">
        <Inbox className="mb-2 h-10 w-10 opacity-40" aria-hidden />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60 hover:bg-secondary/60">
              <TableHead className="w-32 font-semibold text-foreground">Mã NV</TableHead>
              <TableHead className="min-w-56 font-semibold text-foreground">Nội dung</TableHead>
              <TableHead className="hidden font-semibold text-foreground md:table-cell">
                Người đề xuất
              </TableHead>
              <TableHead className="hidden font-semibold text-foreground lg:table-cell">
                Phòng ban
              </TableHead>
              <TableHead className="font-semibold text-foreground">Trạng thái</TableHead>
              {showAssignee && (
                <TableHead className="hidden font-semibold text-foreground lg:table-cell">
                  KTV phụ trách
                </TableHead>
              )}
              <TableHead className="hidden font-semibold text-foreground xl:table-cell">
                Thời gian gửi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/40">
                <TableCell className="align-top">
                  <Link
                    href={`/tasks/${t.id}`}
                    className="font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    {t.code}
                  </Link>
                  <div className="mt-1">
                    <UrgencyBadge urgency={t.urgency} className="text-[10px]" />
                  </div>
                </TableCell>
                <TableCell className="max-w-72 align-top">
                  <Link
                    href={`/tasks/${t.id}`}
                    className="line-clamp-1 font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {t.title}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {t.type}
                  </p>
                </TableCell>
                <TableCell className="hidden align-top md:table-cell">
                  <p className="text-sm">{t.requesterName}</p>
                  <p className="text-xs text-muted-foreground">{t.department}</p>
                </TableCell>
                <TableCell className="hidden align-top text-sm lg:table-cell">
                  {t.department}
                </TableCell>
                <TableCell className="align-top">
                  <StatusBadge status={t.status} />
                </TableCell>
                {showAssignee && (
                  <TableCell className="hidden align-top text-sm lg:table-cell">
                    {t.assigneeName ?? (
                      <span className="text-muted-foreground italic">Chưa phân công</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="hidden align-top text-xs text-muted-foreground xl:table-cell">
                  {formatDateTime(t.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} trong tổng số{" "}
            {total} nhiệm vụ
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" /> Trước
            </Button>
            <span className="px-3 text-sm font-medium">
              Trang {page}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Trang sau"
            >
              Sau <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
