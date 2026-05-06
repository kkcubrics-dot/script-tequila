import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminDebugKey } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { key?: string };
    const key = body.key?.trim() || "";

    if (!isValidAdminDebugKey(key)) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid admin key." } }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });
    return res;
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid request." } }, { status: 400 });
  }
}
