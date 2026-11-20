import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { jsonError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminToken(request);
    if (!auth.ok) {
      return auth.response;
    }

    return NextResponse.json(
      {
        ok: true,
        admin_uid: auth.user.uid,
        servidor_ahora: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch {
    return jsonError("Error interno", 500);
  }
}
