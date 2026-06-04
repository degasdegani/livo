import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    googleClientId: !!process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    authSecret: !!process.env.AUTH_SECRET,
    authUrl: process.env.AUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
  });
}
