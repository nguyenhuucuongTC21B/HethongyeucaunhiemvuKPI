"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await api<{ message?: string }>("/api/auth/forgot-password", {
        method: "POST",
        json: { identifier },
      });
      setMessage(
        data.message ??
          "Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi qua email. Nếu chưa cấu hình email, vui lòng liên hệ Quản trị viên."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b-4 border-agency bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10">
            <KeyRound className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-serif text-sm font-bold sm:text-base">
              VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ
            </p>
            <p className="text-xs text-primary-foreground/80">
              Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI
            </p>
          </div>
        </div>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-xl text-primary">Quên mật khẩu</CardTitle>
            <CardDescription>
              Nhập tên đăng nhập hoặc CCCD. Hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu qua email
              (nếu đã cấu hình), hoặc Quản trị viên sẽ đặt lại giúp bạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="identifier">
                  Tên đăng nhập hoặc CCCD <span className="text-agency">*</span>
                </Label>
                <Input
                  id="identifier"
                  placeholder="Ví dụ: nguvan hoặc 012345678901"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? "Đang xử lý..." : "Gửi yêu cầu đặt lại mật khẩu"}
              </Button>
              <p className="text-center text-sm">
                <Link href="/login" className="inline-flex items-center text-primary hover:underline">
                  <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại đăng nhập
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border bg-card py-3">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Viện Kiểm sát nhân dân Thành phố
        </p>
      </footer>
    </div>
  );
}
