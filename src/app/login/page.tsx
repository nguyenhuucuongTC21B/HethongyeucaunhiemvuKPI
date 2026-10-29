"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, LogIn, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginResponse {
  user: { role: string; mustChangePassword?: boolean };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextUrl = searchParams.get("next") || "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        json: { identifier, password },
      });
      const role = data.user.role;
      const dest =
        nextUrl && nextUrl.startsWith("/")
          ? nextUrl
          : role === "admin"
            ? "/admin/kpi"
            : role === "technician"
              ? "/tasks"
              : "/my-proposals";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b-4 border-agency bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10">
            <Landmark className="h-5 w-5" aria-hidden />
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
            <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
            </span>
            <CardTitle className="font-serif text-xl text-primary">Đăng nhập hệ thống</CardTitle>
            <CardDescription>
              Dùng tên đăng nhập hoặc số CCCD đã được cấp. Tài khoản do Quản trị viên tạo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="identifier">
                  Tên đăng nhập <span className="text-agency">*</span>
                </Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  placeholder="Ví dụ: nguvan hoặc 012345678901"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Mật khẩu <span className="text-agency">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? "Đang kiểm tra..." : "Đăng nhập"}
              </Button>
              <p className="text-center text-sm">
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border bg-card py-3">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Viện Kiểm sát nhân dân Thành phố — Chỉ dùng cho mục đích công vụ
        </p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
