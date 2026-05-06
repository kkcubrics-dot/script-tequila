import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

export type ApiError = { code: string; message: string };

export function ok<T>(data: T, requestId?: string) {
  return NextResponse.json({ data, error: null, requestId: requestId || randomUUID() });
}

export function fail(code: string, message: string, status = 500, requestId?: string) {
  return NextResponse.json(
    { data: null, error: { code, message } as ApiError, requestId: requestId || randomUUID() },
    { status }
  );
}
