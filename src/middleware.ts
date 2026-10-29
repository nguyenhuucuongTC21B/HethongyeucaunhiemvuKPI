import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "z-dev-secret-quanly-nhiemvu-kpi-change-me-in-production"
);

const SESSION_COOKIE = "qlnv_session";

/** Các route yêu cầu đăng nhập */
const PROTECTED_PREFIXES = [
  "/tasks",
  "/proposal",
  "/my-proposals",
  "/kpi",
  "/notifications",
  "/account",
  "/admin",
];

/** Route chỉ dành cho admin */
const ADMIN_PREFIXES = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  let session: { role?: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      session = { role: String(payload.role ?? "") };
    } catch {
      session = null;
    }
  }

  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isAdminRoute = ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (needsAuth && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && session?.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "forbidden");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/tasks/:path*",
    "/proposal",
    "/my-proposals/:path*",
    "/kpi/:path*",
    "/notifications/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};
