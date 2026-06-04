import { signIn } from "@/auth";

export async function GET() {
  try {
    const result = await signIn("google");
    return Response.json({
      success: true,
      result,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "erro desconhecido",
      stack: error instanceof Error ? error.stack : null,
    });
  }
}
