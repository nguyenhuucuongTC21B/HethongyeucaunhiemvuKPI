import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { mailRecipientsEnabled, isMailConfigured } from "@/lib/audit";
import { storageMode } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      title: user.title,
      email: user.email,
      phone: user.phone,
      mustChangePassword: Boolean(user.mustChangePassword),
    },
    system: {
      storageMode: storageMode(),
      mailConfigured: isMailConfigured(),
      mailEnabled: mailRecipientsEnabled(),
    },
  });
}
