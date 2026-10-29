"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2, Paperclip, Send, X } from "lucide-react";
import { api, formatBytes } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DEPARTMENTS, TITLES, TASK_TYPES, URGENCY_LEVELS, MAX_ATTACHMENTS, MAX_FILE_SIZE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FieldErrors {
  [key: string]: string;
}

const emptyForm = {
  type: "",
  requesterName: "",
  department: "",
  position: "",
  cccd: "",
  legalBasis: "",
  title: "",
  description: "",
  urgency: "",
  desiredDeadline: "",
  location: "",
  phone: "",
  email: "",
  notes: "",
};

export default function ProposalPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [form, setForm] = useState({ ...emptyForm });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/proposal");
  }, [user, loading, router]);

  const set = (key: keyof typeof emptyForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_ATTACHMENTS) {
        setErrors((e) => ({ ...e, attachments: `Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS} tệp` }));
        break;
      }
      if (f.size > MAX_FILE_SIZE) {
        setErrors((e) => ({ ...e, attachments: `Tệp "${f.name}" vượt quá 10MB` }));
        continue;
      }
      next.push(f);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateClient = (data: typeof emptyForm): boolean => {
    const e: FieldErrors = {};
    if (!data.type) e.type = "Vui lòng chọn loại nhiệm vụ";
    if (data.requesterName.trim().length < 2) e.requesterName = "Vui lòng nhập họ tên người đề xuất";
    if (!data.department) e.department = "Vui lòng chọn phòng ban / đơn vị";
    if (!data.position) e.position = "Vui lòng chọn chức danh";
    if (!/^\d{12}$/.test(data.cccd.trim())) e.cccd = "CCCD phải gồm đúng 12 chữ số";
    if (data.title.trim().length < 5) e.title = "Tiêu đề đề xuất phải có ít nhất 5 ký tự";
    if (data.description.trim().length < 10) e.description = "Mô tả chi tiết phải có ít nhất 10 ký tự";
    if (!data.urgency) e.urgency = "Vui lòng chọn mức độ khẩn cấp";
    if (!/^\d{10,11}$/.test(data.phone.trim())) e.phone = "Số điện thoại phải gồm 10–11 chữ số";
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
      e.email = "Email không đúng định dạng";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    if (!user) return;
    const payload = {
      ...form,
      requesterName: form.requesterName || user.name,
      department: form.department || user.department,
      position: form.position || user.title,
    };
    if (!validateClient(payload)) {
      setGlobalError("Vui lòng kiểm tra lại các trường được đánh dấu lỗi bên dưới.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append("attachments", f));
      const data = await api<{ code: string; message: string }>("/api/tasks", {
        method: "POST",
        body: fd,
      });
      alert(`${data.message}`);
      router.push(`/my-proposals?highlight=${encodeURIComponent(data.code)}`);
    } catch (err) {
      const e2 = err as Error & { fields?: FieldErrors };
      if (e2.fields) setErrors(e2.fields);
      setGlobalError(e2.message || "Không thể gửi đề xuất. Vui lòng thử lại.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Giá trị hiển thị: ưu tiên nội dung người dùng đang nhập, fallback về thông tin tài khoản
  const nameValue = form.requesterName || user.name;
  const deptValue = form.department || user.department;
  const posValue = form.position || user.title;

  const err = (k: string) =>
    errors[k] ? (
      <p className="mt-1 text-xs font-medium text-destructive" role="alert">
        {errors[k]}
      </p>
    ) : null;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Gửi đề xuất nhiệm vụ"
        description="Điền đầy đủ thông tin dưới đây. Các trường có dấu (*) là bắt buộc."
        breadcrumbs={[{ label: "Gửi đề xuất" }]}
        actions={
          <Button variant="outline" asChild className="no-print">
            <Link href="/my-proposals">Xem đề xuất của tôi</Link>
          </Button>
        }
      />

      {globalError && (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>Không thể gửi đề xuất</AlertTitle>
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={submit} noValidate>
        {/* 1. Loại nhiệm vụ */}
        <Card className="mb-5">
          <CardHeader className="border-b border-border/70 py-3.5">
            <CardTitle className="text-base text-primary">1. Loại nhiệm vụ đề xuất *</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TASK_TYPES.map((t) => (
                <label
                  key={t}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-sm border p-2.5 text-sm transition-colors",
                    form.type === t
                      ? "border-primary bg-secondary font-medium text-primary"
                      : "border-border hover:border-input hover:bg-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name="type"
                    className="mt-0.5 accent-[#1a3a5c]"
                    checked={form.type === t}
                    onChange={() => set("type", t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
            {err("type")}
          </CardContent>
        </Card>

        {/* 2. Thông tin người đề xuất */}
        <Card className="mb-5">
          <CardHeader className="border-b border-border/70 py-3.5">
            <CardTitle className="text-base text-primary">2. Thông tin người đề xuất</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="requesterName">
                Họ tên người đề xuất * <span className="text-xs text-muted-foreground">(lấy từ tài khoản, có thể sửa)</span>
              </Label>
              <Input
                id="requesterName"
                className="mt-1.5"
                value={nameValue}
                onChange={(e) => set("requesterName", e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
              />
              {err("requesterName")}
            </div>
            <div>
              <Label htmlFor="cccd">Số CCCD * (12 chữ số)</Label>
              <Input
                id="cccd"
                className="mt-1.5"
                inputMode="numeric"
                maxLength={12}
                value={form.cccd}
                onChange={(e) => set("cccd", e.target.value.replace(/\D/g, ""))}
                placeholder="012345678901"
              />
              {err("cccd")}
            </div>
            <div>
              <Label>
                Phòng ban / Đơn vị công tác * <span className="text-xs text-muted-foreground">(cố định {DEPARTMENTS.length} đơn vị)</span>
              </Label>
              <Select value={deptValue} onValueChange={(v) => set("department", v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="— Chọn phòng ban / đơn vị —">{deptValue || "— Chọn phòng ban / đơn vị —"}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("department")}
            </div>
            <div>
              <Label>Chức danh *</Label>
              <Select value={posValue} onValueChange={(v) => set("position", v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="— Chọn chức danh —">{posValue || "— Chọn chức danh —"}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {TITLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("position")}
            </div>
            <div>
              <Label htmlFor="phone">Số điện thoại liên hệ * (10–11 số)</Label>
              <Input
                id="phone"
                className="mt-1.5"
                inputMode="numeric"
                maxLength={11}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
                placeholder="09xxxxxxxx"
              />
              {err("phone")}
            </div>
            <div>
              <Label htmlFor="email">Email liên hệ (tùy chọn)</Label>
              <Input
                id="email"
                type="email"
                className="mt-1.5"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="ten@vien.gov.vn"
              />
              {err("email")}
            </div>
          </CardContent>
        </Card>

        {/* 3. Nội dung đề xuất */}
        <Card className="mb-5">
          <CardHeader className="border-b border-border/70 py-3.5">
            <CardTitle className="text-base text-primary">3. Nội dung đề xuất</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4">
            <div>
              <Label htmlFor="title">
                Tiêu đề đề xuất * <span className="text-xs text-muted-foreground">(ngắn gọn, rõ ràng)</span>
              </Label>
              <Input
                id="title"
                className="mt-1.5"
                maxLength={200}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ví dụ: Máy tính phòng họp A không kết nối được mạng nội bộ"
              />
              {err("title")}
            </div>
            <div>
              <Label htmlFor="description">Mô tả chi tiết nội dung *</Label>
              <Textarea
                id="description"
                className="mt-1.5 min-h-28"
                maxLength={5000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Mô tả hiện tượng, thời điểm phát hiện, các bước đã thử... để kỹ thuật viên dễ xử lý"
              />
              {err("description")}
            </div>
            <div>
              <Label htmlFor="legalBasis">Căn cứ pháp lý (tùy chọn)</Label>
              <Textarea
                id="legalBasis"
                className="mt-1.5 min-h-16"
                maxLength={2000}
                value={form.legalBasis}
                onChange={(e) => set("legalBasis", e.target.value)}
                placeholder="Văn bản, chỉ thị, kế hoạch... làm căn cứ cho đề xuất (nếu có)"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Mức độ khẩn cấp *</Label>
                <RadioGroup
                  className="mt-2 flex gap-3"
                  value={form.urgency}
                  onValueChange={(v) => set("urgency", v)}
                >
                  {URGENCY_LEVELS.map((u) => (
                    <div key={u} className="flex items-center gap-1.5">
                      <RadioGroupItem value={u} id={`urgency-${u}`} />
                      <Label htmlFor={`urgency-${u}`} className="cursor-pointer font-normal">
                        {u}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {err("urgency")}
              </div>
              <div>
                <Label htmlFor="desiredDeadline">Thời hạn mong muốn (tùy chọn)</Label>
                <Input
                  id="desiredDeadline"
                  type="datetime-local"
                  className="mt-1.5"
                  value={form.desiredDeadline}
                  onChange={(e) => set("desiredDeadline", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="location">Địa điểm thực hiện (tùy chọn)</Label>
                <Input
                  id="location"
                  className="mt-1.5"
                  maxLength={300}
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Ví dụ: Phòng 205, tầng 2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Tệp đính kèm & ghi chú */}
        <Card className="mb-6">
          <CardHeader className="border-b border-border/70 py-3.5">
            <CardTitle className="text-base text-primary">4. Tệp đính kèm & ghi chú</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Label>
              Tệp đính kèm (tùy chọn — tối đa {MAX_ATTACHMENTS} tệp, mỗi tệp ≤ 10MB; cho phép ảnh, PDF, Word, Excel)
            </Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => addFiles(e.target.files)}
                aria-label="Chọn tệp đính kèm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Paperclip className="h-4 w-4" /> Chọn tệp
              </Button>
            </div>
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between rounded-sm border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {f.name} <span className="text-muted-foreground">({formatBytes(f.size)})</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => setFiles((list) => list.filter((_, idx) => idx !== i))}
                      aria-label={`Xóa tệp ${f.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {err("attachments")}
            <div className="mt-4">
              <Label htmlFor="notes">Ghi chú thêm (tùy chọn)</Label>
              <Textarea
                id="notes"
                className="mt-1.5 min-h-16"
                maxLength={2000}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse items-center justify-end gap-3 border-t border-border pt-5 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            size="lg"
            className="h-11 min-w-52 bg-agency font-semibold hover:bg-agency-dark"
            disabled={submitting}
          >
            {submitting ? (
              "Đang gửi..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Gửi đề xuất
              </>
            )}
          </Button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <FilePlus2 className="h-3.5 w-3.5" />
          Sau khi gửi, hệ thống sẽ sinh mã nhiệm vụ và thông báo tới Bộ phận Kỹ thuật cùng Quản trị viên.
        </p>
      </form>
    </div>
  );
}
