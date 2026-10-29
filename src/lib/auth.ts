/**
 * Xác thực & phiên đăng nhập
 * - JWT HS256 (jose) trong cookie httpOnly
 * - Mật khẩu băm bcryptjs
 * - Giới hạn đăng nhập sai: 6 lần / 15 phút → khóa tạm (lưu vào dữ liệu người dùng)
 */
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { User } from "@/lib/storage";
import { getUsers } from "@/lib/storage";
import { LOGIN_LOCK_MINUTES, MAX_LOGIN_ATTEMPTS, ROLES } from "@/lib/constants";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "z-dev-secret-quanly-nhiemvu-kpi-change-me-in-production"
);

export const SESSION_COOKIE = "qlnv_session";
const SESSION_HOURS = 12;

export interface SessionPayload {
  sub: string;
  username: string;
  name: string;
  role: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_HOURS * 3600)
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      sub: String(payload.sub ?? payload.uid ?? ""),
      username: String(payload.username ?? ""),
      name: String(payload.name ?? ""),
      role: String(payload.role ?? ""),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionFromRequest(
  req: Request
): Promise<SessionPayload | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  return verifySessionToken(token);
}

/** Lấy user đầy đủ từ phiên hiện tại (server component / route handler) */
export async function getCurrentUser(req?: Request): Promise<User | null> {
  let payload: SessionPayload | null = null;
  if (req) {
    payload = await getSessionFromRequest(req);
  } else {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) payload = await verifySessionToken(token);
  }
  if (!payload?.sub) return null;
  const users = await getUsers();
  const user = users.find((u) => u.id === payload!.sub);
  if (!user || user.status !== "active") return null;
  return user;
}

/* ------------------------- Mật khẩu & khóa tài khoản ------------------------- */

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw))
    return "Mật khẩu phải chứa cả chữ cái và chữ số";
  return null;
}

export interface LoginAttemptResult {
  locked: boolean;
  remainingAttempts: number;
  lockMinutesLeft: number;
}

export function registerFailedLogin(user: User): LoginAttemptResult {
  const now = Date.now();
  const lockUntil = user.lockUntil ? new Date(user.lockUntil).getTime() : 0;
  if (lockUntil > now) {
    return {
      locked: true,
      remainingAttempts: 0,
      lockMinutesLeft: Math.ceil((lockUntil - now) / 60000),
    };
  }
  const attempts = (user.failedAttempts ?? 0) + 1;
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const until = new Date(now + LOGIN_LOCK_MINUTES * 60000);
    user.failedAttempts = 0;
    user.lockUntil = until.toISOString();
    return {
      locked: true,
      remainingAttempts: 0,
      lockMinutesLeft: LOGIN_LOCK_MINUTES,
    };
  }
  user.failedAttempts = attempts;
  return {
    locked: false,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts,
    lockMinutesLeft: 0,
  };
}

export function isUserLocked(user: User): boolean {
  return Boolean(
    user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()
  );
}

export function hasRole(user: User | null, ...roles: string[]): boolean {
  return Boolean(user && roles.includes(user.role));
}

export const isTechnician = (u: User | null) =>
  u?.role === ROLES.TECHNICIAN || u?.role === ROLES.ADMIN;
