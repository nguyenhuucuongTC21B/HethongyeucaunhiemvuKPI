"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  EyeOff,
  Newspaper,
  Pencil,
  Pin,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/client";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/client";
import { cn } from "@/lib/utils";

type ContentType = "posts" | "videos" | "software";

interface PostItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category?: string;
  coverMediaId?: string | null;
  pinned?: boolean;
  published: boolean;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}
interface VideoItem {
  id: string;
  title: string;
  description?: string;
  youtubeUrl: string;
  published: boolean;
  createdAt: string;
}
interface SoftwareItem {
  id: string;
  name: string;
  description?: string;
  url: string;
  category?: string;
  published: boolean;
  createdAt: string;
}

const emptyPost = { title: "", summary: "", content: "", category: "", coverMediaId: null as string | null, pinned: false, published: true };
const emptyVideo = { title: "", description: "", youtubeUrl: "", published: true };
const emptySoftware = { name: "", description: "", url: "", category: "", published: true };

export default function AdminContentPage() {
  const router = useRouter();
  const { user: me, loading: sessionLoading } = useSession();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [software, setSoftware] = useState<SoftwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // dialogs
  const [postDialog, setPostDialog] = useState<null | { mode: "create" | "edit"; id?: string; data: typeof emptyPost }>(null);
  const [videoDialog, setVideoDialog] = useState<null | { mode: "create" | "edit"; id?: string; data: typeof emptyVideo }>(null);
  const [swDialog, setSwDialog] = useState<null | { mode: "create" | "edit"; id?: string; data: typeof emptySoftware }>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, v, s] = await Promise.all([
        api<{ items: PostItem[] }>("/api/content?type=posts&all=1"),
        api<{ items: VideoItem[] }>("/api/content?type=videos&all=1"),
        api<{ items: SoftwareItem[] }>("/api/content?type=software&all=1"),
      ]);
      setPosts(p.items);
      setVideos(v.items);
      setSoftware(s.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được nội dung");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading && me?.role !== "admin") router.push("/");
  }, [me, sessionLoading, router]);

  useEffect(() => {
    if (me?.role === "admin") void load();
  }, [me, load]);

  /* ------------------------- Hành động ------------------------- */

  const savePost = async () => {
    if (!postDialog) return;
    setBusy(true);
    setError("");
    try {
      if (postDialog.mode === "create") {
        await api("/api/content", { method: "POST", json: { type: "posts", data: postDialog.data } });
      } else {
        await api("/api/content", { method: "PUT", json: { type: "posts", id: postDialog.id, data: postDialog.data } });
      }
      setPostDialog(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được tin bài");
    } finally {
      setBusy(false);
    }
  };

  const saveVideo = async () => {
    if (!videoDialog) return;
    setBusy(true);
    setError("");
    try {
      if (videoDialog.mode === "create") {
        await api("/api/content", { method: "POST", json: { type: "videos", data: videoDialog.data } });
      } else {
        await api("/api/content", { method: "PUT", json: { type: "videos", id: videoDialog.id, data: videoDialog.data } });
      }
      setVideoDialog(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được video");
    } finally {
      setBusy(false);
    }
  };

  const saveSoftware = async () => {
    if (!swDialog) return;
    setBusy(true);
    setError("");
    try {
      if (swDialog.mode === "create") {
        await api("/api/content", { method: "POST", json: { type: "software", data: swDialog.data } });
      } else {
        await api("/api/content", { method: "PUT", json: { type: "software", id: swDialog.id, data: swDialog.data } });
      }
      setSwDialog(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được phần mềm");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (type: ContentType, id: string) => {
    if (!window.confirm("Xác nhận xóa nội dung này? Hành động không thể hoàn tác.")) return;
    setError("");
    try {
      await api(`/api/content?type=${type}&id=${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được nội dung");
    }
  };

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api<{ media: { id: string } }>("/api/media", { method: "POST", form });
      setPostDialog((d) => (d ? { ...d, data: { ...d.data, coverMediaId: res.media.id } } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được ảnh bìa");
    } finally {
      setUploadingCover(false);
    }
  };

  /* ------------------------- Giao diện ------------------------- */

  if (sessionLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý nội dung công khai"
        description="Đăng tin bài, video hướng dẫn và danh mục phần mềm chuyên ngành hiển thị trên trang chủ."
        breadcrumbs={[{ label: "Quản trị", href: "/admin/kpi" }, { label: "Nội dung" }]}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts" className="gap-1.5">
            <Newspaper className="h-4 w-4" /> Tin bài ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-1.5">
            <PlayCircle className="h-4 w-4" /> Video ({videos.length})
          </TabsTrigger>
          <TabsTrigger value="software" className="gap-1.5">
            <Download className="h-4 w-4" /> Phần mềm ({software.length})
          </TabsTrigger>
        </TabsList>

        {/* ============ TIN BÀI ============ */}
        <TabsContent value="posts" className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="bg-agency hover:bg-agency-dark"
              onClick={() => setPostDialog({ mode: "create", data: { ...emptyPost } })}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Viết tin bài mới
            </Button>
          </div>
          {posts.length === 0 ? (
            <EmptyHint text="Chưa có tin bài nào. Bấm 'Viết tin bài mới' để đăng thông báo đầu tiên." />
          ) : (
            posts.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="flex min-w-0 gap-3">
                    {p.coverMediaId && (
                       
                      <img
                        src={`/api/media/${p.coverMediaId}`}
                        alt=""
                        className="h-16 w-24 shrink-0 rounded-sm border border-border object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {p.pinned && <Pin className="mr-1 inline h-3.5 w-3.5 text-agency" />}
                        {p.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.category || "Thông báo"} · {formatDateTime(p.createdAt)} · {p.authorName || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={p.published ? "default" : "secondary"}>
                      {p.published ? "Đăng công khai" : "Bản nháp"}
                    </Badge>
                    <Button variant="ghost" size="icon" title={p.published ? "Chuyển thành nháp" : "Đăng công khai"}
                      onClick={() => api("/api/content", { method: "PUT", json: { type: "posts", id: p.id, data: { published: !p.published } } }).then(load)}
                    >
                      {p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" title="Sửa"
                      onClick={() => setPostDialog({ mode: "edit", id: p.id, data: { title: p.title, summary: p.summary, content: p.content, category: p.category ?? "", coverMediaId: p.coverMediaId ?? null, pinned: Boolean(p.pinned), published: p.published } })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" title="Xóa" onClick={() => removeItem("posts", p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ============ VIDEO ============ */}
        <TabsContent value="videos" className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="bg-agency hover:bg-agency-dark"
              onClick={() => setVideoDialog({ mode: "create", data: { ...emptyVideo } })}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Đăng video
            </Button>
          </div>
          {videos.length === 0 ? (
            <EmptyHint text="Chưa có video nào. Dán link YouTube để đăng video hướng dẫn." />
          ) : (
            videos.map((v) => (
              <Card key={v.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{v.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {v.youtubeUrl} · {formatDateTime(v.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={v.published ? "default" : "secondary"}>
                      {v.published ? "Công khai" : "Ẩn"}
                    </Badge>
                    <Button variant="ghost" size="icon" title={v.published ? "Ẩn" : "Công khai"}
                      onClick={() => api("/api/content", { method: "PUT", json: { type: "videos", id: v.id, data: { published: !v.published } } }).then(load)}
                    >
                      {v.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" title="Sửa"
                      onClick={() => setVideoDialog({ mode: "edit", id: v.id, data: { title: v.title, description: v.description ?? "", youtubeUrl: v.youtubeUrl, published: v.published } })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" title="Xóa" onClick={() => removeItem("videos", v.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ============ PHẦN MỀM ============ */}
        <TabsContent value="software" className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="bg-agency hover:bg-agency-dark"
              onClick={() => setSwDialog({ mode: "create", data: { ...emptySoftware } })}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Thêm phần mềm
            </Button>
          </div>
          {software.length === 0 ? (
            <EmptyHint text="Chưa có phần mềm nào. Thêm link phần mềm chuyên ngành để cán bộ tải về." />
          ) : (
            software.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {s.name}
                      {s.category && (
                        <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                          {s.category}
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {s.url} · {formatDateTime(s.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={s.published ? "default" : "secondary"}>
                      {s.published ? "Công khai" : "Ẩn"}
                    </Badge>
                    <Button variant="ghost" size="icon" title={s.published ? "Ẩn" : "Công khai"}
                      onClick={() => api("/api/content", { method: "PUT", json: { type: "software", id: s.id, data: { published: !s.published } } }).then(load)}
                    >
                      {s.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" title="Sửa"
                      onClick={() => setSwDialog({ mode: "edit", id: s.id, data: { name: s.name, description: s.description ?? "", url: s.url, category: s.category ?? "", published: s.published } })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" title="Xóa" onClick={() => removeItem("software", s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ============ Dialog tin bài ============ */}
      <Dialog open={Boolean(postDialog)} onOpenChange={(o) => !o && setPostDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{postDialog?.mode === "edit" ? "Sửa tin bài" : "Viết tin bài mới"}</DialogTitle>
            <DialogDescription>
              Nội dung hiển thị công khai tại mục Tin tức trên trang chủ.
            </DialogDescription>
          </DialogHeader>
          {postDialog && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tiêu đề <span className="text-agency">*</span></Label>
                <Input
                  value={postDialog.data.title}
                  onChange={(e) => setPostDialog({ ...postDialog, data: { ...postDialog.data, title: e.target.value } })}
                  placeholder="Ví dụ: Thông báo bảo trì hệ thống mạng cuối tuần"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Chuyên mục</Label>
                  <Input
                    value={postDialog.data.category}
                    onChange={(e) => setPostDialog({ ...postDialog, data: { ...postDialog.data, category: e.target.value } })}
                    placeholder="Thông báo / Quy định / Tin hoạt động..."
                  />
                </div>
                <div className="flex items-center gap-6 pt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={postDialog.data.pinned}
                      onCheckedChange={(v) => setPostDialog({ ...postDialog, data: { ...postDialog.data, pinned: v } })}
                    />
                    Ghim lên đầu
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={postDialog.data.published}
                      onCheckedChange={(v) => setPostDialog({ ...postDialog, data: { ...postDialog.data, published: v } })}
                    />
                    Công khai
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tóm tắt ngắn</Label>
                <Textarea
                  rows={2}
                  value={postDialog.data.summary}
                  onChange={(e) => setPostDialog({ ...postDialog, data: { ...postDialog.data, summary: e.target.value } })}
                  placeholder="1–2 câu tóm tắt hiển thị ở thẻ tin"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nội dung chi tiết <span className="text-agency">*</span></Label>
                <Textarea
                  rows={10}
                  value={postDialog.data.content}
                  onChange={(e) => setPostDialog({ ...postDialog, data: { ...postDialog.data, content: e.target.value } })}
                  placeholder="Soạn nội dung tin bài. Xuống dòng để tạo đoạn văn mới."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ảnh bìa (tùy chọn)</Label>
                <div className="flex items-center gap-3">
                  {postDialog.data.coverMediaId && (
                     
                    <img
                      src={`/api/media/${postDialog.data.coverMediaId}`}
                      alt="Ảnh bìa"
                      className="h-16 w-28 rounded-sm border border-border object-cover"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="flex-1"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadCover(f);
                    }}
                    disabled={uploadingCover}
                  />
                </div>
                {uploadingCover && <p className="text-xs text-muted-foreground">Đang tải ảnh lên...</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostDialog(null)}>Hủy</Button>
            <Button className="bg-agency hover:bg-agency-dark" onClick={savePost} disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu tin bài"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog video ============ */}
      <Dialog open={Boolean(videoDialog)} onOpenChange={(o) => !o && setVideoDialog(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{videoDialog?.mode === "edit" ? "Sửa video" : "Đăng video YouTube"}</DialogTitle>
            <DialogDescription>Dán link video YouTube (watch, youtu.be hoặc shorts).</DialogDescription>
          </DialogHeader>
          {videoDialog && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tiêu đề <span className="text-agency">*</span></Label>
                <Input
                  value={videoDialog.data.title}
                  onChange={(e) => setVideoDialog({ ...videoDialog, data: { ...videoDialog.data, title: e.target.value } })}
                  placeholder="Ví dụ: Hướng dẫn ký số văn bản điện tử"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Link YouTube <span className="text-agency">*</span></Label>
                <Input
                  value={videoDialog.data.youtubeUrl}
                  onChange={(e) => setVideoDialog({ ...videoDialog, data: { ...videoDialog.data, youtubeUrl: e.target.value.trim() } })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mô tả</Label>
                <Textarea
                  rows={3}
                  value={videoDialog.data.description}
                  onChange={(e) => setVideoDialog({ ...videoDialog, data: { ...videoDialog.data, description: e.target.value } })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={videoDialog.data.published}
                  onCheckedChange={(v) => setVideoDialog({ ...videoDialog, data: { ...videoDialog.data, published: v } })}
                />
                Công khai video
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialog(null)}>Hủy</Button>
            <Button className="bg-agency hover:bg-agency-dark" onClick={saveVideo} disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog phần mềm ============ */}
      <Dialog open={Boolean(swDialog)} onOpenChange={(o) => !o && setSwDialog(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{swDialog?.mode === "edit" ? "Sửa phần mềm" : "Thêm phần mềm chuyên ngành"}</DialogTitle>
            <DialogDescription>Link tải về hoặc trang truy cập chính thức.</DialogDescription>
          </DialogHeader>
          {swDialog && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tên phần mềm <span className="text-agency">*</span></Label>
                <Input
                  value={swDialog.data.name}
                  onChange={(e) => setSwDialog({ ...swDialog, data: { ...swDialog.data, name: e.target.value } })}
                  placeholder="Ví dụ: Phần mềm ký số VNeID"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nhóm</Label>
                  <Input
                    value={swDialog.data.category}
                    onChange={(e) => setSwDialog({ ...swDialog, data: { ...swDialog.data, category: e.target.value } })}
                    placeholder="Ký số / Văn phòng / Tra cứu..."
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={swDialog.data.published}
                    onCheckedChange={(v) => setSwDialog({ ...swDialog, data: { ...swDialog.data, published: v } })}
                  />
                  <span className="text-sm">Công khai</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Link tải / truy cập <span className="text-agency">*</span></Label>
                <Input
                  value={swDialog.data.url}
                  onChange={(e) => setSwDialog({ ...swDialog, data: { ...swDialog.data, url: e.target.value.trim() } })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mô tả</Label>
                <Textarea
                  rows={3}
                  value={swDialog.data.description}
                  onChange={(e) => setSwDialog({ ...swDialog, data: { ...swDialog.data, description: e.target.value } })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwDialog(null)}>Hủy</Button>
            <Button className="bg-agency hover:bg-agency-dark" onClick={saveSoftware} disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu phần mềm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground"
      )}
    >
      {text}
    </div>
  );
}
