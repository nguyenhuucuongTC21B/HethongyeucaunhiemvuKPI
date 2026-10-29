"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  Landmark,
  ScrollText,
  ShieldCheck,
  UserPlus,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/client";
import { useAppearance } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, TITLES } from "@/lib/constants";

type RegRole = "user" | "technician" | "admin";

const ROLE_OPTIONS: { value: RegRole; label: string; desc: string; icon: typeof UserPlus }[] = [
  {
    value: "user",
    label: "Người dùng",
    desc: "Cán bộ, công chức gửi đề xuất nhiệm vụ kỹ thuật",
    icon: UserPlus,
  },
  {
    value: "technician",
    label: "Kỹ thuật viên",
    desc: "Tiếp nhận, xử lý và báo cáo nhiệm vụ (cần mã đăng ký)",
    icon: Wrench,
  },
  {
    value: "admin",
    label: "Quản trị viên",
    desc: "Quản lý toàn hệ thống (cần mã quản trị — tuyệt đối bảo mật)",
    icon: ShieldCheck,
  },
];

interface FormState {
  role: RegRole;
  name: string;
  username: string;
  cccd: string;
  department: string;
  title: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  regCode: string;
  commitment: boolean;
}

const initialForm: FormState = {
  role: "user",
  name: "",
  username: "",
  cccd: "",
  department: "",
  title: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  regCode: "",
  commitment: false,
};

function validate(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 3) e.name = "Họ và tên phải từ 3 ký tự trở lên";
  if (!/^[a-zA-Z0-9._]{3,32}$/.test(f.username.trim()))
    e.username = "3–32 ký tự, gồm chữ cái, số, dấu chấm (.) hoặc gạch dưới (_)";
  if (!/^\d{12}$/.test(f.cccd.trim())) e.cccd = "Số CCCD phải gồm đúng 12 chữ số";
  if (!f.department) e.department = "Vui lòng chọn đơn vị công tác";
  if (!f.title) e.title = "Vui lòng chọn chức danh";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim()))
    e.email = "Địa chỉ email không hợp lệ";
  if (f.phone && !/^0\d{9,10}$/.test(f.phone.trim()))
    e.phone = "Số điện thoại bắt đầu bằng 0, dài 10–11 chữ số";
  if (f.password.length < 8) e.password = "Mật khẩu tối thiểu 8 ký tự";
  else if (!/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password))
    e.password = "Mật khẩu phải chứa cả chữ cái và chữ số";
  if (f.confirmPassword !== f.password) e.confirmPassword = "Mật khẩu nhập lại chưa khớp";
  if ((f.role !== "user") && !f.regCode.trim()) e.regCode = "Vui lòng nhập mã đăng ký";
  if (!f.commitment) e.commitment = "Vui lòng xác nhận cam kết";
  return e;
}

function RegisterForm() {
  const router = useRouter();
  const appearance = useAppearance();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Tắt đăng ký → hiện thông báo
  const registrationDisabled = appearance?.allowRegistration === false;

  const liveErrors = useMemo(() => validate(form), [form]);
  const fieldError = (k: keyof FormState) =>
    touched[k] ? liveErrors[k] ?? serverFieldError(k) : undefined;
  const serverFields = useRef<Record<string, string>>({});
  const serverFieldError = (k: string) => serverFields.current[k];

  useEffect(() => {
    serverFields.current = {};
  }, [form.role]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setTouched((t) => ({ ...t, [key]: true }));
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError("");
    serverFields.current = {};
    const errs = validate(form);
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(initialForm).map((k) => [k, true])));
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await api("/api/auth/register", { method: "POST", json: { ...form } });
      // Đăng ký thành công — hệ thống tự cấp phiên, chuyển thẳng vào ứng dụng
      router.push(form.role === "admin" ? "/admin/kpi" : form.role === "technician" ? "/tasks" : "/my-proposals");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại";
      setServerError(msg);
      if (msg.includes("Tên đăng nhập")) serverFields.current.username = msg;
      else if (msg.includes("CCCD")) serverFields.current.cccd = msg;
      else if (msg.includes("Email")) serverFields.current.email = msg;
      else if (msg.includes("Mã")) serverFields.current.regCode = msg;
    } finally {
      setLoading(false);
    }
  };

  const roleMeta = ROLE_OPTIONS.find((r) => r.value === form.role)!;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Dải đầu trang */}
      <div className="border-b-4 border-agency bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-amber-300/60">
              { }
              <img
                src={appearance?.logoMediaId ? `/api/media/${appearance.logoMediaId}` : "/logo-nganh.svg"}
                alt="Logo ngành"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="min-w-0">
              <p className="truncate font-serif text-sm font-bold sm:text-base">
                {appearance?.siteTitle || "VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ"}
              </p>
              <p className="truncate text-xs text-primary-foreground/75">
                Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI
              </p>
            </span>
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden h-9 border-white/40 bg-white/5 text-white hover:bg-white/15 hover:text-white sm:inline-flex"
          >
            <Link href="/login">Đã có tài khoản — Đăng nhập</Link>
          </Button>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-stretch gap-0 px-0 py-0 lg:grid-cols-[2fr_3fr] lg:gap-8 lg:px-4 lg:py-10">
        {/* Cột giới thiệu (desktop) */}
        <aside className="relative hidden overflow-hidden rounded-md bg-[linear-gradient(160deg,var(--primary),color-mix(in_srgb,var(--primary)_78%,#000000))] p-8 text-primary-foreground lg:flex lg:flex-col">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #ffffff 0 2px, transparent 2px 16px)",
            }}
            aria-hidden
          />
          <h2 className="relative font-serif text-2xl font-bold leading-snug">
            Đăng ký tài khoản sử dụng hệ thống
          </h2>
          <div className="relative mt-2 h-1 w-16 rounded bg-amber-300" aria-hidden />
          <p className="relative mt-4 text-sm leading-relaxed text-primary-foreground/85">
            Tài khoản giúp bạn gửi đề xuất nhiệm vụ kỹ thuật, theo dõi tiến độ xử lý và nhận thông
            báo kết quả ngay trên hệ thống. Vui lòng khai báo thông tin đúng thực tế — mọi thao tác
            đều được ghi nhật ký kiểm toán.
          </p>
          <ul className="relative mt-6 space-y-4 text-sm">
            {[
              "Người dùng: gửi và theo dõi đề xuất của mình",
              "Kỹ thuật viên: nhận nhiệm vụ, cập nhật xử lý, xem KPI cá nhân",
              "Quản trị viên: phân công, thống kê, quản trị toàn hệ thống",
              "Mật khẩu được mã hóa bcrypt — không ai đọc được",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <BadgeCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-300" aria-hidden />
                <span className="text-primary-foreground/85">{t}</span>
              </li>
            ))}
          </ul>
          <div className="relative mt-auto flex items-center gap-3 border-t border-white/15 pt-5 text-xs text-primary-foreground/70">
            <ScrollText className="h-4 w-4 text-amber-300" aria-hidden />
            Thông tin cá nhân chỉ dùng cho mục đích công vụ nội bộ
          </div>
        </aside>

        {/* Cột form */}
        <section className="w-full px-4 py-8 sm:px-6 lg:px-0 lg:py-0">
          <div className="mx-auto w-full max-w-2xl rounded-md border border-border bg-card p-5 shadow-md sm:p-8">
            <h1 className="font-serif text-xl font-bold text-primary">Đăng ký tài khoản</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Khai báo đầy đủ và chính xác các trường có dấu <span className="text-agency">*</span>
            </p>

            {registrationDisabled && (
              <Alert className="mt-4">
                <AlertDescription>
                  Hệ thống đang tắt chế độ tự đăng ký. Vui lòng liên hệ Quản trị viên để được cấp
                  tài khoản.
                </AlertDescription>
              </Alert>
            )}

            {serverError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              {/* Chọn loại tài khoản */}
              <div>
                <Label>
                  Loại tài khoản đăng ký <span className="text-agency">*</span>
                </Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={registrationDisabled}
                      onClick={() => set("role", opt.value)}
                      className={cn(
                        "rounded-md border p-3 text-left transition-all",
                        form.role === opt.value
                          ? "border-agency bg-agency-light ring-1 ring-agency"
                          : "border-border hover:border-primary/40 hover:bg-accent/50",
                        registrationDisabled && "cursor-not-allowed opacity-50"
                      )}
                      aria-pressed={form.role === opt.value}
                    >
                      <opt.icon
                        className={cn(
                          "h-5 w-5",
                          form.role === opt.value ? "text-agency" : "text-muted-foreground"
                        )}
                        aria-hidden
                      />
                      <p className="mt-1.5 text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Họ và tên" required error={fieldError("name")}>
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    autoComplete="name"
                  />
                </Field>
                <Field label="Tên đăng nhập" required error={fieldError("username")}>
                  <Input
                    value={form.username}
                    onChange={(e) => set("username", e.target.value.trim())}
                    placeholder="Ví dụ: nguvana"
                    autoComplete="username"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Số CCCD" required error={fieldError("cccd")}>
                  <Input
                    value={form.cccd}
                    onChange={(e) => set("cccd", e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="12 chữ số"
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Số điện thoại" optional error={fieldError("phone")}>
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="Ví dụ: 0901234567"
                    inputMode="tel"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Đơn vị công tác" required error={fieldError("department")}>
                  <Select value={form.department} onValueChange={(v) => set("department", v)}>
                    <SelectTrigger aria-label="Đơn vị công tác">
                      <SelectValue placeholder="— Chọn đơn vị —" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Chức danh" required error={fieldError("title")}>
                  <Select value={form.title} onValueChange={(v) => set("title", v)}>
                    <SelectTrigger aria-label="Chức danh">
                      <SelectValue placeholder="— Chọn chức danh —" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {TITLES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Email" optional error={fieldError("email")} hint="Dùng để khôi phục mật khẩu khi quên">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value.trim())}
                  placeholder="Ví dụ: nguvana@vien.gov.vn"
                  autoComplete="email"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mật khẩu" required error={fieldError("password")}>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="Tối thiểu 8 ký tự, có chữ và số"
                      autoComplete="new-password"
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
                </Field>
                <Field label="Nhập lại mật khẩu" required error={fieldError("confirmPassword")}>
                  <Input
                    type={showPw ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => set("confirmPassword", e.target.value)}
                    placeholder="Gõ lại mật khẩu vừa nhập"
                    autoComplete="new-password"
                  />
                </Field>
              </div>

              {form.role !== "user" && (
                <Field
                  label={`Mã đăng ký ${roleMeta.label}`}
                  required
                  error={fieldError("regCode")}
                  hint={
                    form.role === "technician"
                      ? "Mã do Quản trị viên cấp cho Bộ phận Kỹ thuật"
                      : "Mã quản trị tuyệt đối bảo mật — chỉ lãnh đạo đơn vị nắm giữ"
                  }
                >
                  <Input
                    value={form.regCode}
                    onChange={(e) => set("regCode", e.target.value.trim())}
                    placeholder="Nhập mã đăng ký được cấp"
                    className="font-mono uppercase"
                  />
                </Field>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-accent/40 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.commitment}
                  onChange={(e) => set("commitment", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                />
                <span className="leading-relaxed text-foreground/85">
                  Tôi cam kết khai báo thông tin chính xác, chịu trách nhiệm về tài khoản của mình
                  và đồng ý tuân theo quy định sử dụng hệ thống của đơn vị.
                </span>
              </label>
              {fieldError("commitment") && (
                <p className="text-xs text-destructive">{fieldError("commitment")}</p>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-agency text-base font-semibold hover:bg-agency-dark"
                disabled={loading || registrationDisabled}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                {loading ? "Đang xử lý..." : "Đăng ký tài khoản"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Đã có tài khoản?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Đăng nhập ngay
                </Link>
              </p>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-3">
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Landmark className="h-3.5 w-3.5" aria-hidden />
          © {new Date().getFullYear()} {appearance?.siteTitle || "Viện Kiểm sát nhân dân Thành phố"} — Chỉ dùng cho mục đích công vụ
        </p>
      </footer>
    </div>
  );
}

function Field({
  label,
  required,
  optional,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}{" "}
        {required ? (
          <span className="text-agency">*</span>
        ) : optional ? (
          <span className="text-xs font-normal text-muted-foreground">(không bắt buộc)</span>
        ) : null}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  return <RegisterForm />;
}
