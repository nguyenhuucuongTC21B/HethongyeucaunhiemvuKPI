import Link from "next/link";
import { ExternalLink, PackageOpen } from "lucide-react";
import { getSoftware } from "@/lib/storage";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Phần mềm chuyên ngành" };

export default async function SoftwarePage() {
  const list = (await getSoftware()).filter((s) => s.published);
  const byCategory = new Map<string, typeof list>();
  for (const s of list) {
    const key = s.category || "Phần mềm khác";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(s);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Trang chủ
        </Link>{" "}
        / <span className="text-foreground">Phần mềm chuyên ngành</span>
      </nav>
      <h1 className="mt-3 flex items-center gap-2 font-serif text-2xl font-bold text-primary">
        <PackageOpen className="h-6 w-6 text-agency" aria-hidden />
        Phần mềm chuyên ngành
      </h1>
      <div className="mt-2 h-1 w-16 rounded bg-agency" aria-hidden />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Danh mục phần mềm, tiện ích chuyên ngành phục vụ công việc. Bấm vào từng phần mềm để mở
        liên kết tải về hoặc trang truy cập chính thức.
      </p>

      {list.length === 0 ? (
        <p className="mt-10 rounded-md border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Chưa có phần mềm nào được đăng.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {[...byCategory.entries()].map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-3 border-l-4 border-agency pl-3 font-serif text-lg font-bold text-primary">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col rounded-md border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-serif text-base font-bold text-foreground group-hover:text-primary">
                        {s.name}
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-secondary text-primary transition-colors group-hover:bg-agency group-hover:text-white">
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                    {s.description && (
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    <p className="mt-3 truncate text-[11px] text-muted-foreground/70">
                      Nguồn: {s.url}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      Cập nhật: {formatDateTime(s.updatedAt)}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
