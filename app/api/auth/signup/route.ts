import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getSupabaseAuthClientForApi } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() || "";
    const password = body.password?.trim() || "";

    if (!email || !password) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "email and password are required." } }, { status: 400 });
    }

    const client = getSupabaseAuthClientForApi();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) {
      return NextResponse.json({ error: { code: "AUTH_ERROR", message: error.message } }, { status: 400 });
    }

    const token = data.session?.access_token || "";
    const res = NextResponse.json({ ok: true, user: data.user });
    if (token) {
      res.cookies.set(AUTH_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
      });
    }
    return res;
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid request body." } }, { status: 400 });
  }
}
