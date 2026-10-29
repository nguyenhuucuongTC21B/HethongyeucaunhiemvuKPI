"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { api } from "@/lib/client";
import { useAppearance, logoSrcOf } from "@/components/site-header";
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
  const appearance = useAppearance();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-card shadow-lg lg:grid-cols-2">
          {/* Cột thương hiệu */}
          <aside className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,var(--primary),color-mix(in_srgb,var(--primary)_75%,#000000))] p-9 text-primary-foreground lg:flex">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #ffffff 0 2px, transparent 2px 16px)",
              }}
              aria-hidden
            />
            <div className="relative">
              <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-amber-300/60">
                { }
                <img src={logoSrcOf(appearance)} alt="Logo ngành" className="h-full w-full object-cover" />
              </span>
              <h2 className="mt-5 font-serif text-xl font-bold leading-snug">
                {appearance?.siteTitle || "VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ"}
              </h2>
              <p className="mt-1.5 text-xs uppercase tracking-wider text-primary-foreground/75">
                Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI
              </p>
            </div>
            <ul className="relative space-y-3 text-sm text-primary-foreground/85">
              {[
                "Gửi đề xuất nhiệm vụ kỹ thuật trực tuyến",
                "Theo dõi tiến độ xử lý theo từng bước",
                "Thống kê KPI minh bạch, công bằng",
                "Mật khẩu mã hóa — bảo mật chuẩn cơ quan",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-300" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <p className="relative text-[11px] text-primary-foreground/60">
              Chỉ dùng cho mục đích công vụ nội bộ
            </p>
          </aside>

          {/* Cột form */}
          <div className="p-6 sm:p-9">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 text-center lg:px-0">
                <span className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-secondary lg:hidden">
                  <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
                </span>
                <CardTitle className="font-serif text-xl text-primary">Đăng nhập hệ thống</CardTitle>
                <CardDescription>
                  Dùng tên đăng nhập hoặc số CCCD đã được cấp
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={submit} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="identifier">
                      Tên đăng nhập / CCCD <span className="text-agency">*</span>
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="h-11 w-full bg-agency font-semibold hover:bg-agency-dark"
                    disabled={loading}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {loading ? "Đang kiểm tra..." : "Đăng nhập"}
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <Link href="/forgot-password" className="text-primary hover:underline">
                      Quên mật khẩu?
                    </Link>
                    {appearance?.allowRegistration !== false && (
                      <Link
                        href="/register"
                        className="inline-flex items-center gap-1 font-semibold text-agency hover:underline"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Đăng ký tài khoản
                      </Link>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-3">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {appearance?.siteTitle || "Viện Kiểm sát nhân dân Thành phố"} — Chỉ dùng
          cho mục đích công vụ
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
