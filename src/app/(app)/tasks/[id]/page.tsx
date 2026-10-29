"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  History,
  MapPin,
  Phone,
  Star,
  Trash2,
  UserCog,
  UserPlus,
} from "lucide-react";
import { api, formatBytes, formatDateTime, toLocalInputValue } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, UrgencyBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { TASK_STATUS, TASK_TYPES, URGENCY_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Task, User as AppUser } from "@/lib/storage";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [task, setTask] = useState<Task | null>(null);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [allowSelfAssign, setAllowSelfAssign] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Dialogs
  const [assignOpen, setAssignOpen] = useState(false);
  const [technicians, setTechnicians] = useState<AppUser[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [rateOpen, setRateOpen] = useState(false);
  const [rateStars, setRateStars] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", urgency: "", location: "", desiredDeadline: "", phone: "", email: "", notes: "", type: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ task: Task; transitions: string[]; allowSelfAssign: boolean }>(
        `/api/tasks/${id}`
      );
      setTask(data.task);
      setTransitions(data.transitions);
      setAllowSelfAssign(data.allowSelfAssign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được nhiệm vụ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!sessionLoading && user) void load();
  }, [user, sessionLoading, load]);

  useEffect(() => {
    if (!sessionLoading && !user) router.push(`/login?next=/tasks/${id}`);
  }, [user, sessionLoading, router, id]);

  const doStatus = async (to: string, note: string) => {
    setBusy(true);
    try {
      await api(`/api/tasks/${id}/status`, { method: "POST", json: { to, note } });
      setActionNote("");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không cập nhật được trạng thái");
    } finally {
      setBusy(false);
    }
  };

  const openAssign = async () => {
    setAssignOpen(true);
    try {
      const data = await api<{ items: AppUser[] }>("/api/users?role=technician");
      setTechnicians(data.items);
      setAssigneeId(task?.assigneeId ?? "");
    } catch {
      /* ignore */
    }
  };

  const doAssign = async () => {
    if (!assigneeId) return;
    setBusy(true);
    try {
      await api(`/api/tasks/${id}/assign`, { method: "POST", json: { assigneeId, action: "assign" } });
      setAssignOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không phân công được");
    } finally {
      setBusy(false);
    }
  };

  const doUnassign = async () => {
    if (!confirm("Thu hồi phân công? Nhiệm vụ sẽ trở lại trạng thái Chờ tiếp nhận.")) return;
    setBusy(true);
    try {
      await api(`/api/tasks/${id}/assign`, { method: "POST", json: { action: "unassign" } });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thu hồi được");
    } finally {
      setBusy(false);
    }
  };

  const doRate = async () => {
    setBusy(true);
    try {
      await api(`/api/tasks/${id}/rate`, {
        method: "POST",
        json: { stars: rateStars, comment: rateComment },
      });
      setRateOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không gửi được đánh giá");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api(`/api/tasks/${id}`, { method: "DELETE" });
      router.push(user?.role === "admin" ? "/admin/kpi" : "/my-proposals");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không xóa được nhiệm vụ");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = () => {
    if (!task) return;
    setEditForm({
      title: task.title,
      description: task.description,
      urgency: task.urgency,
      location: task.location ?? "",
      desiredDeadline: toLocalInputValue(task.desiredDeadline),
      phone: task.phone,
      email: task.email ?? "",
      notes: task.notes ?? "",
      type: task.type,
    });
    setEditOpen(true);
  };

  const doEdit = async () => {
    setBusy(true);
    try {
      await api(`/api/tasks/${id}`, {
        method: "PATCH",
        json: {
          ...editForm,
          desiredDeadline: editForm.desiredDeadline
            ? new Date(editForm.desiredDeadline).toISOString()
            : null,
        },
      });
      setEditOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không sửa được nhiệm vụ");
    } finally {
      setBusy(false);
    }
  };

  if (sessionLoading || loading) return <Skeleton className="h-96 w-full" />;
  if (error || !task) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-8 text-center">
        <p className="text-destructive">{error || "Không tìm thấy nhiệm vụ"}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/my-proposals">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const isRequester = task.requesterId === user?.id;
  const isAdmin = user?.role === "admin";
  const isAssignee = task.assigneeId === user?.id;
  const canClaim = user?.role === "technician" && !task.assigneeId && allowSelfAssign && task.status === TASK_STATUS.CHO_TIEP_NHAN;
  const canAct = isAdmin || isAssignee || canClaim;

  return (
    <div>
      <PageHeader
        title={`Nhiệm vụ ${task.code}`}
        description={task.title}
        breadcrumbs={[
          { label: isAdmin ? "Quản lý nhiệm vụ" : "Đề xuất của tôi", href: isAdmin ? "/tasks" : "/my-proposals" },
          { label: task.code },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <ClipboardList className="mr-1.5 h-4 w-4" /> Sửa
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Xóa
                </Button>
              </>
            )}
            {(isAdmin || (user?.role === "technician" && isAssignee)) && task.assigneeId && (
              <Button variant="outline" size="sm" onClick={doUnassign} disabled={busy}>
                <UserCog className="mr-1.5 h-4 w-4" /> Thu hồi
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" className="bg-primary" onClick={openAssign}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                {task.assigneeId ? "Đổi người xử lý" : "Phân công"}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Cột trái: thông tin chi tiết */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="border-b border-border/70 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base text-primary">Thông tin nhiệm vụ</CardTitle>
                <div className="flex items-center gap-2">
                  <UrgencyBadge urgency={task.urgency} />
                  <StatusBadge status={task.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="grid gap-x-6 gap-y-3.5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Loại nhiệm vụ</dt>
                  <dd className="mt-0.5 font-medium">{task.type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mã nhiệm vụ</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-primary">{task.code}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Người đề xuất</dt>
                  <dd className="mt-0.5 font-medium">
                    {task.requesterName} <span className="font-normal text-muted-foreground">({task.position})</span>
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> Phòng ban / Đơn vị
                  </dt>
                  <dd className="mt-0.5 font-medium">{task.department}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">CCCD</dt>
                  <dd className="mt-0.5 font-mono">{task.cccd}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> Điện thoại
                  </dt>
                  <dd className="mt-0.5">{task.phone}</dd>
                </div>
                {task.email && (
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="mt-0.5">{task.email}</dd>
                  </div>
                )}
                {task.location && (
                  <div>
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> Địa điểm
                    </dt>
                    <dd className="mt-0.5">{task.location}</dd>
                  </div>
                )}
                <div>
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" /> Thời hạn mong muốn
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {task.desiredDeadline ? formatDateTime(task.desiredDeadline) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Thời gian gửi</dt>
                  <dd className="mt-0.5">{formatDateTime(task.createdAt)}</dd>
                </div>
                {task.legalBasis && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Căn cứ pháp lý</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{task.legalBasis}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Mô tả chi tiết</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-sm border border-border bg-muted/40 p-3 leading-relaxed">
                    {task.description}
                  </dd>
                </div>
                {task.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Ghi chú thêm</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{task.notes}</dd>
                  </div>
                )}
              </dl>

              {task.attachments?.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="mb-2 text-sm font-semibold">Tệp đính kèm ({task.attachments.length})</p>
                  <ul className="space-y-2">
                    {task.attachments.map((a) => (
                      <li key={a.id}>
                        <a
                          href={`/api/files/${a.id}`}
                          className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 truncate">{a.name}</span>
                          <span className="text-xs text-muted-foreground">{formatBytes(a.size)}</span>
                          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {task.rating && (
                <>
                  <Separator className="my-4" />
                  <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-800">Đánh giá của người gửi</p>
                    <div className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "h-4 w-4",
                            s <= task.rating!.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                          )}
                        />
                      ))}
                      <span className="ml-2 text-sm text-emerald-800">{task.rating.stars}/5</span>
                    </div>
                    {task.rating.comment && (
                      <p className="mt-1 text-sm text-emerald-900">“{task.rating.comment}”</p>
                    )}
                    <p className="mt-1 text-xs text-emerald-700/80">{formatDateTime(task.rating.at)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: hành động + lịch sử */}
        <div className="space-y-5">
          {canAct && transitions.length > 0 && (
            <Card>
              <CardHeader className="border-b border-border/70 py-3.5">
                <CardTitle className="text-base text-primary">Cập nhật trạng thái</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {transitions.map((to) => (
                  <div key={to} className="rounded-sm border border-border p-3">
                    <p className="text-sm font-medium">
                      Chuyển sang: <StatusBadge status={to} />
                    </p>
                    {(to === TASK_STATUS.TU_CHOI || to === TASK_STATUS.TAM_HOAN) && (
                      <TransitionAction
                        placeholder="Lý do (bắt buộc)"
                        busy={busy}
                        onConfirm={(note) => doStatus(to, note)}
                        confirmLabel="Xác nhận"
                      />
                    )}
                    {to === TASK_STATUS.DA_TIEP_NHAN && (
                      <TransitionAction
                        placeholder="Ghi chú (không bắt buộc)"
                        busy={busy}
                        optional
                        onConfirm={(note) => doStatus(to, note)}
                        confirmLabel="Tiếp nhận"
                      />
                    )}
                    {to === TASK_STATUS.DANG_XU_LY && (
                      <TransitionAction
                        placeholder="Ghi chú xử lý (không bắt buộc)"
                        busy={busy}
                        optional
                        onConfirm={(note) => doStatus(to, note)}
                        confirmLabel="Bắt đầu xử lý"
                      />
                    )}
                    {to === TASK_STATUS.HOAN_THANH && (
                      <TransitionAction
                        placeholder="Tóm tắt kết quả xử lý"
                        busy={busy}
                        optional
                        onConfirm={(note) => doStatus(to, note)}
                        confirmLabel="Hoàn thành"
                      />
                    )}
                    {to === TASK_STATUS.DA_HUY && (
                      <TransitionAction
                        placeholder="Lý do hủy"
                        busy={busy}
                        onConfirm={(note) => doStatus(to, note)}
                        confirmLabel="Hủy nhiệm vụ"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {canClaim && (
            <Card className="border-primary/40">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Nhiệm vụ chưa được phân công. Bạn có thể nhận xử lý nhiệm vụ này.
                </p>
                <Button
                  className="mt-3 w-full"
                  disabled={busy}
                  onClick={() => doStatus(TASK_STATUS.DA_TIEP_NHAN, "Tự nhận nhiệm vụ")}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Nhận nhiệm vụ này
                </Button>
              </CardContent>
            </Card>
          )}

          {isRequester && task.status === TASK_STATUS.HOAN_THANH && !task.rating && (
            <Card className="border-amber-300">
              <CardContent className="pt-4">
                <p className="text-sm font-medium">Nhiệm vụ đã hoàn thành</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vui lòng đánh giá mức độ hài lòng của bạn (tùy chọn).
                </p>
                <Button className="mt-3 w-full" onClick={() => setRateOpen(true)}>
                  <Star className="mr-2 h-4 w-4" /> Đánh giá kết quả
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="border-b border-border/70 py-3.5">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <History className="h-4 w-4" /> Lịch sử xử lý
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ol className="relative space-y-4 border-l-2 border-border pl-4">
                {[...task.history].reverse().map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21.5px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-primary bg-background" />
                    <p className="text-sm font-medium">
                      {h.from ? `${h.from} → ` : ""}
                      <StatusBadge status={h.to} />
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {h.byName} • {formatDateTime(h.at)}
                    </p>
                    {h.note && <p className="mt-1 text-sm text-foreground/80">“{h.note}”</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog phân công */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phân công kỹ thuật viên</DialogTitle>
            <DialogDescription>
              Chọn kỹ thuật viên phụ trách nhiệm vụ {task.code}. Người được phân công sẽ nhận thông
              báo ngay.
            </DialogDescription>
          </DialogHeader>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger>
              <SelectValue placeholder="— Chọn kỹ thuật viên —" />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} — {t.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Hủy
            </Button>
            <Button onClick={doAssign} disabled={!assigneeId || busy}>
              {busy ? "Đang lưu..." : "Xác nhận phân công"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog đánh giá */}
      <Dialog open={rateOpen} onOpenChange={setRateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đánh giá kết quả xử lý</DialogTitle>
            <DialogDescription>
              Mức độ hài lòng của bạn về nhiệm vụ {task.code} (1–5 sao).
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRateStars(s)}
                aria-label={`${s} sao`}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8",
                    s <= rateStars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Nhận xét (tùy chọn)"
            value={rateComment}
            onChange={(e) => setRateComment(e.target.value)}
            maxLength={1000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateOpen(false)}>
              Để sau
            </Button>
            <Button onClick={doRate} disabled={busy}>
              {busy ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xóa */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa nhiệm vụ {task.code}?</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Toàn bộ dữ liệu nhiệm vụ sẽ bị xóa vĩnh viễn và được
              ghi nhật ký kiểm toán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Không
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={busy}>
              {busy ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog sửa nhiệm vụ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa nhiệm vụ {task.code}</DialogTitle>
            <DialogDescription>
              Thay đổi sẽ được ghi nhật ký kiểm toán (trước/sau).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Loại nhiệm vụ</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue>{editForm.type}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tiêu đề</Label>
              <Input
                className="mt-1"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Mô tả chi tiết</Label>
              <Textarea
                className="mt-1 min-h-24"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mức độ khẩn cấp</Label>
                <Select value={editForm.urgency} onValueChange={(v) => setEditForm((f) => ({ ...f, urgency: v as typeof URGENCY_LEVELS[number] }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue>{editForm.urgency}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_LEVELS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Thời hạn mong muốn</Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={editForm.desiredDeadline}
                  onChange={(e) => setEditForm((f) => ({ ...f, desiredDeadline: e.target.value }))}
                />
              </div>
              <div>
                <Label>Địa điểm</Label>
                <Input
                  className="mt-1"
                  value={editForm.location}
                  onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div>
                <Label>Điện thoại</Label>
                <Input
                  className="mt-1"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Ghi chú thêm</Label>
              <Textarea
                className="mt-1 min-h-16"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Hủy
            </Button>
            <Button onClick={doEdit} disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransitionAction({
  placeholder,
  onConfirm,
  busy,
  optional = false,
  confirmLabel,
}: {
  placeholder: string;
  onConfirm: (note: string) => void;
  busy: boolean;
  optional?: boolean;
  confirmLabel: string;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="mt-2.5">
      <Textarea
        className="min-h-16"
        placeholder={placeholder}
        value={note}
        maxLength={1000}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button
        size="sm"
        className="mt-2 w-full"
        disabled={busy || (!optional && !note.trim())}
        onClick={() => onConfirm(note.trim())}
      >
        {confirmLabel}
      </Button>
    </div>
  );
}
