"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", { method: "POST", json: { token, newPassword: password } });
      alert("Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="font-serif text-xl text-primary">Đặt lại mật khẩu</CardTitle>
        <CardDescription>
          {token
            ? "Nhập mật khẩu mới cho tài khoản của bạn. Mật khẩu phải có ít nhất 8 ký tự, chứa chữ cái và chữ số."
            : "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {token && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Mật khẩu mới <span className="text-agency">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">
                Nhập lại mật khẩu <span className="text-agency">*</span>
              </Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "Đang lưu..." : "Xác nhận đặt lại mật khẩu"}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Quay lại trang đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b-4 border-agency bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10">
            <KeyRound className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-serif text-sm font-bold sm:text-base">
            VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ
          </p>
        </div>
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
      </main>
    </div>
  );
}
