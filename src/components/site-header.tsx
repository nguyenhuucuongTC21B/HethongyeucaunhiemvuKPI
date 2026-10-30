"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  FilePlus2,
  KeyRound,
  LayoutDashboard,
  Landmark,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Newspaper,
  Phone,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";
import { api, formatDateTime } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* ========================= Appearance (cấu hình giao diện) ========================= */

export interface Appearance {
  siteTitle: string;
  siteSubtitle: string;
  logoMediaId: string | null;
  themePreset: string;
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
}

let appearanceCache: Appearance | null = null;
let appearanceCacheAt = 0;
let appearancePromise: Promise<Appearance | null> | null = null;

/** Xóa cache cấu hình giao diện (gọi sau khi Admin lưu cài đặt) */
export function clearAppearanceCache() {
  appearanceCache = null;
  appearancePromise = null;
  appearanceCacheAt = 0;
}

export function useAppearance(): Appearance | null {
  const [appearance, setAppearance] = useState<Appearance | null>(appearanceCache);
  useEffect(() => {
    let active = true;
    if (appearanceCache && Date.now() - appearanceCacheAt < 30_000) {
      setAppearance(appearanceCache);
      return;
    }
    appearancePromise ??= api<{ appearance: Appearance }>("/api/appearance")
      .then((d) => {
        appearanceCache = d.appearance;
        appearanceCacheAt = Date.now();
        return d.appearance;
      })
      .catch(() => null);
    appearancePromise.then((a) => {
      if (active) setAppearance(a);
    });
    return () => {
      active = false;
    };
  }, []);
  return appearance;
}

export function logoSrcOf(a: Appearance | null): string {
  return a?.logoMediaId ? `/api/media/${a.logoMediaId}` : "/logo-nganh.png";
}

/* ========================= Header ========================= */

interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
}

const PUBLIC_NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/tin-tuc", label: "Tin tức" },
  { href: "/video", label: "Video" },
  { href: "/phan-mem", label: "Phần mềm" },
];

export function SiteHeader() {
  const router = useRouter();
  const { user, loading, refresh } = useSession();
  const appearance = useAppearance();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const prevUnread = useRef(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      try {
        const data = await api<{ items: AppNotification[]; unread: number }>(
          "/api/notifications?limit=8"
        );
        if (!active) return;
        setNotifications(data.items);
        setUnread(data.unread);
      } catch {
        /* ignore */
      }
    };
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    if (unread > prevUnread.current && prevUnread.current !== 0) {
      void refresh();
    }
    prevUnread.current = unread;
  }, [unread, refresh]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const markAll = async () => {
    await api("/api/notifications", { method: "POST", json: { all: true } });
    setUnread(0);
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
  };

  const navByRole = () => {
    if (!user) return [];
    const items = [
      { href: "/my-proposals", label: "Đề xuất của tôi", icon: Send, roles: ["user", "technician", "admin"] },
      { href: "/tasks", label: "Nhiệm vụ", icon: ClipboardList, roles: ["technician", "admin"] },
      { href: "/kpi", label: "KPI cá nhân", icon: LayoutDashboard, roles: ["technician", "admin"] },
      { href: "/admin/kpi", label: "Dashboard KPI", icon: LayoutDashboard, roles: ["admin"] },
      { href: "/admin/users", label: "Người dùng", icon: User, roles: ["admin"] },
      { href: "/admin/content", label: "Nội dung", icon: Newspaper, roles: ["admin"] },
      { href: "/admin/appearance", label: "Giao diện", icon: Settings, roles: ["admin"] },
      { href: "/admin/audit", label: "Nhật ký", icon: ScrollText, roles: ["admin"] },
      { href: "/admin/settings", label: "Cấu hình", icon: Settings, roles: ["admin"] },
    ];
    return items.filter((i) => i.roles.includes(user.role));
  };

  const navItems = navByRole();
  const siteTitle = appearance?.siteTitle || "VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ";
  const siteSubtitle =
    appearance?.siteSubtitle || "Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI";

  return (
    <header className="sticky top-0 z-50 no-print">
      {/* Dải liên hệ trên cùng */}
      <div className="border-b border-white/10 bg-[color-mix(in_srgb,var(--primary)_88%,#000000)] text-primary-foreground/85">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-[11px] sm:text-xs">
          <p className="flex items-center gap-1.5 truncate">
            <Landmark className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
            <span className="truncate">{siteTitle}</span>
          </p>
          <div className="flex items-center gap-3">
            {appearance?.orgEmail && (
              <a href={`mailto:${appearance.orgEmail}`} className="hidden items-center gap-1 hover:text-amber-300 sm:flex">
                <Mail className="h-3.5 w-3.5" /> {appearance.orgEmail}
              </a>
            )}
            {appearance?.orgPhone && (
              <a href={`tel:${appearance.orgPhone}`} className="flex items-center gap-1 hover:text-amber-300">
                <Phone className="h-3.5 w-3.5" /> {appearance.orgPhone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Dải chính */}
      <div className="bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between gap-2">
            <Link href={user ? "/my-proposals" : "/"} className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-amber-300/60">
                { }
                <img src={logoSrcOf(appearance)} alt="Logo ngành" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-[13px] font-bold leading-tight sm:text-[15px]">
                  {siteTitle}
                </span>
                <span className="block truncate text-[10px] uppercase tracking-wider text-primary-foreground/75 sm:text-[11px]">
                  {siteSubtitle}
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-1.5">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative h-9 gap-1.5 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                      aria-label="Thông báo"
                    >
                      <Bell className="h-5 w-5" />
                      {unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-agency px-1 text-[10px] font-bold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 sm:w-96">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm font-semibold">Thông báo</span>
                      {unread > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAll}>
                          Đánh dấu tất cả đã đọc
                        </Button>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Chưa có thông báo nào
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.taskId ? `/tasks/${n.taskId}` : "/notifications"}
                            onClick={() => {
                              if (!n.read) {
                                void api("/api/notifications", { method: "POST", json: { id: n.id } });
                                setUnread((u) => Math.max(0, u - 1));
                              }
                            }}
                            className={cn(
                              "block border-b border-border/60 px-3 py-2.5 last:border-0 hover:bg-accent",
                              !n.read && "bg-secondary/70"
                            )}
                          >
                            <p className="text-[13px] font-medium leading-snug">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.message}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground/80">
                              {formatDateTime(n.createdAt)}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="hidden max-w-32 truncate text-sm sm:inline">{user.name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel>
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs font-normal text-muted-foreground">
                        {user.title} — {user.department}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">
                        <KeyRound className="mr-2 h-4 w-4" /> Đổi mật khẩu
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-agency focus:text-agency">
                      <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : !loading ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    asChild
                    size="sm"
                    className="h-9 bg-white text-primary hover:bg-white/90"
                  >
                    <Link href="/login">
                      <ShieldCheck className="mr-1.5 h-4 w-4" /> Đăng nhập
                    </Link>
                  </Button>
                  {appearance?.allowRegistration !== false && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="hidden h-9 border-white/40 bg-white/5 text-white hover:bg-white/15 hover:text-white sm:inline-flex"
                    >
                      <Link href="/register">Đăng ký</Link>
                    </Button>
                  )}
                </div>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-primary-foreground hover:bg-white/10 lg:hidden"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh điều hướng */}
      <nav className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div
            className={cn(
              "gap-1 py-1.5 lg:flex lg:items-center",
              menuOpen ? "flex flex-col" : "hidden"
            )}
          >
            {user ? (
              <>
                <Button
                  asChild
                  size="sm"
                  className="mr-2 my-1 hidden h-8 bg-agency hover:bg-agency-dark text-white lg:inline-flex"
                >
                  <Link href="/proposal">
                    <FilePlus2 className="mr-1.5 h-4 w-4" /> Gửi đề xuất
                  </Link>
                </Button>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 my-0.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-primary"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/proposal"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 rounded-sm bg-agency px-2.5 py-1.5 my-1 text-sm font-medium text-white lg:hidden"
                >
                  <FilePlus2 className="h-4 w-4" /> Gửi đề xuất
                </Link>
              </>
            ) : (
              <>
                {PUBLIC_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 my-0.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
                {appearance?.allowRegistration !== false && (
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 my-0.5 text-sm font-semibold text-agency lg:hidden"
                  >
                    Đăng ký tài khoản
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

/* ========================= Footer (nhấn mạnh, nhiều cột) ========================= */

export function SiteFooter() {
  const appearance = useAppearance();
  const year = new Date().getFullYear();
  const siteTitle = appearance?.siteTitle || "VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ";
  const siteSubtitle =
    appearance?.siteSubtitle || "Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI";

  return (
    <footer className="mt-auto no-print">
      {/* Dải chỉ dẫn vàng phía trên */}
      <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" aria-hidden />
      <div className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_94%,#000000),color-mix(in_srgb,var(--primary)_88%,#000000))] text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* Cột 1: Nhận diện */}
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-amber-300/60">
                { }
                <img src={logoSrcOf(appearance)} alt="Logo ngành" className="h-full w-full object-cover" />
              </span>
              <p className="font-serif text-sm font-bold leading-snug">{siteTitle}</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-primary-foreground/70">
              {siteSubtitle}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-amber-200/90">
              <ShieldCheck className="h-3.5 w-3.5" /> Dữ liệu lưu trữ vĩnh viễn trên Google Drive
            </p>
          </div>

          {/* Cột 2: Liên kết nhanh */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-300">
              Liên kết nhanh
            </p>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/", label: "Trang chủ" },
                { href: "/tin-tuc", label: "Tin tức - Thông báo" },
                { href: "/video", label: "Video hướng dẫn" },
                { href: "/phan-mem", label: "Phần mềm chuyên ngành" },
                { href: "/login", label: "Đăng nhập hệ thống" },
                ...(appearance?.allowRegistration !== false
                  ? [{ href: "/register", label: "Đăng ký tài khoản" }]
                  : []),
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-primary-foreground/75 transition-colors hover:text-amber-300"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 3: Liên hệ */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-300">
              Thông tin liên hệ
            </p>
            <ul className="space-y-2.5 text-sm text-primary-foreground/75">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" aria-hidden />
                <span>{appearance?.orgAddress || "Địa chỉ trụ sở Viện"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" aria-hidden />
                <a href={`mailto:${appearance?.orgEmail || ""}`} className="hover:text-amber-300">
                  {appearance?.orgEmail || "—"}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" aria-hidden />
                <span>{appearance?.orgPhone || "—"} (Bộ phận Kỹ thuật)</span>
              </li>
              <li className="flex items-start gap-2">
                <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" aria-hidden />
                <span>Giờ hỗ trợ: 8h00 – 17h00, ngày làm việc</span>
              </li>
            </ul>
          </div>

          {/* Cột 4: Hỗ trợ */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-300">
              Hỗ trợ sử dụng
            </p>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/forgot-password", label: "Quên mật khẩu" },
                { href: "/login", label: "Đăng nhập hệ thống" },
                { href: "/register", label: "Đăng ký tài khoản mới" },
                { href: "/tin-tuc", label: "Quy định - Nội quy" },
              ].map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-primary-foreground/75 transition-colors hover:text-amber-300"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-sm border border-white/15 bg-white/5 p-2.5 text-[11px] leading-relaxed text-primary-foreground/70">
              Mọi sự cố kỹ thuật vui lòng gửi đề xuất qua hệ thống để được ghi nhận và xử lý đúng
              quy trình.
            </p>
          </div>
        </div>

        {/* Dải bản quyền */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1.5 px-4 py-3.5 text-center text-[11px] text-primary-foreground/60 sm:flex-row sm:text-left">
            <p>
              © {year} {siteTitle}. {appearance?.footerText || "Bộ phận Kỹ thuật — Chỉ dùng cho mục đích công vụ"}
            </p>
            <p className="flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 text-amber-300/70" aria-hidden />
              Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
