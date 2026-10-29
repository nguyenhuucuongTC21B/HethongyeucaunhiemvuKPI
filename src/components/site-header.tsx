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
  Menu,
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

interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
}

export function SiteHeader() {
  const router = useRouter();
  const { user, loading, refresh } = useSession();
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
      { href: "/admin/users", label: "Quản lý người dùng", icon: User, roles: ["admin"] },
      { href: "/admin/audit", label: "Nhật ký", icon: ScrollText, roles: ["admin"] },
      { href: "/admin/settings", label: "Cài đặt", icon: Settings, roles: ["admin"] },
    ];
    return items.filter((i) => i.roles.includes(user.role));
  };

  const navItems = navByRole();

  return (
    <header className="sticky top-0 z-50 no-print">
      {/* Dải cơ quan */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-white/10">
                <Landmark className="h-5 w-5" aria-hidden />
              </span>
              <span className="truncate">
                <span className="block font-serif text-[13px] font-bold leading-tight sm:text-sm">
                  VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-primary-foreground/80 sm:text-[11px]">
                  Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI
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
                <Button
                  asChild
                  size="sm"
                  className="h-9 bg-white text-primary hover:bg-white/90"
                >
                  <Link href="/login">
                    <ShieldCheck className="mr-1.5 h-4 w-4" /> Đăng nhập
                  </Link>
                </Button>
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
      {user && (
        <nav className="border-b border-border bg-card shadow-sm">
          <div className="mx-auto max-w-7xl px-4">
            <div className={cn("gap-1 py-1.5 lg:flex lg:items-center", menuOpen ? "flex flex-col" : "hidden")}>
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
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} Viện Kiểm sát nhân dân Thành phố — Hệ thống Quản lý Phân
            công Nhiệm vụ - Tính KPI
          </p>
          <p className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Bộ phận Kỹ thuật — Chỉ dùng cho mục đích công vụ
          </p>
        </div>
      </div>
    </footer>
  );
}
