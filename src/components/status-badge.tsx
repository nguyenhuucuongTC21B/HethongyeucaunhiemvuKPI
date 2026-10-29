"use client";

import { STATUS_COLORS } from "@/lib/constants";
import type { TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap font-medium", STATUS_COLORS[status] ?? "", className)}
    >
      {status as TaskStatus}
    </Badge>
  );
}

export function UrgencyBadge({ urgency, className }: { urgency: string; className?: string }) {
  const map: Record<string, string> = {
    "Bình thường": "bg-slate-100 text-slate-700 border-slate-300",
    "Gấp": "bg-orange-100 text-orange-800 border-orange-300",
    "Rất gấp": "bg-red-100 text-red-800 border-red-300 font-semibold",
  };
  return (
    <Badge variant="outline" className={cn(map[urgency] ?? "", className)}>
      {urgency}
    </Badge>
  );
}
