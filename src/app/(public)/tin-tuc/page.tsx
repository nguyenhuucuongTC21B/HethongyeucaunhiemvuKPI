import Link from "next/link";
import { Newspaper } from "lucide-react";
import { getPosts } from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tin tức - Thông báo" };

export default async function NewsPage() {
  const posts = (await getPosts()).filter((p) => p.published);
  const pinned = posts.filter((p) => p.pinned);
  const rest = posts.filter((p) => !p.pinned);
  const list = [...pinned, ...rest];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Trang chủ
        </Link>{" "}
        / <span className="text-foreground">Tin tức - Thông báo</span>
      </nav>
      <h1 className="mt-3 flex items-center gap-2 font-serif text-2xl font-bold text-primary">
        <Newspaper className="h-6 w-6 text-agency" aria-hidden />
        Tin tức - Thông báo
      </h1>
      <div className="mt-2 h-1 w-16 rounded bg-agency" aria-hidden />

      {list.length === 0 ? (
        <p className="mt-10 rounded-md border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Chưa có tin tức, thông báo nào được đăng.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
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
                  <h2 className="mt-1.5 line-clamp-2 font-serif text-base font-bold leading-snug text-foreground group-hover:text-primary">
                    {p.pinned ? "📌 " : ""}
                    {p.title}
                  </h2>
                  {p.summary && (
                    <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {p.summary}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
