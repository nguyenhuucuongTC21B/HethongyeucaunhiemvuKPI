import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionFromRequest } from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  await clearSessionCookie();
  if (session) {
    await writeAudit({
      actorId: session.sub,
      actorName: session.name,
      action: "logout",
      entityType: "auth",
      ip: clientIp(req),
    });
  }
  return NextResponse.json({ ok: true });
}
