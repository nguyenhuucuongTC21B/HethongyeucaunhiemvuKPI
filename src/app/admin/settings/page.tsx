"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Server, Settings2 } from "lucide-react";
import { api } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEFAULT_KPI_WEIGHTS } from "@/lib/constants";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user: me, system, loading: sessionLoading } = useSession();
  const [siteTitle, setSiteTitle] = useState("");
  const [siteSubtitle, setSiteSubtitle] = useState("");
  const [allowSelfAssign, setAllowSelfAssign] = useState(true);
  const [weights, setWeights] = useState({ ...DEFAULT_KPI_WEIGHTS });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionLoading && me?.role !== "admin") router.push("/");
  }, [me, sessionLoading, router]);

  useEffect(() => {
    if (!me?.role || me.role !== "admin") return;
    api<{
      settings: {
        siteTitle: string;
        siteSubtitle: string;
        allowSelfAssign: boolean;
        kpiWeights: typeof DEFAULT_KPI_WEIGHTS;
      };
      storageMode: string;
    }>("/api/settings")
      .then((d) => {
        setSiteTitle(d.settings.siteTitle);
        setSiteSubtitle(d.settings.siteSubtitle);
        setAllowSelfAssign(d.settings.allowSelfAssign);
        setWeights(d.settings.kpiWeights);
      })
      .finally(() => setLoading(false));
  }, [me]);

  const sum = weights.completion + weights.onTime + weights.satisfaction + weights.volume;

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/settings", {
        method: "PUT",
        json: { siteTitle, siteSubtitle, allowSelfAssign, kpiWeights: weights },
      });
      setMessage("Đã lưu cài đặt. Thay đổi áp dụng ngay cho toàn hệ thống.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được cài đặt");
    } finally {
      setBusy(false);
    }
  };

  if (sessionLoading || loading || !me) return <Skeleton className="h-96 w-full" />;
  if (me.role !== "admin") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-8 text-center text-destructive">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Cài đặt hệ thống"
        description="Cấu hình tiêu đề trang, phân công tự nhận và trọng số chấm điểm KPI."
        breadcrumbs={[{ label: "Cài đặt" }]}
      />

      {message && (
        <Alert className="mb-4 border-emerald-300 bg-emerald-50 text-emerald-800">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-5">
        <CardHeader className="border-b border-border/70 py-3.5">
          <CardTitle className="flex items-center gap-2 text-base text-primary">
            <Settings2 className="h-4 w-4" /> Cấu hình chung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <Label htmlFor="siteTitle">Tiêu đề cơ quan (hiển thị trên banner)</Label>
            <Input id="siteTitle" className="mt-1.5" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="siteSubtitle">Tiêu đề hệ thống</Label>
            <Input id="siteSubtitle" className="mt-1.5" value={siteSubtitle} onChange={(e) => setSiteSubtitle(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-sm border border-border p-3">
            <div>
              <p className="text-sm font-medium">Cho phép kỹ thuật viên tự nhận nhiệm vụ</p>
              <p className="text-xs text-muted-foreground">
                Khi bật, nhiệm vụ ở trạng thái “Chờ tiếp nhận” sẽ hiện trong danh sách của tất cả kỹ
                thuật viên để tự nhận.
              </p>
            </div>
            <Switch checked={allowSelfAssign} onCheckedChange={setAllowSelfAssign} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardHeader className="border-b border-border/70 py-3.5">
          <CardTitle className="text-base text-primary">Trọng số điểm KPI</CardTitle>
          <p className="text-xs text-muted-foreground">
            Tổng 4 trọng số phải bằng 1. Công thức: Điểm KPI = w1×Tỷ lệ hoàn thành + w2×Tỷ lệ đúng
            hạn + w3×Điểm hài lòng + w4×Khối lượng.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "completion" as const, label: "Tỷ lệ hoàn thành", hint: "Hoàn thành / được giao" },
              { key: "onTime" as const, label: "Tỷ lệ đúng hạn", hint: "Hoàn thành trước thời hạn mong muốn" },
              { key: "satisfaction" as const, label: "Điểm hài lòng", hint: "Từ đánh giá sao của người gửi" },
              { key: "volume" as const, label: "Khối lượng công việc", hint: "So với kỹ thuật viên có số việc hoàn thành cao nhất" },
            ].map((w) => (
              <div key={w.key}>
                <Label htmlFor={`w-${w.key}`}>
                  {w.label} <span className="text-xs text-muted-foreground">({w.hint})</span>
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    id={`w-${w.key}`}
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={weights[w.key]}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [w.key]: Number(e.target.value) || 0 }))
                    }
                  />
                  <span className="w-14 text-sm font-semibold text-primary">
                    {Math.round(weights[w.key] * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p
            className={`mt-3 text-sm font-medium ${
              Math.abs(sum - 1) <= 0.001 ? "text-emerald-700" : "text-destructive"
            }`}
          >
            Tổng trọng số: {sum.toFixed(2)} {Math.abs(sum - 1) <= 0.001 ? "✓" : "— phải bằng 1.00"}
          </p>
        </CardContent>
      </Card>

      {system && (
        <Card className="mb-5">
          <CardHeader className="border-b border-border/70 py-3.5">
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Server className="h-4 w-4" /> Trạng thái hạ tầng
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 pt-4 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Nơi lưu trữ dữ liệu:</span>{" "}
              <strong>
                {system.storageMode === "drive"
                  ? "Google Drive (file JSON vĩnh viễn)"
                  : "File cục bộ (chưa cấu hình Google Drive — xem README)"}
              </strong>
            </p>
            <p>
              <span className="text-muted-foreground">Email thông báo (SMTP):</span>{" "}
              <strong>{system.mailEnabled ? "Đã bật" : "Chưa cấu hình / tắt"}</strong>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button onClick={save} disabled={busy || Math.abs(sum - 1) > 0.001}>
          <Save className="mr-2 h-4 w-4" />
          {busy ? "Đang lưu..." : "Lưu cài đặt"}
        </Button>
      </div>
    </div>
  );
}
