import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Landmark, Newspaper, User } from "lucide-react";
import { getPosts } from "@/lib/storage";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = (await getPosts()).find((p) => p.id === id && p.published);
  if (!post) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Trang chủ
        </Link>{" "}
        /{" "}
        <Link href="/tin-tuc" className="hover:text-primary">
          Tin tức
        </Link>{" "}
        / <span className="text-foreground">{post.title}</span>
      </nav>

      <article className="mt-4 rounded-md border border-border bg-card p-6 shadow-sm sm:p-9">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-agency">
          <Newspaper className="h-3.5 w-3.5" aria-hidden />
          {post.category || "Thông báo"}
        </p>
        <h1 className="mt-2 font-serif text-2xl font-bold leading-snug text-foreground sm:text-3xl">
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-4 text-xs text-muted-foreground">
          <span>Đăng lúc: {formatDateTime(post.createdAt)}</span>
          {post.authorName && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" aria-hidden /> {post.authorName}
            </span>
          )}
        </div>

        {post.coverMediaId && (
          <div className="mt-5 overflow-hidden rounded-md border border-border">
            { }
            <img
              src={`/api/media/${post.coverMediaId}`}
              alt={post.title}
              className="max-h-[480px] w-full object-cover"
            />
          </div>
        )}

        {post.summary && (
          <p className="mt-5 border-l-4 border-agency bg-accent/40 p-4 text-sm italic leading-relaxed text-foreground/85">
            {post.summary}
          </p>
        )}

        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
          {post.content}
        </div>
      </article>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href="/tin-tuc"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Về danh sách tin tức
        </Link>
        <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Landmark className="h-3.5 w-3.5" aria-hidden /> Cổng thông tin nội bộ
        </p>
      </div>
    </div>
  );
}
