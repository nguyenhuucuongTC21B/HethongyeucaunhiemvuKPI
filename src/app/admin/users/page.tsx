"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Lock,
  Pencil,
  Search,
  Trash2,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";
import { api, formatDate } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, ROLE_LABELS, ROLES, TITLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/storage";

type PublicUser = Omit<User, "passwordHash">;

const emptyForm = {
  username: "",
  name: "",
  cccd: "",
  role: "user",
  department: "",
  title: "",
  email: "",
  phone: "",
  password: "",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<PublicUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Dialog tạo/sửa
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<PublicUser | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");

  // Dialog đặt lại mật khẩu / xóa
  const [resetUser, setResetUser] = useState<PublicUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteUser, setDeleteUser] = useState<PublicUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (roleFilter) params.set("role", roleFilter);
      const data = await api<{ items: PublicUser[]; total: number }>(`/api/users?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter]);

  useEffect(() => {
    if (!sessionLoading && me?.role === "admin") void load();
  }, [load, me, sessionLoading]);

  useEffect(() => {
    if (!sessionLoading && me?.role !== "admin") router.push("/");
  }, [me, sessionLoading, router]);

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFormError("");
  };

  const doCreate = async () => {
    setBusy(true);
    setFormError("");
    try {
      await api("/api/users", { method: "POST", json: form });
      setCreateOpen(false);
      setForm({ ...emptyForm });
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không tạo được tài khoản");
    } finally {
      setBusy(false);
    }
  };

  const doEdit = async () => {
    if (!editOpen) return;
    setBusy(true);
    setFormError("");
    try {
      await api(`/api/users/${editOpen.id}`, { method: "PATCH", json: form });
      setEditOpen(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không cập nhật được tài khoản");
    } finally {
      setBusy(false);
    }
  };

  const doAction = async (u: PublicUser, action: string) => {
    setBusy(true);
    try {
      await api(`/api/users/${u.id}`, { method: "POST", json: { action } });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  };

  const doResetPassword = async () => {
    if (!resetUser) return;
    setBusy(true);
    try {
      await api(`/api/users/${resetUser.id}`, {
        method: "POST",
        json: { action: "reset_password", password: newPassword },
      });
      setResetUser(null);
      setNewPassword("");
      alert("Đã đặt lại mật khẩu. Người dùng được khuyến nghị đổi lại sau khi đăng nhập.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không đặt lại được mật khẩu");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!deleteUser) return;
    setBusy(true);
    try {
      await api(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      setDeleteUser(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không xóa được tài khoản");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (u: PublicUser) => {
    setEditOpen(u);
    setForm({
      username: u.username,
      name: u.name,
      cccd: u.cccd,
      role: u.role,
      department: u.department,
      title: u.title,
      email: u.email ?? "",
      phone: u.phone ?? "",
      password: "",
    });
    setFormError("");
  };

  if (sessionLoading || !me) return <Skeleton className="h-96 w-full" />;
  if (me.role !== "admin") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-8 text-center text-destructive">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const roleBadge = (role: string, status: string) => (
    <div className="flex flex-col items-start gap-1">
      <Badge
        variant="outline"
        className={cn(
          role === "admin" && "bg-red-50 text-red-800 border-red-300",
          role === "technician" && "bg-sky-50 text-sky-800 border-sky-300",
          role === "user" && "bg-slate-100 text-slate-700 border-slate-300"
        )}
      >
        {ROLE_LABELS[role] ?? role}
      </Badge>
      {status === "locked" && (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
          Đã khóa
        </Badge>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Quản lý người dùng"
        description="Thêm, sửa, khóa/mở khóa, đặt lại mật khẩu và phân vai trò cho toàn bộ tài khoản trong hệ thống."
        breadcrumbs={[{ label: "Quản lý người dùng" }]}
        actions={
          <Button className="bg-primary" onClick={() => { setForm({ ...emptyForm }); setFormError(""); setCreateOpen(true); }}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Thêm tài khoản
          </Button>
        }
      />

      <div className="mb-4 grid gap-2.5 rounded-md border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tìm theo tên, CCCD, phòng ban, chức danh..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            <SelectItem value={ROLES.ADMIN}>Quản trị viên</SelectItem>
            <SelectItem value={ROLES.TECHNICIAN}>Kỹ thuật viên</SelectItem>
            <SelectItem value={ROLES.USER}>Người dùng</SelectItem>
          </SelectContent>
        </Select>
        <p className="self-center text-sm text-muted-foreground">
          <Users className="mr-1.5 inline h-4 w-4" />
          Tổng cộng <strong>{total}</strong> tài khoản
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                <TableHead className="font-semibold text-foreground">Tài khoản</TableHead>
                <TableHead className="hidden font-semibold text-foreground md:table-cell">CCCD</TableHead>
                <TableHead className="font-semibold text-foreground">Vai trò</TableHead>
                <TableHead className="hidden font-semibold text-foreground lg:table-cell">Đơn vị - Chức danh</TableHead>
                <TableHead className="hidden font-semibold text-foreground xl:table-cell">Ngày tạo</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/40">
                  <TableCell>
                    <p className="font-medium">{u.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{u.username}</p>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">{u.cccd}</TableCell>
                  <TableCell>{roleBadge(u.role, u.status)}</TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">
                    <p>{u.department}</p>
                    <p className="text-xs text-muted-foreground">{u.title}</p>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openEdit(u)} aria-label="Sửa">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.status === "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-amber-700 hover:text-amber-800"
                          disabled={busy || u.id === me.id}
                          onClick={() => doAction(u, "lock")}
                          aria-label="Khóa tài khoản"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-emerald-700 hover:text-emerald-800"
                          disabled={busy}
                          onClick={() => doAction(u, "unlock")}
                          aria-label="Mở khóa"
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => { setResetUser(u); setNewPassword(""); }}
                        aria-label="Đặt lại mật khẩu"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        disabled={busy || u.id === me.id}
                        onClick={() => setDeleteUser(u)}
                        aria-label="Xóa tài khoản"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog tạo tài khoản */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm tài khoản mới</DialogTitle>
            <DialogDescription>Mật khẩu mặc định nên được người dùng đổi sau khi đăng nhập.</DialogDescription>
          </DialogHeader>
          <UserFormFields form={form} set={set} error={formError} withPassword />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={doCreate} disabled={busy}>{busy ? "Đang tạo..." : "Tạo tài khoản"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog sửa tài khoản */}
      <Dialog open={Boolean(editOpen)} onOpenChange={(v) => !v && setEditOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa tài khoản: {editOpen?.name}</DialogTitle>
            <DialogDescription>Thay đổi được ghi nhật ký kiểm toán.</DialogDescription>
          </DialogHeader>
          <UserFormFields form={form} set={set} error={formError} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(null)}>Hủy</Button>
            <Button onClick={doEdit} disabled={busy}>{busy ? "Đang lưu..." : "Lưu thay đổi"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog đặt lại mật khẩu */}
      <Dialog open={Boolean(resetUser)} onOpenChange={(v) => !v && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu: {resetUser?.name}</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu mới (≥ 8 ký tự, gồm chữ cái và chữ số). Người dùng nên đổi lại sau khi
              đăng nhập.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="newPassword">Mật khẩu mới *</Label>
            <Input
              id="newPassword"
              type="text"
              className="mt-1.5"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ví dụ: MatKhau2026"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>Hủy</Button>
            <Button onClick={doResetPassword} disabled={busy || newPassword.length < 8}>
              {busy ? "Đang lưu..." : "Đặt lại mật khẩu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xóa */}
      <Dialog open={Boolean(deleteUser)} onOpenChange={(v) => !v && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa tài khoản {deleteUser?.name}?</DialogTitle>
            <DialogDescription>
              Tài khoản {deleteUser?.username} sẽ bị xóa vĩnh viễn. Hành động được ghi nhật ký kiểm
              toán và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Không</Button>
            <Button variant="destructive" onClick={doDelete} disabled={busy}>
              {busy ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserFormFields({
  form,
  set,
  error,
  withPassword = false,
}: {
  form: ReturnType<typeof emptyForm>;
  set: (k: keyof typeof emptyForm, v: string) => void;
  error?: string;
  withPassword?: boolean;
}) {
  return (
    <div className="grid gap-3.5">
      {error && (
        <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <Label>Tên đăng nhập *</Label>
          <Input className="mt-1" value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="vidu_nguyenvan" />
        </div>
        <div>
          <Label>Họ tên *</Label>
          <Input className="mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nguyễn Văn A" />
        </div>
        <div>
          <Label>CCCD * (12 chữ số)</Label>
          <Input
            className="mt-1"
            inputMode="numeric"
            maxLength={12}
            value={form.cccd}
            onChange={(e) => set("cccd", e.target.value.replace(/\D/g, ""))}
            placeholder="012345678901"
          />
        </div>
        <div>
          <Label>Vai trò *</Label>
          <Select value={form.role} onValueChange={(v) => set("role", v)}>
            <SelectTrigger className="mt-1">
              <SelectValue>{ROLE_LABELS[form.role] ?? "— Chọn vai trò —"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLES.USER}>Người dùng</SelectItem>
              <SelectItem value={ROLES.TECHNICIAN}>Kỹ thuật viên</SelectItem>
              <SelectItem value={ROLES.ADMIN}>Quản trị viên</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Phòng ban / Đơn vị *</Label>
          <Select value={form.department} onValueChange={(v) => set("department", v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="— Chọn —">{form.department || "— Chọn —"}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Chức danh *</Label>
          <Select value={form.title} onValueChange={(v) => set("title", v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="— Chọn —">{form.title || "— Chọn —"}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {TITLES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Email (tùy chọn)</Label>
          <Input className="mt-1" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <Label>Điện thoại (tùy chọn)</Label>
          <Input className="mt-1" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        {withPassword && (
          <div className="sm:col-span-2">
            <Label>Mật khẩu * (≥ 8 ký tự, gồm chữ cái và chữ số)</Label>
            <Input className="mt-1" type="text" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Ví dụ: MatKhau2026" />
          </div>
        )}
      </div>
    </div>
  );
}
