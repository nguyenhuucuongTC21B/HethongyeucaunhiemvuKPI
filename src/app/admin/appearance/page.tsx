"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Palette, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { clearAppearanceCache } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface AppearanceSettings {
  siteTitle: string;
  siteSubtitle: string;
  logoMediaId: string | null;
  themePreset: "navy" | "crimson" | "custom";
  primaryColor: string;
  heroTitle: string;
  heroSubtitle: string;
  orgEmail: string;
  orgPhone: string;
  orgAddress: string;
  footerText: string;
  showNews: boolean;
  showVideos: boolean;
  showSoftware: boolean;
  allowRegistration: boolean;
  techRegCode: string;
  adminRegCode: string;
}

const PREVIEW_OPTIONS: { value: "navy" | "crimson"; label: string; color: string }[] = [
  { value: "navy", label: "Xanh cổ vịt (chuẩn cơ quan)", color: "#1a3a5c" },
  { value: "crimson", label: "Đỏ đô - vàng kim", color: "#7a1616" },
];

export default function AdminAppearancePage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading } = useSession();
  const [s, setS] = useState<AppearanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionLoading && me?.role !== "admin") router.push("/");
  }, [me, sessionLoading, router]);

  useEffect(() => {
    if (!me?.role || me.role !== "admin") return;
    api<{ appearance: AppearanceSettings }>("/api/appearance")
      .then((d) => setS(d.appearance))
      .catch(() => setError("Không tải được cấu hình giao diện"))
      .finally(() => setLoading(false));
  }, [me]);

  if (sessionLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!s) return null;

  const set = <K extends keyof AppearanceSettings>(k: K, v: AppearanceSettings[K]) =>
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));

  const save = async () => {
    if (!s) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/settings", { method: "PUT", json: { ...s } });
      clearAppearanceCache();
      setMessage("Đã lưu cấu hình giao diện. Toàn bộ website áp dụng ngay.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được cấu hình");
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api<{ media: { id: string } }>("/api/media", { method: "POST", form });
      set("logoMediaId", res.media.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được logo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tùy biến giao diện website"
        description="Thay đổi logo ngành, màu sắc chủ đạo, banner trang chủ, thông tin liên hệ và chân trang — áp dụng ngay toàn hệ thống."
        breadcrumbs={[{ label: "Quản trị", href: "/admin/kpi" }, { label: "Giao diện" }]}
      />

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ============ NHẬN DIỆN ============ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-primary">
            <ImageIcon className="h-4.5 w-4.5 text-agency" aria-hidden /> Logo &amp; Nhận diện cơ quan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-5">
            <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400/60 bg-secondary">
              { }
              <img
                src={s.logoMediaId ? `/api/media/${s.logoMediaId}` : "/logo-nganh.png"}
                alt="Logo hiện tại"
                className="h-full w-full object-cover"
              />
            </span>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Logo mặc định: biểu tượng Kiểm sát nhân dân Việt Nam. Bạn có thể tải logo
                chính thức của cơ quan lên (JPG/PNG/WebP, tối đa 5MB, nên chọn hình vuông).
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Đang tải..." : "Tải logo mới lên"}
                </Button>
                {s.logoMediaId && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => set("logoMediaId", null)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Dùng logo mặc định
                  </Button>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tên cơ quan (hiển thị trên đầu trang)</Label>
              <Input value={s.siteTitle} onChange={(e) => set("siteTitle", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tên hệ thống</Label>
              <Input value={s.siteSubtitle} onChange={(e) => set("siteSubtitle", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ MÀU SẮC ============ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-primary">
            <Palette className="h-4.5 w-4.5 text-agency" aria-hidden /> Màu sắc chủ đạo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {PREVIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("themePreset", opt.value)}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 text-left transition-all",
                  s.themePreset === opt.value
                    ? "border-agency ring-1 ring-agency"
                    : "border-border hover:border-primary/40"
                )}
                aria-pressed={s.themePreset === opt.value}
              >
                <span
                  className="h-10 w-16 rounded-sm border border-black/10"
                  style={{ background: `linear-gradient(135deg, ${opt.color}, ${opt.color}cc)` }}
                  aria-hidden
                />
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Màu tùy chỉnh (#RRGGBB)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={s.primaryColor || "#1a3a5c"}
                  onChange={(e) => {
                    set("primaryColor", e.target.value);
                    set("themePreset", "custom");
                  }}
                  className="h-9 w-14 cursor-pointer rounded border border-border bg-card p-0.5"
                  aria-label="Chọn màu tùy chỉnh"
                />
                <Input
                  value={s.primaryColor || ""}
                  onChange={(e) => {
                    set("primaryColor", e.target.value);
                    set("themePreset", "custom");
                  }}
                  className="w-32 font-mono"
                  placeholder="#1a3a5c"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Chọn màu ở ô màu → chủ đề tự chuyển sang <b>Tùy chỉnh</b>. Bấm lưu để áp dụng toàn site.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ============ BANNER TRANG CHỦ ============ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-primary">Banner trang chủ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tiêu đề lớn</Label>
            <Input value={s.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Đoạn giới thiệu bên dưới</Label>
            <Textarea rows={3} value={s.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* ============ LIÊN HỆ & FOOTER ============ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-primary">Thông tin liên hệ &amp; chân trang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Email cơ quan</Label>
              <Input value={s.orgEmail} onChange={(e) => set("orgEmail", e.target.value)} placeholder="vanphong@vien.gov.vn" />
            </div>
            <div className="space-y-1.5">
              <Label>Điện thoại hỗ trợ</Label>
              <Input value={s.orgPhone} onChange={(e) => set("orgPhone", e.target.value)} placeholder="0901234567" />
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ trụ sở</Label>
              <Input value={s.orgAddress} onChange={(e) => set("orgAddress", e.target.value)} placeholder="Số ... đường ..., Quận ..., TP..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Dòng chữ chân trang (copyright)</Label>
            <Input value={s.footerText} onChange={(e) => set("footerText", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* ============ HIỂN THỊ & ĐĂNG KÝ ============ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-primary">Bật / tắt khu vực hiển thị</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: "showNews" as const, label: "Mục Tin tức - Thông báo" },
              { key: "showVideos" as const, label: "Mục Video hướng dẫn" },
              { key: "showSoftware" as const, label: "Mục Phần mềm chuyên ngành" },
              { key: "allowRegistration" as const, label: "Cho phép tự đăng ký tài khoản" },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <span className="font-medium text-foreground">{item.label}</span>
                <Switch checked={Boolean(s[item.key])} onCheckedChange={(v) => set(item.key, v)} />
              </label>
            ))}
          </div>

          <div className="rounded-md border border-amber-300/60 bg-amber-50 p-4 dark:bg-amber-950/20">
            <p className="text-sm font-semibold text-foreground">Mã đăng ký (nhạy cảm)</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Kỹ thuật viên và Quản trị viên phải nhập đúng mã tương ứng khi tự đăng ký. Đổi mã
              thường xuyên, chỉ cấp cho người đủ thẩm quyền.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mã đăng ký Kỹ thuật viên</Label>
                <Input
                  value={s.techRegCode}
                  onChange={(e) => set("techRegCode", e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mã đăng ký Quản trị viên</Label>
                <Input
                  value={s.adminRegCode}
                  onChange={(e) => set("adminRegCode", e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button
          size="lg"
          className="h-11 bg-agency px-8 font-semibold shadow-lg hover:bg-agency-dark"
          onClick={save}
          disabled={busy}
        >
          <Save className="mr-2 h-4.5 w-4.5" />
          {busy ? "Đang lưu..." : "Lưu toàn bộ cấu hình giao diện"}
        </Button>
      </div>
    </div>
  );
}
