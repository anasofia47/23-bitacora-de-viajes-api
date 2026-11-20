import { NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth";
import { jsonError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await verifyBearerToken(request);
    if (!auth.ok) {
      return auth.response;
    }

    return NextResponse.json(
      {
        usuario: {
          id: auth.user.uid,
          email: auth.user.email,
          rol: auth.user.rol,
        },
      },
      { status: 200 }
    );
  } catch {
    return jsonError("Error interno", 500);
  }
}
