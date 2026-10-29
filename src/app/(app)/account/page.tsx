"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { KeyRound, ShieldAlert } from "lucide-react";
import { api } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

function AccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refresh } = useSession();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/account");
  }, [user, loading, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirm) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        json: { oldPassword, newPassword },
      });
      setSuccess("Đổi mật khẩu thành công.");
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được mật khẩu");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <Skeleton className="h-96 w-full" />;
  const mustChange = user.mustChangePassword || searchParams.get("force") === "1";

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Tài khoản của tôi"
        description="Thông tin tài khoản và đổi mật khẩu."
        breadcrumbs={[{ label: "Tài khoản" }]}
      />

      {mustChange && (
        <Alert className="mb-4 border-amber-300 bg-amber-50">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Quản trị viên đã đặt lại mật khẩu cho bạn. Vui lòng đổi mật khẩu mới ngay để bảo mật tài
            khoản.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-5">
        <CardHeader className="border-b border-border/70 py-3.5">
          <CardTitle className="text-base text-primary">Thông tin tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-2 pt-4 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Họ tên:</span> <strong>{user.name}</strong></p>
          <p><span className="text-muted-foreground">Tên đăng nhập:</span> <strong>{user.username}</strong></p>
          <p><span className="text-muted-foreground">Chức danh:</span> {user.title}</p>
          <p><span className="text-muted-foreground">Đơn vị:</span> {user.department}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/70 py-3.5">
          <CardTitle className="text-base text-primary">Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-emerald-300 bg-emerald-50 text-emerald-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="oldPassword">Mật khẩu hiện tại *</Label>
              <Input
                id="oldPassword"
                type="password"
                className="mt-1.5"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="newPassword">
                Mật khẩu mới * <span className="text-xs text-muted-foreground">(≥ 8 ký tự, gồm chữ cái và chữ số)</span>
              </Label>
              <Input
                id="newPassword"
                type="password"
                className="mt-1.5"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm">Nhập lại mật khẩu mới *</Label>
              <Input
                id="confirm"
                type="password"
                className="mt-1.5"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
              <KeyRound className="mr-2 h-4 w-4" />
              {busy ? "Đang lưu..." : "Xác nhận đổi mật khẩu"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AccountForm />
    </Suspense>
  );
}
