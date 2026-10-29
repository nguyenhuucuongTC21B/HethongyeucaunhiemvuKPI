import Link from "next/link";
import {
  ClipboardCheck,
  FilePlus2,
  Gauge,
  Landmark,
  LogIn,
  ScrollText,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { getSettings } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Dải đầu trang */}
      <div className="border-b-4 border-agency bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-white/10">
              <Landmark className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="font-serif text-sm font-bold sm:text-base">{settings.siteTitle}</p>
              <p className="text-xs text-primary-foreground/80">
                Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="hidden h-9 bg-white text-primary hover:bg-white/90 sm:inline-flex"
          >
            <Link href="/login">
              <LogIn className="mr-1.5 h-4 w-4" /> Đăng nhập hệ thống
            </Link>
          </Button>
        </div>
      </div>

      {/* Banner chính */}
      <section className="relative bg-primary">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #ffffff 0 2px, transparent 2px 14px)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 text-center text-primary-foreground sm:py-20">
          <p className="mx-auto mb-4 inline-block border border-white/30 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em]">
            Cổng thông tin nội bộ — Bộ phận Kỹ thuật
          </p>
          <h1 className="mx-auto max-w-3xl font-serif text-2xl font-bold leading-snug sm:text-4xl">
            {settings.siteSubtitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
            Tiếp nhận, phân công và theo dõi tiến độ các đề xuất nhiệm vụ kỹ thuật của cán bộ, công
            chức trong toàn Viện. Đánh giá KPI khối lượng công việc minh bạch, công bằng theo số
            liệu thực tế.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 w-full bg-agency px-8 text-base font-semibold hover:bg-agency-dark sm:w-auto"
            >
              <Link href="/login?next=/proposal">
                <FilePlus2 className="mr-2 h-5 w-5" /> Gửi đề xuất nhiệm vụ
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full border-white/40 bg-white/5 px-8 text-base font-semibold text-white hover:bg-white/15 hover:text-white sm:w-auto"
            >
              <Link href="/login">
                <ShieldCheck className="mr-2 h-5 w-5" /> Đăng nhập hệ thống
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Giới thiệu 3 vai trò */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-xl font-bold text-primary sm:text-2xl">
            Quy trình làm việc
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded bg-agency" aria-hidden />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Cán bộ, công chức gửi đề xuất → Bộ phận Kỹ thuật tiếp nhận và xử lý → Lãnh đạo theo dõi
            thống kê, đánh giá KPI. Mọi thao tác đều được ghi nhật ký, đảm bảo minh bạch và có nguồn
            gốc truy xuất.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: FilePlus2,
              title: "1. Gửi đề xuất",
              desc: "Cán bộ, công chức điền form đề xuất với đầy đủ thông tin: loại nhiệm vụ, phòng ban, mức độ khẩn cấp, tệp đính kèm minh chứng.",
            },
            {
              icon: Wrench,
              title: "2. Tiếp nhận - Xử lý",
              desc: "Kỹ thuật viên tiếp nhận, cập nhật trạng thái theo từng bước và đính kèm kết quả xử lý. Người gửi nhận thông báo ngay khi có thay đổi.",
            },
            {
              icon: ClipboardCheck,
              title: "3. Đánh giá",
              desc: "Sau khi hoàn thành, người gửi đánh giá mức độ hài lòng (1–5 sao) kèm nhận xét để phục vụ chấm điểm KPI.",
            },
            {
              icon: Gauge,
              title: "4. Thống kê KPI",
              desc: "Lãnh đạo xem báo cáo KPI: tỷ lệ hoàn thành, thời gian xử lý trung bình, tỷ lệ đúng hạn, điểm hài lòng của từng kỹ thuật viên.",
            },
          ].map((item) => (
            <Card key={item.title} className="border-border shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-secondary text-primary">
                  <item.icon className="h-6 w-6" aria-hidden />
                </span>
                <CardTitle className="text-base text-primary">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 grid gap-5 rounded-md border border-border bg-card p-6 sm:grid-cols-3 sm:p-8">
          <div className="flex items-start gap-3">
            <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-agency" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">Nhật ký kiểm toán</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Mọi thao tác quan trọng (gửi đề xuất, phân công, đổi trạng thái, sửa/xóa dữ liệu) đều
                được ghi lại kèm người thực hiện, thời gian và địa chỉ IP.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-agency" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">Bảo mật tài khoản</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Mật khẩu được mã hóa (bcrypt). Đăng nhập bằng tên tài khoản hoặc CCCD. Khóa tạm thời
                sau 6 lần nhập sai liên tiếp.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-agency" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">Lưu trữ lâu dài</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Toàn bộ dữ liệu được lưu trữ vĩnh viễn dưới dạng tệp JSON trên Google Drive, không
                phụ thuộc cơ sở dữ liệu SQL.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
