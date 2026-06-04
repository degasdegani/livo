// src/app/api/env-test/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    googleId: !!process.env.GOOGLE_CLIENT_ID,
    googleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    authSecret: !!process.env.AUTH_SECRET,
    database: !!process.env.DATABASE_URL,
  });
}
