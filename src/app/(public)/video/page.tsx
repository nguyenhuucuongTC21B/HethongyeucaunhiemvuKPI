import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { getVideos } from "@/lib/storage";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Video hướng dẫn" };

function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.pathname.startsWith("/watch")) id = u.searchParams.get("v") ?? "";
    else {
      const m = u.pathname.match(/\/(embed|shorts|live)\/([^/]+)/);
      if (m) id = m[2];
    }
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
  } catch {
    return null;
  }
}

export default async function VideoPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  const videos = await getVideos();
  const list = videos.filter((x) => x.published);
  const featured = v ? list.find((x) => x.id === v) ?? list[0] : list[0];
  const src = featured ? embedUrl(featured.youtubeUrl) : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Trang chủ
        </Link>{" "}
        / <span className="text-foreground">Video hướng dẫn</span>
      </nav>
      <h1 className="mt-3 flex items-center gap-2 font-serif text-2xl font-bold text-primary">
        <PlayCircle className="h-6 w-6 text-agency" aria-hidden />
        Video hướng dẫn sử dụng
      </h1>
      <div className="mt-2 h-1 w-16 rounded bg-agency" aria-hidden />

      {list.length === 0 ? (
        <p className="mt-10 rounded-md border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Chưa có video nào được đăng.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Video chính */}
          <div>
            <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-black shadow-md">
              {src ? (
                <iframe
                  src={src}
                  title={featured.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/60">
                  Link video không hợp lệ
                </div>
              )}
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-foreground">{featured.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Đăng lúc {formatDateTime(featured.createdAt)}
            </p>
            {featured.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                {featured.description}
              </p>
            )}
          </div>

          {/* Danh sách video khác */}
          <aside>
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
              Các video khác
            </p>
            <div className="space-y-3">
              {list
                .filter((x) => x.id !== featured.id)
                .map((x) => (
                  <Link
                    key={x.id}
                    href={`/video?v=${x.id}`}
                    className="flex gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-accent"
                  >
                    <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-sm bg-secondary">
                      <PlayCircle className="h-7 w-7 text-primary" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-sm font-semibold text-foreground">
                        {x.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {formatDateTime(x.createdAt)}
                      </span>
                    </span>
                  </Link>
                ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
