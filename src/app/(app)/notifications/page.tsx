"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { api, formatDateTime } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: NotificationItem[] }>("/api/notifications?limit=50");
      setItems(data.items);
      await api("/api/notifications", { method: "POST", json: { all: true } });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading && user) void load();
  }, [user, sessionLoading, load]);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login?next=/notifications");
  }, [user, sessionLoading, router]);

  if (sessionLoading || loading || !user) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Thông báo"
        description="Toàn bộ thông báo của hệ thống gửi đến bạn. Mở trang này sẽ đánh dấu tất cả đã đọc."
        breadcrumbs={[{ label: "Thông báo" }]}
      />
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16 text-muted-foreground">
          <Bell className="mb-2 h-10 w-10 opacity-40" aria-hidden />
          <p className="text-sm">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => (
            <Card key={n.id} className={cn(!n.read && "border-l-4 border-l-primary")}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground/80">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
                {n.taskId && (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link href={`/tasks/${n.taskId}`}>Xem nhiệm vụ</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
