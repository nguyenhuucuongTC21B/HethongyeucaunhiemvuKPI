import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Download,
  FilePlus2,
  Gauge,
  Landmark,
  Newspaper,
  PlayCircle,
  ScrollText,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { getPosts, getSettings, getSoftware, getTasks, getVideos } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function youtubeThumb(url: string): string {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.pathname.startsWith("/watch")) id = u.searchParams.get("v") ?? "";
    else {
      const m = u.pathname.match(/\/(embed|shorts|live)\/([^/]+)/);
      if (m) id = m[2];
    }
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
  } catch {
    return "";
  }
}

export default async function HomePage() {
  const settings = await getSettings();
  const [posts, videos, software, tasks] = await Promise.all([
    getPosts(),
    getVideos(),
    getSoftware(),
    getTasks().catch(() => []),
  ]);

  const publishedPosts = posts.filter((p) => p.published);
  const publishedVideos = videos.filter((v) => v.published);
  const publishedSoftware = software.filter((s) => s.published);

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "Hoàn thành").length,
    active: tasks.filter((t) => ["Đã tiếp nhận", "Đang xử lý", "Tạm hoãn"].includes(t.status)).length,
  };

  const heroTitle = settings.heroTitle || settings.siteSubtitle;
  const heroSubtitle =
    settings.heroSubtitle ||
    "Tiếp nhận, phân công và theo dõi tiến độ các đề xuất nhiệm vụ kỹ thuật trong toàn Viện.";

  return (
    <div className="flex flex-col">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-[linear-gradient(150deg,var(--primary)_0%,color-mix(in_srgb,var(--primary)_80%,#000000)_100%)] text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #ffffff 0 2px, transparent 2px 14px)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-[0.08]"
          style={{ backgroundImage: "url(/logo-nganh.png)", backgroundSize: "contain", backgroundRepeat: "no-repeat" }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 border border-white/25 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em]">
              <Landmark className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              Cổng thông tin nội bộ — {settings.siteTitle}
            </p>
            <h1 className="max-w-3xl font-serif text-2xl font-bold leading-snug sm:text-4xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 bg-agency px-7 text-base font-semibold hover:bg-agency-dark"
              >
                <Link href="/login?next=/proposal">
                  <FilePlus2 className="mr-2 h-5 w-5" /> Gửi đề xuất nhiệm vụ
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/40 bg-white/5 px-7 text-base font-semibold text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/login">
                  <ShieldCheck className="mr-2 h-5 w-5" /> Đăng nhập hệ thống
                </Link>
              </Button>
              {settings.allowRegistration !== false && (
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="h-12 px-6 text-base font-semibold text-amber-300 hover:bg-white/10 hover:text-amber-200"
                >
                  <Link href="/register">
                    Đăng ký tài khoản <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Bảng số liệu nổi */}
          <div className="relative grid grid-cols-2 gap-3">
            {[
              { label: "Nhiệm vụ đã tiếp nhận", value: stats.total, icon: ClipboardCheck },
              { label: "Đã hoàn thành", value: stats.done, icon: Gauge },
              { label: "Đang xử lý", value: stats.active, icon: Wrench },
              { label: "Phần mềm chuyên ngành", value: publishedSoftware.length, icon: Download },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-md border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                <s.icon className="h-5 w-5 text-amber-300" aria-hidden />
                <p className="mt-2 font-serif text-3xl font-bold">{s.value}</p>
                <p className="mt-0.5 text-xs text-primary-foreground/75">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TIN TỨC ============ */}
      {settings.showNews !== false && publishedPosts.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-primary sm:text-2xl">
                <Newspaper className="h-5 w-5 text-agency" aria-hidden />
                Tin tức - Thông báo
              </h2>
              <div className="mt-2 h-1 w-16 rounded bg-agency" aria-hidden />
            </div>
            <Link href="/tin-tuc" className="text-sm font-semibold text-primary hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publishedPosts.slice(0, 3).map((p) => (
              <Link key={p.id} href={`/tin-tuc/${p.id}`} className="group">
                <Card className="h-full overflow-hidden border-border shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                  {p.coverMediaId && (
                    <div className="aspect-video w-full overflow-hidden bg-secondary">
                      { }
                      <img
                        src={`/api/media/${p.coverMediaId}`}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-agency">
                      {p.category || "Thông báo"} · {formatDateTime(p.createdAt)}
                    </p>
                    <h3 className="mt-1.5 line-clamp-2 font-serif text-base font-bold leading-snug text-foreground group-hover:text-primary">
                      {p.pinned ? "📌 " : ""}{p.title}
                    </h3>
                    {p.summary && (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {p.summary}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ QUY TRÌNH ============ */}
      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-xl font-bold text-primary sm:text-2xl">
              Quy trình làm việc
            </h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded bg-agency" aria-hidden />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Cán bộ, công chức gửi đề xuất → Bộ phận Kỹ thuật tiếp nhận và xử lý → Lãnh đạo theo
              dõi thống kê, đánh giá KPI. Mọi thao tác đều được ghi nhật ký, minh bạch và truy xuất
              được nguồn gốc.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: FilePlus2,
                title: "1. Gửi đề xuất",
                desc: "Điền form đề xuất với đầy đủ thông tin: loại nhiệm vụ, phòng ban, mức độ khẩn cấp, tệp đính kèm minh chứng.",
              },
              {
                icon: Wrench,
                title: "2. Tiếp nhận - Xử lý",
                desc: "Kỹ thuật viên tiếp nhận, cập nhật trạng thái từng bước và đính kèm kết quả xử lý. Người gửi nhận thông báo ngay.",
              },
              {
                icon: ClipboardCheck,
                title: "3. Đánh giá",
                desc: "Sau khi hoàn thành, người gửi đánh giá mức độ hài lòng (1–5 sao) kèm nhận xét để phục vụ chấm điểm KPI.",
              },
              {
                icon: Gauge,
                title: "4. Thống kê KPI",
                desc: "Lãnh đạo xem báo cáo KPI: tỷ lệ hoàn thành, thời gian xử lý trung bình, đúng hạn, điểm hài lòng từng kỹ thuật viên.",
              },
            ].map((item) => (
              <Card
                key={item.title}
                className="border-border shadow-sm transition-shadow hover:shadow-md"
              >
                <CardContent className="p-5">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-secondary text-primary">
                    <item.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="font-serif text-base font-bold text-primary">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ VIDEO ============ */}
      {settings.showVideos !== false && publishedVideos.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-primary sm:text-2xl">
                <PlayCircle className="h-5 w-5 text-agency" aria-hidden />
                Video hướng dẫn
              </h2>
              <div className="mt-2 h-1 w-16 rounded bg-agency" aria-hidden />
            </div>
            <Link href="/video" className="text-sm font-semibold text-primary hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publishedVideos.slice(0, 3).map((v) => (
              <Link
                key={v.id}
                href={`/video?v=${v.id}`}
                className="group overflow-hidden rounded-md border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-secondary">
                  {youtubeThumb(v.youtubeUrl) && (
                     
                    <img
                      src={youtubeThumb(v.youtubeUrl)}
                      alt={v.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" aria-hidden />
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 font-serif text-base font-bold text-foreground group-hover:text-primary">
                    {v.title}
                  </h3>
                  {v.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{v.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ PHẦN MỀM CHUYÊN NGÀNH ============ */}
      {settings.showSoftware !== false && publishedSoftware.length > 0 && (
        <section className="border-t border-border bg-secondary/50">
          <div className="mx-auto w-full max-w-7xl px-4 py-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-primary sm:text-2xl">
                  <Download className="h-5 w-5 text-agency" aria-hidden />
                  Phần mềm chuyên ngành
                </h2>
                <div className="mt-2 h-1 w-16 rounded bg-agency" aria-hidden />
              </div>
              <Link href="/phan-mem" className="text-sm font-semibold text-primary hover:underline">
                Xem tất cả →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publishedSoftware.slice(0, 6).map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-md border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-secondary text-primary">
                    <Download className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground group-hover:text-primary">
                      {s.name}
                    </span>
                    {s.description && (
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                        {s.description}
                      </span>
                    )}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ CAM KẾT ============ */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="grid gap-5 rounded-md border border-border bg-card p-6 sm:grid-cols-3 sm:p-8">
          {[
            {
              icon: ScrollText,
              title: "Nhật ký kiểm toán",
              desc: "Mọi thao tác quan trọng (gửi đề xuất, phân công, đổi trạng thái, sửa/xóa dữ liệu) đều được ghi lại kèm người thực hiện, thời gian và địa chỉ IP.",
            },
            {
              icon: ShieldCheck,
              title: "Bảo mật tài khoản",
              desc: "Mật khẩu được mã hóa (bcrypt). Đăng nhập bằng tên tài khoản hoặc CCCD. Khóa tạm thời sau 6 lần nhập sai liên tiếp.",
            },
            {
              icon: Landmark,
              title: "Lưu trữ lâu dài",
              desc: "Toàn bộ dữ liệu được lưu trữ vĩnh viễn dưới dạng tệp JSON trên Google Drive, không phụ thuộc cơ sở dữ liệu SQL.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-agency" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
