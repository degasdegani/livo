import Google from "next-auth/providers/google";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const provider = Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    });

    return NextResponse.json({
      success: true,
      id: provider.id,
      name: provider.name,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    });
  }
}
